/**
 * Where sign-in lives, and which routes it stands in front of.
 *
 * Pure, client safe and free of imports on purpose: src/proxy.ts pulls
 * this file into its own bundle, so anything it reached for would be dragged
 * in front of every gated request. The account menu's links live next door in
 * account-links.ts for that reason. The proxy, the server pages and the
 * menu all read the same gate list, so a route cannot be closed in one place
 * and open in another.
 *
 * The canonical sign-in page is /auth, which is what `SIGN_IN_PATH` in
 * src/lib/auth/guards.ts redirects to and what orkhan.art uses. /signin,
 * /auth/signin and /auth/signup are redirects onto it, so an old link, a
 * typed guess and a bookmark all land in the same place.
 */

/** The sign-in page. Must stay equal to SIGN_IN_PATH in src/lib/auth/guards.ts. */
export const SIGN_IN_ROUTE = '/auth';

/** The sign-out page. The menu posts to a server action; this is for a typed URL. */
export const SIGN_OUT_ROUTE = '/signout';

/**
 * The session cookie's name, repeated here because the proxy runs
 * before the app's server-only modules can be imported. Must stay equal to
 * SESSION_COOKIE in src/lib/auth/session.ts.
 */
export const SESSION_COOKIE_NAME = 'raisonne_session';

/**
 * The routes a visitor with no session cookie is turned away from.
 *
 * An entry with no trailing slash is matched exactly. An entry ending in "/"
 * matches everything below it and not the path itself.
 *
 * The list is deliberately short, and shorter than "everything that looks
 * private", because the gate on each page is the one that counts
 * (requireSession in src/lib/auth/guards.ts). Redirecting early is a
 * convenience, so it is only done where it is certainly right:
 *
 *  - /collector is the signed-in collector's own page, and only that path:
 *    /collector/<address> under it is a public profile anyone may read.
 *  - /orders/<id> is one buyer's order. /orders itself is not listed, because
 *    that page shows its own signed-out state with a sign-in link, which
 *    reads better than a redirect.
 *
 * Gating too little costs nothing here. Gating too much would hide a public
 * page, so an unlisted route is the safe default.
 */
export const PROTECTED_ROUTES = ['/collector', '/orders/'] as const;

export function isProtectedPath(pathname: string): boolean {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return PROTECTED_ROUTES.some(rule => (rule.endsWith('/') ? path.startsWith(rule) : path === rule));
}

/**
 * Why a visitor was sent to the sign-in page. It changes one line of copy
 * and nothing else, so an unknown value is simply ignored.
 */
export type SignInReason = 'required' | 'expired' | 'owner';

export const SIGN_IN_REASONS: Record<SignInReason, string> = {
  required: 'That page is for collectors. Sign in with the wallet that holds the work.',
  expired: 'Your session has ended. Sign in again to pick up where you were.',
  owner: 'That page is the artist’s. Sign in with a wallet on this install’s owner list.',
};

export function isSignInReason(value: unknown): value is SignInReason {
  return value === 'required' || value === 'expired' || value === 'owner';
}

/**
 * A return path that cannot leave this site.
 *
 * The same rule as safeNext() in src/lib/auth/guards.ts, repeated because
 * the proxy cannot import a server-only module. An absolute URL in a
 * redirect parameter is how an open redirect is built, so only a path on
 * this site survives, and never the sign-in page itself.
 */
export function safeReturnPath(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const next = value.trim();
  if (!next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return null;
  if (/^\/+\s*https?:/i.test(next)) return null;
  if (next === SIGN_IN_ROUTE || next.startsWith(`${SIGN_IN_ROUTE}?`) || next.startsWith(`${SIGN_IN_ROUTE}/`)) return null;
  if (next === SIGN_OUT_ROUTE || next.startsWith(`${SIGN_OUT_ROUTE}?`)) return null;
  return next.slice(0, 512);
}

/** The sign-in URL with a return path and, when there is one, a reason. */
export function signInUrl(next?: string | null, reason?: SignInReason): string {
  const params = new URLSearchParams();
  const target = safeReturnPath(next);
  if (target) params.set('next', target);
  if (reason && reason !== 'required') params.set('reason', reason);
  const query = params.toString();
  return query ? `${SIGN_IN_ROUTE}?${query}` : SIGN_IN_ROUTE;
}
