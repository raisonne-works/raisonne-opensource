import { checkLimit, retryAfter } from '@/lib/auth/rate-limit';
import { requireSessionJson } from '@/lib/auth/guards';
import { getHoldings, refreshHoldings } from '@/lib/chain/holdings';
import { isConfigured } from '@/lib/config';

/**
 * POST /api/collector/resync
 *
 * Drops the cached chain read for the signed-in wallet and reads it again.
 *
 * The address is the one in the session cookie and nothing else. There is no
 * parameter to pass, so this cannot be pointed at somebody else's wallet, and
 * a signed-out caller gets a 401 rather than a read.
 *
 * A read costs the install an Alchemy call, so it is capped at five in five
 * minutes per wallet, and the answer says when the window reopens. Per
 * wallet rather than per process: one impatient collector must not be able
 * to stop everybody else re-syncing.
 */

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const check = await requireSessionJson();
  if (!check.ok) return check.response;

  if (!isConfigured('chain')) {
    return Response.json(
      { error: 'No chain source is configured on this install (ALCHEMY_API_KEY).' },
      { status: 503 },
    );
  }

  const address = check.session.address;

  const limit = checkLimit(request, 'resync', address);
  if (!limit.ok) {
    return Response.json(
      { error: 'That is a few too many re-syncs in a row. Try again shortly.' },
      { status: 429, headers: { 'Retry-After': retryAfter(limit) } },
    );
  }

  refreshHoldings(address);
  const result = await getHoldings(address);

  // A live read that failed is reported as one. The page keeps whatever the
  // snapshot holds; it is never told a stale answer is a fresh one.
  if (result.error) {
    return Response.json({ error: result.error, source: result.source }, { status: 502 });
  }

  return Response.json({
    works: result.holdings.length,
    editions: result.holdings.reduce((total, holding) => total + Math.max(1, holding.balance), 0),
    source: result.source,
    readAt: result.computedAt,
  });
}
