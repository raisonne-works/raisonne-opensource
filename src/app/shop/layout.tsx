import { notFound } from 'next/navigation';

import { getSettings, getStore } from '@/fixtures';
import { surfaceState } from '@/lib/config';

/**
 * The module gate for the shop, held above the loading boundary.
 *
 * Two different answers, on purpose. A site whose store module is off has no
 * shop at all, so every route under /shop answers 404: an install that does
 * not sell anything should not have an empty shop in its sitemap. A site
 * that sells but has no payment keys is a different thing entirely, and is
 * handled inside the pages: the products, the prices and the cart are real,
 * and a panel says which variables are missing before anything can be paid.
 *
 * A layout renders outside the Suspense boundary a loading.tsx creates, so
 * the 404 is a real 404 rather than one that arrives inside a 200 stream.
 */
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  if (surfaceState(getSettings(), 'store') === 'off' || !getStore()) notFound();
  return children;
}
