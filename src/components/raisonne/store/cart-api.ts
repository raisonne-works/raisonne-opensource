import type { CartLine, CartTotals, Money, ShippingMethod } from '@/lib/types';

/**
 * The one request the cart makes, and the shape it gets back.
 *
 * The browser sends what it holds (slugs, variant ids, quantities) and the
 * server answers with what that is worth, worked out from the install's own
 * fixtures by priceCart(). Nothing in this file decides a price; it only
 * describes the conversation, so the route handler and the panel cannot
 * drift apart.
 */

export const CART_PRICING_ENDPOINT = '/api/store/cart';

export interface CartPricingRequest {
  lines: CartLine[];
  /** The method the visitor picked, if any. The server ignores one it cannot offer. */
  shippingMethodId?: string | null;
  /** ISO 3166-1 alpha-2, when the visitor has said where it is going. */
  country?: string | null;
}

export interface CartPricing {
  /** Every figure on the page, computed on the server. */
  totals: CartTotals;
  /** The methods that can carry this basket, cheapest order first. */
  methods: ShippingMethod[];
  /**
   * The ones that cannot, with the reason. Shown greyed rather than dropped,
   * so a preselected price is visibly the only option left rather than an
   * expensive choice the buyer cannot account for.
   */
  unavailableMethods: { id: string; name: string; price: Money; reason: string }[];
  /** The method the totals were worked out with. */
  shippingMethodId: string | null;
  /** True when this basket could go to checkout as it stands. */
  payable: boolean;
  /**
   * Whether this install can take money at all. False on a fresh clone with
   * no Stripe keys, which is a working state: the shop and the cart still
   * work, and the pages say what is missing instead of offering a checkout
   * that cannot finish.
   */
  paymentsConfigured: boolean;
}

export type CartPricingResult =
  | { ok: true; pricing: CartPricing }
  | { ok: false; reason: 'off' | 'unconfigured' | 'failed'; message: string };

/**
 * Ask the server what the cart is worth. A failure is returned, never
 * thrown: a cart that cannot be priced shows a message and a retry, and
 * never a total it made up locally.
 */
export async function requestCartPricing(
  body: CartPricingRequest,
  signal?: AbortSignal,
): Promise<CartPricingResult> {
  let response: Response;
  try {
    response = await fetch(CART_PRICING_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal,
      cache: 'no-store',
    });
  } catch {
    return { ok: false, reason: 'failed', message: 'The cart could not be priced. Check your connection and try again.' };
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = payload as { reason?: string; message?: string } | null;
    const reason = error?.reason === 'off' || error?.reason === 'unconfigured' ? error.reason : 'failed';
    return {
      ok: false,
      reason,
      message: error?.message ?? 'The cart could not be priced.',
    };
  }

  const pricing = payload as CartPricing | null;
  if (!pricing || typeof pricing !== 'object' || !pricing.totals) {
    return { ok: false, reason: 'failed', message: 'The cart could not be priced.' };
  }
  return { ok: true, pricing };
}
