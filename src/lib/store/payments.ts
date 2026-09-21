import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

import { stripeIsTestMode, stripeSecretKey, stripeWebhookSecret } from '@/lib/config';
import { fromMinor } from '@/lib/money';
import type { CartTotals, Money, Order } from '@/lib/types';

/**
 * Taking a payment, through whichever provider the install has keys for.
 *
 * Stripe is the first adapter because it is the one an artist is most likely
 * to already have. Nothing above this file knows that: a route creates a
 * checkout through the interface, and a second provider is a new file.
 *
 * Three rules the adapter keeps, and the reason each one exists:
 *
 *  1. The amount charged is computed on the server from the fixtures
 *     (priceCart in ./cart). The browser sends slugs and quantities, never
 *     prices, so a edited cart can order the wrong thing but never at the
 *     wrong price.
 *  2. A webhook is only believed once its signature has been verified
 *     against STRIPE_WEBHOOK_SECRET. Without that secret the endpoint
 *     refuses everything, because an unverified webhook is a public button
 *     marked "mark this order paid".
 *  3. Nothing is captured by this install. The card details are entered on
 *     the provider's own page; this install never sees a card number.
 */

export interface CheckoutParams {
  /** The order this is paying for. Created first, so a webhook always has something to update. */
  order: Order;
  totals: CartTotals;
  /** Where the provider sends the buyer afterwards. Absolute URLs. */
  successUrl: string;
  cancelUrl: string;
  /** Passed through, so the webhook can find the order without trusting the URL. */
  metadata?: Record<string, string>;
  /** Prefills the provider's form. Optional. */
  email?: string | null;
}

export interface CheckoutSession {
  /** The provider's id for this attempt. Stored on the order as payment.reference. */
  reference: string;
  /** Where to send the browser. */
  url: string;
}

export type PaymentEventType = 'paid' | 'failed' | 'expired' | 'refunded' | 'ignored';

export interface PaymentEvent {
  type: PaymentEventType;
  /** The checkout session or intent this is about. */
  reference: string | null;
  /**
   * Every id this event names, in the order they are worth trying.
   *
   * One event does not always speak about a payment by the same name. A
   * checkout session completing is a `cs_...`, and the refund of the same
   * money three weeks later is a `ch_...` that never mentions the session,
   * so an install matching only on `reference` silently loses every refund
   * made from the provider's dashboard. Both events do carry the payment
   * intent, so that is the id the two have in common, and this array is how
   * it reaches the lookup.
   */
  references: string[];
  /** What the provider says was paid, for a check against what was asked. */
  amount: Money | null;
  /** The provider's own event id, for logging and idempotency. */
  eventId: string | null;
}

export interface PaymentProvider {
  readonly id: string;
  /** True when this provider has everything it needs. */
  readonly configured: boolean;
  /** True when the keys in use are test keys. */
  readonly testMode: boolean;
  createCheckout(params: CheckoutParams): Promise<CheckoutSession>;
  /** The event a webhook body carries, or null when the signature does not check out. */
  readWebhook(rawBody: string, signature: string | null): PaymentEvent | null;
}

export class PaymentError extends Error {
  readonly code: 'not-configured' | 'upstream' | 'refused';

  constructor(code: 'not-configured' | 'upstream' | 'refused', message: string) {
    super(message);
    this.name = 'PaymentError';
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Stripe
// ---------------------------------------------------------------------------

const STRIPE_API = 'https://api.stripe.com/v1';

/**
 * Called over the REST API rather than through the `stripe` package. One
 * fewer dependency in a theme most installs will never take a payment with,
 * and the three calls used here are small.
 */
export function createStripeProvider(): PaymentProvider {
  return {
    id: 'stripe',
    get configured() {
      return stripeSecretKey() !== null && stripeWebhookSecret() !== null;
    },
    get testMode() {
      return stripeIsTestMode();
    },

    async createCheckout({ order, totals, successUrl, cancelUrl, metadata, email }) {
      const key = stripeSecretKey();
      if (!key) throw new PaymentError('not-configured', 'STRIPE_SECRET_KEY is not set');

      const body = new URLSearchParams();
      body.set('mode', 'payment');
      body.set('success_url', successUrl);
      body.set('cancel_url', cancelUrl);
      body.set('client_reference_id', order.id);
      body.set('metadata[orderId]', order.id);
      body.set('metadata[orderNumber]', order.number);
      for (const [name, value] of Object.entries(metadata ?? {})) body.set(`metadata[${name}]`, value);
      if (email) body.set('customer_email', email);

      // One Stripe line per priced cart line, at the price this install
      // computed. Nothing here came from the browser.
      totals.lines.forEach((line, index) => {
        if (line.problem) return;
        body.set(`line_items[${index}][quantity]`, String(line.line.quantity));
        body.set(`line_items[${index}][price_data][currency]`, totals.currency.toLowerCase());
        body.set(`line_items[${index}][price_data][unit_amount]`, String(line.unitPrice.amount));
        body.set(`line_items[${index}][price_data][product_data][name]`, line.title);
        if (line.variantName) body.set(`line_items[${index}][price_data][product_data][description]`, line.variantName);
      });

      if (totals.shipping.amount > 0) {
        body.set('shipping_options[0][shipping_rate_data][type]', 'fixed_amount');
        body.set('shipping_options[0][shipping_rate_data][display_name]', 'Shipping');
        body.set('shipping_options[0][shipping_rate_data][fixed_amount][amount]', String(totals.shipping.amount));
        body.set('shipping_options[0][shipping_rate_data][fixed_amount][currency]', totals.currency.toLowerCase());
      }

      const response = await fetch(`${STRIPE_API}/checkout/sessions`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${key}`,
          'content-type': 'application/x-www-form-urlencoded',
          // Stripe replays the first answer for a repeated key, so a
          // double-clicked Pay button makes one session, not two.
          'idempotency-key': `checkout_${order.id}`,
        },
        body,
        cache: 'no-store',
      });

      const data = (await response.json()) as { id?: string; url?: string; error?: { message?: string } };
      if (!response.ok || !data.id || !data.url) {
        throw new PaymentError('upstream', data.error?.message ?? `Stripe answered ${response.status}`);
      }
      return { reference: data.id, url: data.url };
    },

    readWebhook(rawBody, signature) {
      const secret = stripeWebhookSecret();
      if (!secret || !signature) return null;
      if (!verifyStripeSignature(rawBody, signature, secret)) return null;

      let event: {
        id?: string;
        type?: string;
        data?: {
          object?: {
            id?: string;
            amount_total?: number;
            amount?: number;
            currency?: string;
            payment_status?: string;
            payment_intent?: string | { id?: string } | null;
          };
        };
      };
      try {
        event = JSON.parse(rawBody) as typeof event;
      } catch {
        return null;
      }

      const object = event.data?.object ?? {};
      // A session reports amount_total; a charge reports amount. Either way
      // the currency is beside it.
      const paid = typeof object.amount_total === 'number' ? object.amount_total : object.amount;
      const amount =
        typeof paid === 'number' && typeof object.currency === 'string'
          ? { amount: paid, currency: object.currency.toUpperCase() }
          : null;
      const intent = typeof object.payment_intent === 'string' ? object.payment_intent : (object.payment_intent?.id ?? null);
      const references = [object.id, intent].filter((value): value is string => typeof value === 'string' && value.length > 0);
      const base = { reference: object.id ?? null, references, amount, eventId: event.id ?? null };

      switch (event.type) {
        case 'checkout.session.completed':
          return { ...base, type: object.payment_status === 'paid' ? 'paid' : 'ignored' };
        case 'checkout.session.async_payment_succeeded':
          return { ...base, type: 'paid' };
        case 'checkout.session.async_payment_failed':
          return { ...base, type: 'failed' };
        case 'checkout.session.expired':
          return { ...base, type: 'expired' };
        case 'charge.refunded':
          return { ...base, type: 'refunded' };
        default:
          return { ...base, type: 'ignored' };
      }
    },
  };
}

/**
 * Stripe's Signature header: `t=<unix>,v1=<hex>`, an HMAC-SHA256 of
 * `${t}.${body}`. The timestamp is checked as well as the digest, so a
 * signature captured off the wire cannot be replayed a week later.
 *
 * There can be more than one v1. While a signing secret is being rotated
 * Stripe signs each request with the old secret and the new one and sends
 * both, so an install that keeps only one of them, which is what reducing
 * the header to an object does, rejects every webhook for the whole of the
 * rotation. Each v1 is compared, and any match is a match: an attacker
 * gains nothing by sending a hundred wrong ones.
 */
export function verifyStripeSignature(rawBody: string, header: string, secret: string, toleranceSeconds = 300, now = Date.now()): boolean {
  let timestamp = Number.NaN;
  const signatures: string[] = [];
  for (const part of header.split(',')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (name === 't') timestamp = Number(value);
    else if (name === 'v1' && value) signatures.push(value);
  }

  if (!Number.isFinite(timestamp) || signatures.length === 0) return false;
  if (Math.abs(now / 1000 - timestamp) > toleranceSeconds) return false;

  const expected = Buffer.from(createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex'), 'utf8');
  // Every candidate is compared, with no early exit, so the answer takes the
  // same time whether the first or the last one matched.
  return signatures.reduce((matched, candidate) => {
    const right = Buffer.from(candidate, 'utf8');
    return (expected.length === right.length && timingSafeEqual(expected, right)) || matched;
  }, false);
}

/** What the provider says it charged, against what this install asked for. */
export function amountsAgree(expected: Money, actual: Money | null): boolean {
  if (!actual) return false;
  return expected.amount === actual.amount && expected.currency.toUpperCase() === actual.currency.toUpperCase();
}

/** Major units, for a provider that wants them. Kept here so no route does the division itself. */
export function toProviderAmount(value: Money): number {
  return fromMinor(value.amount, value.currency);
}

// ---------------------------------------------------------------------------
// The one the app uses
// ---------------------------------------------------------------------------

let provider: PaymentProvider | null = null;

/** Swaps the provider. Call it once at start up. */
export function setPaymentProvider(next: PaymentProvider): void {
  provider = next;
}

/** The configured provider, or null when the install has no payment keys. */
export function getPaymentProvider(): PaymentProvider | null {
  provider ??= createStripeProvider();
  return provider.configured ? provider : null;
}
