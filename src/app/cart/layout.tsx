import { notFound } from 'next/navigation';

import { getSettings, getStore } from '@/fixtures';
import { surfaceState } from '@/lib/config';

/**
 * The cart exists only where there is a shop. The gate sits in the layout,
 * above the loading boundary, so a site with the store module off answers a
 * real 404 rather than a 200 with a 404 inside it.
 */
export default function CartLayout({ children }: { children: React.ReactNode }) {
  if (surfaceState(getSettings(), 'store') === 'off' || !getStore()) notFound();
  return children;
}
