import { notFound } from 'next/navigation';

import { getSettings } from '@/fixtures';
import { isModuleEnabled } from '@/lib/records';

/**
 * The module gate for the collector directory, held above the loading
 * boundary. The page checks too, but a loading.tsx makes Next flush a 200
 * shell before the page's notFound() is reached, so a switched-off module
 * would answer a soft 404 without this.
 */
export default function CollectorsLayout({ children }: { children: React.ReactNode }) {
  if (!isModuleEnabled(getSettings(), 'collectors')) notFound();
  return children;
}
