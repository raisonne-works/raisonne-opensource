import { getSettings, getStore } from '@/fixtures';
import { surfaceState } from '@/lib/config';
import { cartWeight, isPayable, priceCart, shippingOptions } from '@/lib/store/cart';
import { parseQuoteRequest } from '@/lib/store/checkout';

/**
 * POST /api/checkout/quote  { lines, shippingMethodId?, country? }
 *
 * What a cart costs, worked out here and not in the browser.
 *
 * The checkout page calls this on load and again whenever the destination
 * country or the shipping method changes, so the figures a buyer reads are
 * produced by the same function that produces the figures the payment
 * provider is given. There is no second implementation to drift.
 *
 * It answers for an install whose payment keys are missing too: the cart
 * still adds up, `payable` is false, and the page shows the setup panel
 * instead of a Pay button.
 *
 * Read only. Nothing is written and no personal detail is asked for.
 */

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const state = surfaceState(getSettings(), 'store');
  if (state === 'off') return Response.json({ error: 'This site has no store.' }, { status: 404 });

  const store = getStore();
  if (!store) return Response.json({ error: 'This install has no store data.' }, { status: 404 });

  const body: unknown = await request.json().catch(() => null);
  const { lines, shippingMethodId, country } = parseQuoteRequest(body);

  // Only the methods that can carry this basket to this country, and the
  // cheapest of them when the buyer has not chosen: a quote that assumes
  // courier is a quote that overcharges.
  const options = shippingOptions(store, { country, weight: cartWeight(store, lines) });
  const chosen = options.find(method => method.id === shippingMethodId) ?? options[0] ?? null;
  const totals = priceCart(store, lines, { shippingMethodId: chosen?.id ?? null });

  return Response.json(
    {
      totals,
      options,
      shippingMethodId: chosen?.id ?? null,
      payable: state === 'on' && isPayable(totals),
      configured: state === 'on',
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}
