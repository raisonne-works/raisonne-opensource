import { notFound } from 'next/navigation';

import { getSettings } from '@/fixtures';
import { isModuleEnabled } from '@/lib/records';

/**
 * The module gate for the collector area, held above the loading boundary so
 * an install with the module switched off answers a real 404 rather than a
 * 200 shell with the 404 delivered inside the stream.
 *
 * Everything under /collector is gated on the collectors module today. A
 * later wave that puts a buyer's orders at /collector/orders will have to
 * widen this to "collectors or store", because somebody who bought a print
 * has an order to read whether or not the artist publishes collectors.
 */
export default function CollectorLayout({ children }: { children: React.ReactNode }) {
  if (!isModuleEnabled(getSettings(), 'collectors')) notFound();
  return children;
}
