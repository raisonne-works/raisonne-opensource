import { featureStatus } from '@/lib/config';
import { applyPaymentEvent } from '@/lib/store/fulfilment';
import { getPaymentProvider } from '@/lib/store/payments';

/**
 * POST /api/checkout/webhook
 *
 * Where the payment provider says what happened. This is the endpoint that
 * decides whether an order is paid, so it is the one worth forging, and it
 * is written accordingly:
 *
 *  - The raw body is read before anything parses it. A signature is over the
 *    exact bytes sent; re-serialising JSON changes them and every signature
 *    check then fails.
 *  - Nothing is believed without a signature that verifies against
 *    STRIPE_WEBHOOK_SECRET. With no secret the provider adapter is not
 *    configured at all, and this route answers 503 rather than accepting
 *    anything.
 *  - Once verified, the answer is 200 whatever this install decided to do,
 *    including nothing. A 500 for an event we chose to ignore means the
 *    provider retries it every hour for three days.
 *  - The amount is checked against the order before it is marked paid, and
 *    the order store refuses a status that cannot follow the current one, so
 *    a replayed event moves nothing.
 *
 * Point the provider at https://<your site>/api/checkout/webhook and copy
 * the signing secret into STRIPE_WEBHOOK_SECRET.
 */

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const provider = getPaymentProvider();
  if (!provider) {
    return Response.json(
      { error: 'No payment provider is configured.', missing: featureStatus('payments').missing },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  const event = provider.readWebhook(rawBody, request.headers.get('stripe-signature'));

  if (!event) {
    // Either the signature did not check out or the body was not an event.
    // The reason is deliberately not spelled out to the caller.
    return Response.json({ error: 'That could not be verified.' }, { status: 400 });
  }

  const outcome = await applyPaymentEvent(event);

  if (outcome.order) {
    console.info(`[raisonne] payment ${event.type} for order ${outcome.order.number}: ${outcome.reason}`);
  }

  return Response.json({ received: true, handled: outcome.handled, reason: outcome.reason });
}

/** A provider checking the endpoint exists should not get a 405 page of HTML. */
export function GET() {
  const provider = getPaymentProvider();
  return Response.json({ endpoint: 'payment webhook', provider: provider?.id ?? null, configured: provider !== null });
}
