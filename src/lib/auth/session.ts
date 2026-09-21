import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

import { normalizeAddress } from '@/lib/chain/address';
import { sessionSecret, sessionTtlSeconds } from '@/lib/config';
import type { SessionRole } from '@/lib/types';

/**
 * The session, which is a signed cookie and nothing else.
 *
 * There is no session table, because there is nothing to keep: the session
 * says which address signed in and when, and that is all any page needs. A
 * cookie is signed with HMAC-SHA256 over its exact bytes, so it cannot be
 * edited, and it carries its own expiry, so an old one cannot be reused.
 *
 * It is httpOnly (script cannot read it), SameSite=Lax (it does not ride
 * along on a cross-site POST), Secure outside development, and short lived
 * with rotation: every read that happens in a route handler can hand back a
 * fresh one, so an active visitor stays signed in and an idle one does not.
 *
 * The secret is RAISONNE_SESSION_SECRET. Without it nothing is signed and
 * nobody is signed in: readSession() returns null and the sign-in page says
 * which variable to set.
 */

export const SESSION_COOKIE = 'raisonne_session';

/** Bumped when the payload shape changes, which retires every cookie in the wild. */
const SESSION_VERSION = 1;

export interface Session {
  address: string;
  role: SessionRole;
  /** Unix seconds. */
  issuedAt: number;
  expiresAt: number;
  /** The chain id the wallet signed on, for the record. */
  chainId?: number;
}

interface Payload {
  v: number;
  a: string;
  r: SessionRole;
  i: number;
  e: number;
  c?: number;
}

function sign(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  // timingSafeEqual throws on a length mismatch, which would itself leak a bit.
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * A signed cookie value for this session, or null when the install has no
 * secret. Callers treat null as "sign-in is not configured" and say so.
 */
export function createSessionToken(session: Omit<Session, 'issuedAt' | 'expiresAt'> & Partial<Pick<Session, 'issuedAt' | 'expiresAt'>>): string | null {
  const secret = sessionSecret();
  const address = normalizeAddress(session.address);
  if (!secret || !address) return null;

  const issuedAt = session.issuedAt ?? Math.floor(Date.now() / 1000);
  const payload: Payload = {
    v: SESSION_VERSION,
    a: address,
    r: session.role,
    i: issuedAt,
    e: session.expiresAt ?? issuedAt + sessionTtlSeconds(),
    ...(session.chainId ? { c: session.chainId } : {}),
  };

  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${body}.${sign(body, secret)}`;
}

/** The session a cookie carries, or null when it is missing, edited, expired or unsigned. */
export function readSessionToken(token: string | null | undefined, now = Date.now()): Session | null {
  const secret = sessionSecret();
  if (!secret || typeof token !== 'string' || !token.includes('.')) return null;

  const [body, signature] = token.split('.', 2);
  if (!body || !signature || !safeEqual(signature, sign(body, secret))) return null;

  let payload: Payload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Payload;
  } catch {
    return null;
  }

  const address = normalizeAddress(payload?.a);
  if (payload?.v !== SESSION_VERSION || !address) return null;
  if (payload.r !== 'collector' && payload.r !== 'owner') return null;
  if (typeof payload.e !== 'number' || payload.e * 1000 <= now) return null;

  return { address, role: payload.r, issuedAt: payload.i, expiresAt: payload.e, chainId: payload.c };
}

/**
 * A fresh token for a session that is still valid, so an active visitor is
 * not signed out mid-task. Rotation happens in route handlers, which are the
 * only place a cookie can be set; a server component that reads the session
 * does not rotate it.
 */
export function rotateSessionToken(session: Session): string | null {
  return createSessionToken({ address: session.address, role: session.role, chainId: session.chainId });
}

export interface CookieOptions {
  httpOnly: true;
  sameSite: 'lax';
  secure: boolean;
  path: '/';
  maxAge: number;
}

/**
 * What every Set-Cookie for the session uses.
 *
 * Secure defaults to on, and is only turned off for a request that
 * demonstrably arrived on local http. Keying it on NODE_ENV instead would
 * hand the auth cookie out without Secure on any install run without
 * NODE_ENV set but served over HTTPS, and on any install behind a proxy that
 * terminates TLS, which is most of them. Callers get the flag from
 * cookieSecure(request) in src/lib/auth/sign-in-request.ts.
 */
export function sessionCookieOptions(maxAge = sessionTtlSeconds(), secure = true): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge,
  };
}

/** The options that delete the cookie. */
export function clearedCookieOptions(secure = true): CookieOptions {
  return sessionCookieOptions(0, secure);
}
