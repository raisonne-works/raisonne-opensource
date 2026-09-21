import 'server-only';

import { isProductionBuild, siweDomain, trustsProxyHeaders } from '@/lib/config';
import { requestOrigin } from '@/lib/request-origin';

/**
 * Which domain a sign-in message is bound to.
 *
 * EIP-4361 ties a signature to a domain so a signature collected on one site
 * cannot be spent on another. That only holds if the domain the server puts
 * in the message is a domain the server chose. If it is taken from the
 * request, an attacker asks for a nonce with `Host: evil.example`, gets back
 * a message reading "evil.example wants you to sign in" with a real nonce in
 * it, has the victim's wallet sign that, replays it here with the same
 * forged Host, and the check `fields.domain === expected` compares the
 * attacker's value with the attacker's value and passes. The one server-side
 * anti-phishing control SIWE has would be doing nothing.
 *
 * So the domain is pinned: RAISONNE_SIWE_DOMAIN, or the host of
 * RAISONNE_SITE_URL. The request's own host is used only where it cannot be
 * turned into a phishing domain:
 *
 *  - local development, where the host is localhost and there is nobody to
 *    phish, and
 *  - an install that has declared a reverse proxy it controls and whose
 *    proxy set X-Forwarded-Host, which is then the proxy's word rather than
 *    the caller's.
 *
 * Anything else gets null, and the sign-in routes answer 503 naming the
 * variable. Sign-in switched off is a state an installer can read and fix.
 * Sign-in switched on and lying about which site it is is not.
 */

export interface SignInOrigin {
  domain: string;
  uri: string;
}

/** The pinned sign-in domain, or null when this install has not chosen one it may use. */
export function signInOrigin(request: Request): SignInOrigin | null {
  const configured = siweDomain();
  if (configured) {
    const local = isLocalDomain(configured);
    return { domain: configured, uri: `${local ? 'http:' : 'https:'}//${configured}` };
  }

  const here = requestOrigin(request);
  if (!here) return null;

  // A laptop. The host is localhost or 127.0.0.1, and both steps of the flow
  // read this same function, so they agree.
  if (here.isLocal && !isProductionBuild()) return { domain: here.host, uri: here.origin };

  // A proxy the install has vouched for, which set the host itself.
  if (trustsProxyHeaders() && request.headers.get('x-forwarded-host')) {
    return { domain: here.host, uri: here.origin };
  }

  return null;
}

/** What a route says when the domain is not pinned. One sentence, one variable. */
export const UNPINNED_DOMAIN = {
  error: 'Sign-in is not configured',
  reason: 'not-configured' as const,
  detail:
    'A sign-in message has to name the site it is for, and this install has not been told which site it is. Until then a wallet could be asked to sign for any domain a request claimed.',
  missing: ['RAISONNE_SITE_URL'],
};

function isLocalDomain(host: string): boolean {
  return /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?$/i.test(host);
}
