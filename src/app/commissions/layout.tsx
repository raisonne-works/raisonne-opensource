import { notFound } from 'next/navigation';

import { getSettings } from '@/fixtures';
import { isModuleEnabled } from '@/lib/records';

/**
 * The module gate for the commissions page, held above the loading boundary,
 * so an install that switched the module off answers a real 404 rather than a
 * 200 shell with the 404 delivered inside the stream.
 */
export default function CommissionsLayout({ children }: { children: React.ReactNode }) {
  if (!isModuleEnabled(getSettings(), 'commissions')) notFound();
  return children;
}
