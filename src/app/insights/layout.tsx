import { notFound } from 'next/navigation';
import { connection } from 'next/server';

import { getSettings } from '@/fixtures';
import { surfaceState } from '@/lib/config';

/**
 * The one gate on the whole insights section.
 *
 * It lives in the layout rather than in each page because the pages sit
 * behind a `loading.tsx`, and everything behind a loading boundary is
 * streamed: by the time a page could call notFound(), the 200 has already
 * gone out and the visitor gets the not-found page under an "OK" status,
 * which a crawler reads as a real page. A layout renders before that
 * boundary opens, so the 404 is a 404.
 *
 * Off means off. An install that does not publish its figures has no
 * /insights at all, rather than a page explaining that it has none.
 */
export default async function InsightsLayout({ children }: LayoutProps<'/insights'>) {
  // Module switches live in the run-time fixture, not in the container image.
  await connection();
  if (surfaceState(getSettings(), 'insights') === 'off') notFound();
  return children;
}
