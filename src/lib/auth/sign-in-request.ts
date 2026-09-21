import 'server-only';

import { requestOrigin } from '@/lib/request-origin';

/**
 * Two things that have to be true of a sign-in request, beyond the signature.
 *
 * 1. The browser that asks for a nonce is the browser that comes back with
 *    the signed message.
 *
 *    Without that, /api/auth/verify is an unauthenticated endpoint that sets
 *    a session cookie, which is login CSRF. An attacker asks this install for
 *    a nonce, signs the message with a wallet they control, and then gets a
 *    victim's browser to POST that message and signature here cross-site.
 *    SameSite=Lax governs sending a cookie, not storing one, so the victim's
 *    browser keeps the Set-Cookie and the victim is now signed in as the
 *    attacker's wallet. If they then buy something, the order is filed under
 *    the attacker's address, and the attacker reads the victim's name,
 *    postal address and email off their own orders page.
 *
 *    The fix is a pre-session cookie: the nonce route puts the nonce it
 *    issued in an httpOnly cookie, and verify insists the message carries
 *    that same nonce. A nonce obtained in the attacker's browser is not in
 *    the victim's, so the replay has nothing to match.
 *
 * 2. The request came from this site.
 *
 *    A defence in depth over the same attack, and free: a browser tells us
 *    with Sec-Fetch-Site, and anything that sends an Origin has to send ours.
 *    Requests that carry neither (curl, a native wallet app) are allowed,
 *    because refusing them would break real clients and the cookie above is
 *    the control that actually holds.
 */

/** Carries the nonce this browser was issued. Nothing else, and never readable by script. */
export const SIGN_IN_COOKIE = 'raisonne_signin';

export interface SignInCookieOptions {
  httpOnly: true;
  sameSite: 'lax';
  secure: boolean;
  path: '/';
  maxAge: number;
}

export function signInCookieOptions(maxAge: number, secure: boolean): SignInCookieOptions {
  return { httpOnly: true, sameSite: 'lax', secure, path: '/', maxAge };
}

/**
 * Whether the session cookie should be Secure.
 *
 * Not `NODE_ENV === 'production'`: an install run without NODE_ENV set but
 * served over HTTPS would then hand out its auth cookie without Secure, and
 * an install behind a TLS-terminating proxy sees plain http itself. So the
 * answer is yes unless this is demonstrably a local http development server,
 * which is the only case where a Secure cookie would simply never be sent.
 */
export function cookieSecure(request?: Request | null): boolean {
  if (!request) return true;
  const here = requestOrigin(request);
  if (!here) return true;
  return !(here.isLocal && here.origin.startsWith('http://'));
}

/** False only when a browser has told us, in so many words, that this is cross-site. */
export function isSameOriginRequest(request: Request, expectedOrigin: string | null): boolean {
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'same-site' && fetchSite !== 'none') return false;

  const origin = request.headers.get('origin');
  if (!origin || origin === 'null') return true;
  if (!expectedOrigin) return true;
  return origin.toLowerCase() === expectedOrigin.toLowerCase();
}
