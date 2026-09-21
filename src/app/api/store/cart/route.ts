import { NextResponse } from 'next/server';

import type { CartPricing } from '@/components/raisonne/store/cart-api';
import { getSettings, getStore } from '@/fixtures';
import { surfaceState } from '@/lib/config';
import { cartWeight, isPayable, parseCart, priceCart, shippingChoices } from '@/lib/store/cart';

/**
 * POST /api/store/cart  { lines, shippingMethodId?, country? }
 *
 * What a cart is worth, according to the install. The browser holds slugs,
 * variant ids and quantities; this is the only place those become money, and
 * it reads the prices out of the fixtures, never out of the request. The
 * same priceCart() call runs again at checkout, so the figure a visitor is
 * shown and the figure a payment provider is given cannot disagree.
 *
 * Four things it will not do:
 *
 *  - Take a price. Anything price-shaped in the body is dropped by
 *    parseCart() before it is looked at.
 *  - Answer when the store module is off. That is a 404, the same as the
 *    pages, so a switched-off shop has no endpoint either.
 *  - Keep anything. No session is read, no order is written, nothing is
 *    logged about the visitor: this is a calculator over public data.
 *  - Hide a problem. A line whose product went away or sold out comes back
 *    with the reason attached, so the panel can say which line and why
 *    rather than quietly emptying the cart.
 */

export const dynamic = 'force-dynamic';

function refuse(reason: 'off' | 'failed', message: string, status: number) {
  return NextResponse.json({ reason, message }, { status, headers: { 'cache-control': 'no-store' } });
}

export async function POST(request: Request) {
  const store = getStore();
  const state = surfaceState(getSettings(), 'store');
  if (!store || state === 'off') {
    return refuse('off', 'This site has no shop.', 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return refuse('failed', 'The cart could not be read.', 400);
  }

  const input = (typeof body === 'object' && body !== null ? body : {}) as {
    lines?: unknown;
    shippingMethodId?: unknown;
    country?: unknown;
  };

  const lines = parseCart(input.lines);
  const country = typeof input.country === 'string' ? input.country.trim().slice(0, 2).toUpperCase() : null;
  const requested = typeof input.shippingMethodId === 'string' ? input.shippingMethodId.slice(0, 200) : null;

  // Every method, including the ones this basket cannot have, each with the
  // reason. A cheap option that disappears without a word leaves the buyer
  // looking at an expensive one with no idea it was not the only choice.
  const choices = shippingChoices(store, { country, weight: cartWeight(store, lines) });
  const methods = choices.filter(choice => choice.available).map(choice => choice.method);
  // A method the visitor asked for that this basket cannot use is not an
  // error: the cheapest one that can carry it is used instead, and the
  // answer says which, so the panel can correct itself.
  const chosen = methods.find(method => method.id === requested) ?? methods[0] ?? null;
  const totals = priceCart(store, lines, { shippingMethodId: chosen?.id ?? null });

  const pricing: CartPricing = {
    totals,
    methods,
    unavailableMethods: choices
      .filter(choice => !choice.available)
      .map(choice => ({ id: choice.method.id, name: choice.method.name, price: choice.method.price, reason: choice.reason ?? '' })),
    shippingMethodId: chosen?.id ?? null,
    payable: isPayable(totals),
    paymentsConfigured: state === 'on',
  };

  return NextResponse.json(pricing, { headers: { 'cache-control': 'no-store' } });
}

/** Anything else: the cart is read by posting it, and nothing here is stored. */
export function GET() {
  return NextResponse.json(
    { reason: 'failed', message: 'Post the cart to price it.' },
    { status: 405, headers: { allow: 'POST', 'cache-control': 'no-store' } },
  );
}
