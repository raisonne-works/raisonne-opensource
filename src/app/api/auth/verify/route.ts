import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { startSession } from '@/lib/auth/guards';
import { checkLimit, resetRateLimit, retryAfter } from '@/lib/auth/rate-limit';
import { SIGN_IN_COOKIE, cookieSecure, isSameOriginRequest, signInCookieOptions } from '@/lib/auth/sign-in-request';
import { verifySignIn, type SignInFailure } from '@/lib/auth/siwe';
import { normalizeAddress } from '@/lib/chain/address';
import { getCollector } from '@/lib/chain/holdings';
import { featureStatus, isConfigured } from '@/lib/config';

import { UNPINNED_DOMAIN, signInOrigin } from '../origin';

/**
 * POST /api/auth/verify  { message, signature }
 *
 * Step two: the signed message comes back, the server checks it, and a
 * session cookie is set.
 *
 * Everything that decides the answer happens here. verifySignIn() checks the
 * domain, the expiry and the address, spends the nonce exactly once, and
 * then verifies the signature, including through the wallet contract itself
 * for a smart-contract wallet when the install has an RPC key.
 *
 * Three things guard the route itself, because it is unauthenticated and it
 * sets a session cookie, which is the shape of login CSRF:
 *
 *  - the domain the message is checked against is this install's pinned one,
 *  - the nonce in the message must match the one in this browser's own
 *    sign-in cookie, so a message signed in somebody else's browser cannot
 *    be posted into this one, and
 *  - a request a browser labels cross-site is refused outright.
 */

export const dynamic = 'force-dynamic';

/** A failed check that the server caused is a 503; everything else is the caller's. */
const STATUS: Record<SignInFailure, number> = {
  'bad-message': 400,
  'bad-domain': 400,
  'bad-nonce': 401,
  expired: 401,
  'bad-signature': 401,
  'not-configured': 503,
};

/** The address a message claims, for the rate-limit bucket. Cheap, and never trusted beyond that. */
function claimedAddress(message: string): string | null {
  return normalizeAddress(/^0x[0-9a-fA-F]{40}$/m.exec(message)?.[0]);
}

export async function POST(request: Request) {
  if (!isConfigured('accounts')) {
    const status = featureStatus('accounts');
    return NextResponse.json(
      { error: status.summary, reason: 'not-configured', detail: status.detail, missing: status.missing },
      { status: 503 },
    );
  }

  const origin = signInOrigin(request);
  if (!origin) return NextResponse.json(UNPINNED_DOMAIN, { status: 503 });

  if (!isSameOriginRequest(request, origin.uri)) {
    return NextResponse.json({ error: 'That sign-in did not start on this site.', reason: 'cross-site' }, { status: 403 });
  }

  const body: unknown = await request.json().catch(() => null);
  const payload = (body ?? {}) as Record<string, unknown>;
  const message = typeof payload.message === 'string' ? payload.message : '';
  const signature = typeof payload.signature === 'string' ? payload.signature : '';

  const limit = checkLimit(request, 'signIn', claimedAddress(message));
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many sign-in attempts. Try again in a minute.', reason: 'rate-limited' },
      { status: 429, headers: { 'Retry-After': retryAfter(limit) } },
    );
  }

  const store = await cookies();
  const issued = store.get(SIGN_IN_COOKIE)?.value ?? null;

  const result = await verifySignIn({ message, signature, domain: origin.domain, issuedNonce: issued });

  // One sign-in per nonce, whichever way it ended: the cookie goes now, so a
  // refused attempt cannot be retried against the same issued nonce.
  store.set(SIGN_IN_COOKIE, '', signInCookieOptions(0, cookieSecure(request)));

  if (!result.ok) {
    return NextResponse.json({ error: result.detail, reason: result.reason }, { status: STATUS[result.reason] });
  }

  const session = await startSession(result.address, result.chainId, request);
  if (!session) {
    // Only reachable if the secret disappeared between the two checks above.
    return NextResponse.json({ error: 'The session could not be signed.', reason: 'not-configured' }, { status: 503 });
  }

  // A signature that checked out should not count against the next one.
  resetRateLimit(limit.key);

  const collector = getCollector(session.address);

  return NextResponse.json(
    {
      ok: true,
      address: session.address,
      role: session.role,
      chainId: session.chainId ?? null,
      expiresAt: session.expiresAt,
      ens: collector?.ens ?? null,
      // False means only a key-pair signature could be checked, because the
      // install has no RPC key. Worth knowing, never worth blocking on.
      contractWalletsChecked: result.contractWalletsChecked,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
