import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { checkLimit, retryAfter } from '@/lib/auth/rate-limit';
import { NONCE_TTL_SECONDS, issueNonce } from '@/lib/auth/nonce';
import { SIGN_IN_COOKIE, cookieSecure, isSameOriginRequest, signInCookieOptions } from '@/lib/auth/sign-in-request';
import { MESSAGE_TTL_SECONDS, buildSiweMessage, isSupportedChainId } from '@/lib/auth/siwe';
import { normalizeAddress } from '@/lib/chain/address';
import { featureStatus, isConfigured } from '@/lib/config';

import { UNPINNED_DOMAIN, signInOrigin } from '../origin';

/**
 * POST /api/auth/nonce  { address, chainId? }
 *
 * Step one of signing in: the server issues a one-time nonce and writes the
 * whole EIP-4361 message around it.
 *
 * The browser gets the finished message and never composes one. A wallet
 * prompt is only as trustworthy as whoever wrote the words in it, so the
 * words are the server's: the domain, the chain, the statement and the
 * expiry are all decided here, and a page that tried to change them would
 * only produce a message the verify step refuses.
 *
 * The domain is the install's own pinned one, never the one the request
 * claims: see ../origin.ts for why that distinction is the whole of SIWE's
 * anti-phishing value.
 *
 * The nonce lives for five minutes, is destroyed the first time it is
 * presented, and is also written into an httpOnly cookie, so the browser
 * that comes back with a signature has to be the browser that asked.
 */

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isConfigured('accounts')) {
    const status = featureStatus('accounts');
    return NextResponse.json({ error: status.summary, detail: status.detail, missing: status.missing }, { status: 503 });
  }

  const origin = signInOrigin(request);
  if (!origin) return NextResponse.json(UNPINNED_DOMAIN, { status: 503 });

  if (!isSameOriginRequest(request, origin.uri)) {
    return NextResponse.json({ error: 'That sign-in did not start on this site.', reason: 'cross-site' }, { status: 403 });
  }

  // Parsed before the limit is counted, because the address is what the
  // limit counts: on an install with no trusted proxy the alternative is one
  // bucket for the whole internet, which is a kill switch rather than a
  // limit.
  const body: unknown = await request.json().catch(() => null);
  const payload = (body ?? {}) as Record<string, unknown>;

  const address = normalizeAddress(payload.address);
  if (!address) {
    return NextResponse.json({ error: 'That is not an Ethereum address.' }, { status: 400 });
  }

  const limit = checkLimit(request, 'nonce', address);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many sign-in attempts. Try again in a minute.' },
      { status: 429, headers: { 'Retry-After': retryAfter(limit) } },
    );
  }

  // An unsupported chain is refused here rather than quietly rewritten: a
  // person who signs on one chain should not find a message naming another.
  const chainId = payload.chainId === undefined ? 1 : Number(payload.chainId);
  if (!isSupportedChainId(chainId)) {
    return NextResponse.json(
      { error: 'Sign in from Ethereum or Base.', reason: 'unsupported-chain', supported: [1, 8453] },
      { status: 400 },
    );
  }

  const nonce = await issueNonce();
  const message = buildSiweMessage({ address, domain: origin.domain, uri: origin.uri, nonce, chainId });
  if (!message) {
    return NextResponse.json({ error: 'That sign-in message could not be built.' }, { status: 400 });
  }

  const store = await cookies();
  store.set(SIGN_IN_COOKIE, nonce, signInCookieOptions(NONCE_TTL_SECONDS, cookieSecure(request)));

  return NextResponse.json(
    {
      message,
      nonce,
      domain: origin.domain,
      chainId,
      expiresInSeconds: Math.min(MESSAGE_TTL_SECONDS, NONCE_TTL_SECONDS),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
