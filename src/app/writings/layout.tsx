import { notFound } from 'next/navigation';

import { getSettings } from '@/fixtures';
import { isModuleEnabled } from '@/lib/records';

/**
 * The module gate for the writings section, held above the loading boundary.
 *
 * The list and the article both call notFound() when the module is off, but a
 * loading.tsx puts a Suspense boundary around the page, and Next flushes the
 * shell with a 200 as soon as the page suspends. The 404 then arrives inside
 * the stream: the visitor sees the right page, a crawler reads a soft 404.
 * A layout renders outside that boundary, so the status is still ours to set.
 */
export default function WritingsLayout({ children }: { children: React.ReactNode }) {
  if (!isModuleEnabled(getSettings(), 'writings')) notFound();
  return children;
}
