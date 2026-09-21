import { notFound } from 'next/navigation';

import { getSettings, getStore } from '@/fixtures';
import { surfaceState } from '@/lib/config';

/**
 * The module gate for checkout, held above the loading boundary, so an
 * install that does not sell anything answers a real 404 rather than a 200
 * shell with the 404 delivered inside the stream.
 *
 * The same two conditions as src/app/shop/layout.tsx and
 * src/app/cart/layout.tsx, and they have to stay the same: the store module
 * switched off, or no store data to sell. An install whose module is on but
 * which has never written a store.json answered 404 at /shop and /cart and
 * 200 here, which left a checkout page standing in front of a shop that does
 * not exist.
 *
 * A missing Stripe key is a different thing and does not close these pages:
 * the page renders its setup panel instead, because an artist whose key has
 * expired should be told which variable to set, not given a 404.
 */
export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  if (surfaceState(getSettings(), 'store') === 'off' || !getStore()) notFound();
  return children;
}
