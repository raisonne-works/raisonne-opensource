import { getSettings, getStore } from '@/fixtures';
import { getSessionAddress } from '@/lib/auth/guards';
import { checkLimit, retryAfter } from '@/lib/auth/rate-limit';
import { featureStatus, surfaceRequirements, surfaceState } from '@/lib/config';
import { requestOrigin } from '@/lib/request-origin';
import { siteOrigin } from '@/lib/seo/urls';
import { cartWeight, isPayable, priceCart, shippingOptions } from '@/lib/store/cart';
import { CHECKOUT_HONEYPOT_FIELD, parseCheckoutRequest } from '@/lib/store/checkout';
import { buildOrder, uniqueNumber } from '@/lib/store/fulfilment';
import { getOrderStore, newOrderNumber, probeOrderStore } from '@/lib/store/orders';
import { PaymentError, getPaymentProvider } from '@/lib/store/payments';

/**
 * POST /api/checkout  { lines, email, shippingAddress, shippingMethodId?, note? }
 *
 * Turns a cart into an order and hands the buyer to the payment provider.
 *
 * The order of operations is the security of it:
 *
 *  1. The cart is parsed down to slugs, variant ids and quantities. A unit
 *     price in the request body does not survive parseCart, so there is
 *     nothing for a tampered browser to set.
 *  2. The price is computed here, from the install's own fixtures.
 *  3. The order is written before the payment session is created, so a
 *     webhook can never arrive for an order that does not exist. The store
 *     is probed first and a store that cannot be written to answers 503 with
 *     the panel's own words, rather than throwing a 500 at the buyer at the
 *     moment of payment.
 *  4. The provider is given the amount from step 2 and an idempotency key,
 *     so a double-clicked button produces one session, not two.
 *
 * It answers 503, naming the variable, when the install has no payment keys.
 * It never pretends to have taken an order it cannot be paid for.
 */

export const dynamic = 'force-dynamic';

function refuse(error: string, status: number, extra: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
  return Response.json({ error, ...extra }, { status, headers });
}

/**
 * Where the provider sends the buyer back to.
 *
 * The configured site address wins, because that is the public one. On a
 * developer's machine it is usually the live site, and sending someone there
 * after a test payment is a surprise, so a request that arrived on localhost
 * comes back to localhost.
 *
 * Which host it arrived on comes from the Host header, through
 * requestOrigin(), and not from request.url: inside a Route Handler
 * request.url carries the address the server is bound to, so it reads
 * localhost on this machine whatever the browser is on and 0.0.0.0 on a
 * deployment. Reading it here would send a buyer on 127.0.0.1 back to
 * localhost, and would have sent a deployment bound to localhost back to
 * localhost from a real payment.
 */
function returnOrigin(request: Request): string {
  const here = requestOrigin(request);
  if (here?.isLocal) return here.origin;
  return siteOrigin(getSettings());
}

/**
 * Which bucket this checkout counts in when there is no trusted proxy to
 * give us a client address: the signed-in wallet, or the cart itself. A
 * buyer retrying their own basket meets the limit; eleven buyers at a drop
 * do not queue behind each other.
 */
function checkoutIdentity(walletAddress: string | null, body: Record<string, unknown>): string {
  if (walletAddress) return walletAddress;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const lines = JSON.stringify(body.lines ?? []);
  return `${email}|${lines}`;
}

export async function POST(request: Request) {
  // Probed fresh: this is the request that is about to need it.
  await probeOrderStore({ fresh: true });

  const state = surfaceState(getSettings(), 'store');
  if (state === 'off') return refuse('This site has no store.', 404);
  if (state === 'unconfigured') {
    const blocking = surfaceRequirements('store').find(status => !status.configured) ?? featureStatus('payments');
    return refuse('This install cannot take payments yet.', 503, { missing: blocking.missing, detail: blocking.detail });
  }

  const store = getStore();
  if (!store) return refuse('This install has no store data.', 404);

  const provider = getPaymentProvider();
  if (!provider) return refuse('No payment provider is configured.', 503, { missing: featureStatus('payments').missing });

  const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;

  // A guest may order. A signed-in collector's wallet is recorded, so the
  // order appears on their own orders page without them typing anything.
  const walletAddress = await getSessionAddress();

  const limit = checkLimit(request, 'checkout', checkoutIdentity(walletAddress, body));
  if (!limit.ok) {
    return refuse('Too many attempts just now. Try again in a few minutes.', 429, {}, {
      'Retry-After': retryAfter(limit),
    });
  }

  // A filled honeypot is a script. It is told the same thing a person with a
  // broken cart is told, and nothing is written.
  const trap = body[CHECKOUT_HONEYPOT_FIELD];
  if (typeof trap === 'string' && trap.trim() !== '') {
    return refuse('That order could not be placed.', 400);
  }

  const parsed = parseCheckoutRequest(body);
  if (!parsed.ok) return refuse(parsed.message, 400, { errors: parsed.errors });
  const { request: checkout } = parsed;

  // The method has to be one that serves this address with this weight. A
  // browser can send any id; only the ones this install offers are honoured.
  const options = shippingOptions(store, {
    country: checkout.shippingAddress.country,
    weight: cartWeight(store, checkout.lines),
  });
  const method = options.find(entry => entry.id === checkout.shippingMethodId) ?? null;
  if (!method) {
    return refuse('That shipping method does not serve this address.', 400, {
      errors: { shippingMethodId: 'Choose how it should be sent.' },
    });
  }

  const totals = priceCart(store, checkout.lines, { shippingMethodId: method.id });
  if (!isPayable(totals)) {
    return refuse(totals.problems[0] ?? 'This cart cannot be paid for.', 409, { problems: totals.problems, totals });
  }

  const orders = getOrderStore();

  const order = buildOrder({
    store,
    totals,
    request: { ...checkout, shippingMethodId: method.id },
    walletAddress,
    paymentProvider: provider.id,
    number: await uniqueNumber(
      () => newOrderNumber(),
      async candidate => (await orders.getByNumber(candidate)) !== null,
    ),
  });

  const origin = returnOrigin(request);

  try {
    // Inside the try: on a read-only filesystem, or a bad
    // RAISONNE_ORDERS_DIR, this is what throws, and it throws at the moment
    // of payment. It answers 503 with the words the setup panel uses rather
    // than an unhandled 500 with none.
    try {
      await orders.create(order);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'the order store refused the write';
      console.error(`[raisonne] order ${order.number} could not be stored: ${reason}`);
      const status = featureStatus('orders');
      return refuse('This order could not be recorded, so nothing has been charged.', 503, {
        detail: status.detail,
        missing: ['RAISONNE_ORDERS_DIR'],
      });
    }

    const session = await provider.createCheckout({
      order,
      totals,
      // The provider substitutes its own session id, and the completion page
      // reads the order back by it. Nothing personal travels in the URL.
      successUrl: `${origin}/checkout/complete?session={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/checkout?cancelled=1`,
      email: order.email,
      metadata: { orderNumber: order.number },
    });

    await orders.update(order.id, { payment: { reference: session.reference } });

    return Response.json(
      { url: session.url, number: order.number, testMode: provider.testMode },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    // The order stays, unpaid, with the reason on it: an artist looking at a
    // pending order should be able to see that the provider refused rather
    // than wonder whether the buyer changed their mind.
    const detail = error instanceof PaymentError ? error.message : 'the payment provider could not be reached';
    await orders.update(order.id, { status: 'failed', internalNote: `Checkout could not be created: ${detail}` });
    console.error(`[raisonne] order ${order.number}: ${detail}`);
    return refuse('The payment page could not be opened. Nothing has been charged.', 502, { number: order.number });
  }
}
