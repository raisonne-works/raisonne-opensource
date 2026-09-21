import { checkLimit, retryAfter } from '@/lib/auth/rate-limit';
import { requireOwnerJson } from '@/lib/auth/guards';
import { isSameOriginRequest } from '@/lib/auth/sign-in-request';
import { requestOrigin } from '@/lib/request-origin';
import { applyUpdate, getUpdateStatus } from '@/lib/update';

/**
 * GET  /api/update  — current version vs the latest release (owner only).
 * POST /api/update  — pull that release into this install (owner only).
 *
 * The whole Raisonne app, not catalogue data. Local fixtures, orders and env
 * files stay put. Applying an update rewrites the source tree and installs
 * dependencies; the running process is still the old build until the host
 * rebuilds and restarts it.
 *
 * Development is not opened the way /api/setup is: an update rewrites files
 * on disk, so only the artist (a wallet on RAISONNE_OWNER_ADDRESSES) may ask.
 */

export const dynamic = 'force-dynamic';

function noStore(body: unknown, status = 200, extraHeaders?: HeadersInit): Response {
  return Response.json(body, {
    status,
    headers: { 'cache-control': 'no-store', ...(extraHeaders ?? {}) },
  });
}

function sameOriginOrLocal(request: Request): boolean {
  const here = requestOrigin(request);
  return isSameOriginRequest(request, here?.origin ?? null);
}

export async function GET(request: Request): Promise<Response> {
  const check = await requireOwnerJson();
  if (!check.ok) return check.response;

  const force = new URL(request.url).searchParams.get('force') === '1';
  const status = await getUpdateStatus({ forceCheck: force });
  return noStore(status);
}

export async function POST(request: Request): Promise<Response> {
  const check = await requireOwnerJson();
  if (!check.ok) return check.response;

  if (!sameOriginOrLocal(request)) {
    return noStore({ error: 'That request did not come from this site.' }, 403);
  }

  const limit = checkLimit(request, 'update', check.session.address);
  if (!limit.ok) {
    return noStore(
      { error: 'An update was already asked for too recently. Wait a minute and try again.' },
      429,
      { 'Retry-After': retryAfter(limit) },
    );
  }

  let toVersion: string | null = null;
  try {
    const body = (await request.json().catch(() => null)) as { to?: unknown } | null;
    if (typeof body?.to === 'string' && body.to.trim()) {
      toVersion = body.to.trim().slice(0, 32);
    }
  } catch {
    // Empty body means "latest".
  }

  const result = await applyUpdate({ toVersion });
  return noStore(
    {
      ok: result.ok,
      summary: result.summary,
      detail: result.detail,
      restartRequired: result.restartRequired,
      status: result.status,
    },
    result.ok ? 200 : 409,
  );
}
