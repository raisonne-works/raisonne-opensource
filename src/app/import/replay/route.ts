import { slimReplay } from '@/components/raisonne/import/import-source';
import { getImportReplay } from '@/fixtures';
import { ownerToolsEnabled } from '@/lib/tools';

/**
 * The recorded import run as newline-delimited JSON, the same wire format a
 * live importer speaks. The page fetches it when someone presses Play, so a
 * run of several hundred works never rides along in the HTML, and the flow
 * reads it through exactly the code path a live import would use.
 */
export async function GET(): Promise<Response> {
  if (!ownerToolsEnabled()) return new Response('Not found', { status: 404 });

  const events = slimReplay(getImportReplay());
  const body = events.map(event => JSON.stringify(event)).join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
