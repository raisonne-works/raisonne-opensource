import { readFile } from 'node:fs/promises';

import { getPackFile } from '@/lib/theme';

export const dynamic = 'force-dynamic';

/** Fonts and images of the worn pack, for its stylesheet to reference as /skin/<file>. */
export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  const found = getPackFile((await context.params).path);
  if (!found) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(await readFile(found.file)), {
    headers: { 'content-type': found.type, 'cache-control': 'public, max-age=3600', 'x-content-type-options': 'nosniff' },
  });
}
