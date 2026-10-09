import { notFound } from 'next/navigation';
import { connection } from 'next/server';

import { getSettings } from '@/fixtures';
import { isModuleEnabled } from '@/lib/records';

/**
 * The module gate for the collector directory, held above the loading
 * boundary. The page checks too, but a loading.tsx makes Next flush a 200
 * shell before the page's notFound() is reached, so a switched-off module
 * would answer a soft 404 without this.
 */
export default async function CollectorsLayout({ children }: { children: React.ReactNode }) {
  // Module switches live in the run-time fixture, not in the container image.
  await connection();
  if (!isModuleEnabled(getSettings(), 'collectors')) notFound();
  return children;
}
