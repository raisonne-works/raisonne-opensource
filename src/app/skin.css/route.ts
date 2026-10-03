import { getWornPack } from '@/lib/theme';

export const dynamic = 'force-dynamic';

/**
 * The worn pack's stylesheet. Empty for skin zero.
 *
 * The layout links this on every page because the pages are prerendered and
 * cannot know which pack a host mounts. It is loaded after the app's own
 * styles, so a pack restyles the frame without the app shipping its rules.
 * The browser revalidates it each time (a 304 unless the pack changed), so
 * mounting or swapping a pack shows on the next page load.
 */
export function GET(request: Request) {
  const pack = getWornPack();
  const etag = `"${pack ? `${pack.id}-${pack.version}` : 'skin-zero'}"`;
  const headers = { 'content-type': 'text/css; charset=utf-8', 'cache-control': 'public, no-cache', etag };
  if (request.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers });
  return new Response(pack?.css ?? '', { headers });
}
