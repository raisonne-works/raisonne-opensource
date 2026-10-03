import { getWornPack } from '@/lib/theme';

export const dynamic = 'force-dynamic';

/**
 * The worn pack's script: behaviour its stylesheet cannot express. The layout
 * asks for it only when the pack's stylesheet says there is one.
 */
export function GET(request: Request) {
  const pack = getWornPack();
  if (!pack?.script) return new Response('Not found', { status: 404 });
  const etag = `"${pack.id}-${pack.version}"`;
  const headers = { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'public, no-cache', etag };
  if (request.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers });
  return new Response(pack.script, { headers });
}
