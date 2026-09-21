import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { addressInList, normalizeAddress } from '@/lib/chain/address';
import { adminAddresses, isConfigured } from '@/lib/config';
import type { SessionRole } from '@/lib/types';

import {
  SESSION_COOKIE,
  type Session,
  clearedCookieOptions,
  createSessionToken,
  readSessionToken,
  rotateSessionToken,
  sessionCookieOptions,
} from './session';
import { cookieSecure } from './sign-in-request';

/**
 * Who is signed in, and what that entitles them to.
 *
 * Two roles and no more: a collector is anyone who proved control of an
 * address, and the owner is the artist, meaning an address on the install's
 * allow-list. There is no admin table and no permission matrix, because a
 * one-artist install has exactly one person who can change anything.
 *
 * Every gated page calls requireSession() or requireOwner() itself. Nothing
 * is protected by a route's position in the tree alone: a layout that checks
 * is a layout somebody will later render around a page that does not.
 */

/** The sign-in page, and where a gate sends a visitor who is not signed in. */
export const SIGN_IN_PATH = '/auth';

/**
 * The address list that counts as the artist on this install.
 *
 * RAISONNE_OWNER_ADDRESSES and nothing else. It deliberately does not fall
 * back to the minting wallets in the catalogue data: owner means reading
 * every buyer's name, postal address and email, so an old or shared minting
 * key must not be an admin key. An install that has not said who owns it has
 * no owner, and the owner-only surfaces say which variable to set.
 */
export function ownerList(): string[] {
  return adminAddresses();
}

/** True when this install has been told who the artist is at all. */
export function ownerIsConfigured(): boolean {
  return ownerList().length > 0;
}

export function isOwnerAddress(address: unknown): boolean {
  return addressInList(address, ownerList());
}

/** The role an address gets when it signs in. */
export function roleFor(address: string): SessionRole {
  return isOwnerAddress(address) ? 'owner' : 'collector';
}

/**
 * The session on this request, or null.
 *
 * The role is recomputed from the allow-list rather than trusted from the
 * cookie, so taking an address off RAISONNE_OWNER_ADDRESSES takes its owner
 * pages away on the next request, not whenever the cookie happens to expire.
 */
export async function getSession(): Promise<Session | null> {
  if (!isConfigured('accounts')) return null;
  const store = await cookies();
  const session = readSessionToken(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const role = roleFor(session.address);
  return role === session.role ? session : { ...session, role };
}

export async function getSessionAddress(): Promise<string | null> {
  return (await getSession())?.address ?? null;
}

/**
 * The session, or a redirect to the sign-in page.
 *
 * `next` is where to come back to. It is checked before it is used: an
 * absolute URL in a redirect parameter is how an open redirect is built, so
 * only a path on this site survives.
 */
export async function requireSession({ next }: { next?: string } = {}): Promise<Session> {
  const session = await getSession();
  if (session) return session;
  redirect(signInHref(next));
}

/** The session, when the signer owns the install. Anyone else is sent to their own pages. */
export async function requireOwner({ next }: { next?: string } = {}): Promise<Session> {
  const session = await requireSession({ next });
  if (session.role !== 'owner') redirect('/');
  return session;
}

/** A safe sign-in link with a return path. */
export function signInHref(next?: string): string {
  const target = safeNext(next);
  return target ? `${SIGN_IN_PATH}?next=${encodeURIComponent(target)}` : SIGN_IN_PATH;
}

/**
 * A return path that cannot leave this site. Anything with a scheme, a host,
 * or a backslash (which some clients read as a slash) is thrown away.
 */
export function safeNext(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const next = value.trim();
  if (!next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return null;
  if (/^\/+\s*https?:/i.test(next)) return null;
  return next;
}

// ---------------------------------------------------------------------------
// For route handlers
// ---------------------------------------------------------------------------

/** What a JSON route gets: the session, or the answer to send back. */
export type SessionCheck = { ok: true; session: Session } | { ok: false; response: Response };

function refusal(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

/** The session on an API request, or a 401 (or 403) to return as-is. */
export async function requireSessionJson(): Promise<SessionCheck> {
  if (!isConfigured('accounts')) {
    return { ok: false, response: refusal(503, 'Sign-in is not configured on this install') };
  }
  const session = await getSession();
  if (!session) return { ok: false, response: refusal(401, 'Sign in to do that') };
  return { ok: true, session };
}

export async function requireOwnerJson(): Promise<SessionCheck> {
  const check = await requireSessionJson();
  if (!check.ok) return check;
  if (check.session.role !== 'owner') return { ok: false, response: refusal(403, 'That is the artist’s to do') };
  return check;
}

/**
 * Signs an address in. Route handlers call this after verifySignIn() has
 * said yes, and set the cookie it hands back.
 */
export async function startSession(address: string, chainId?: number, request?: Request | null): Promise<Session | null> {
  const owner = normalizeAddress(address);
  if (!owner) return null;
  const role = roleFor(owner);
  const token = createSessionToken({ address: owner, role, chainId });
  if (!token) return null;
  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions(undefined, cookieSecure(request)));
  return readSessionToken(token);
}

/** Extends a session that is still good. Only a route handler may call this. */
export async function renewSession(session: Session, request?: Request | null): Promise<void> {
  const token = rotateSessionToken(session);
  if (!token) return;
  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions(undefined, cookieSecure(request)));
}

export async function endSession(request?: Request | null): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, '', clearedCookieOptions(cookieSecure(request)));
}
