import 'server-only';

import { trustsProxyHeaders } from '@/lib/config';

/**
 * The address a request actually arrived on.
 *
 * Why this exists: inside a Route Handler, `request.url` does NOT carry the
 * host the visitor typed. Next builds it from the address the server is bound
 * to, so `next start -H 0.0.0.0` makes every Route Handler believe it lives at
 * http://0.0.0.0:3000 no matter which domain the request came in on. Anything
 * that reads a host out of `request.url` is therefore reading the deployment's
 * own bind address, which on a real install is never the public one.
 *
 * The Host header is correct in the same handler, so that is what this reads.
 *
 * x-forwarded-host and x-forwarded-proto are honoured only when
 * RAISONNE_TRUSTED_PROXY says a proxy the install controls sets them, which is
 * the same rule clientKey() in src/lib/auth/rate-limit.ts uses for
 * x-forwarded-for. Untrusted, they are a header a caller can write, and Next
 * fills x-forwarded-host in from the Host header anyway, so reading it would
 * add nothing but a way to be lied to.
 *
 * A host that does not look like a host is refused rather than patched up: it
 * would otherwise be pasted into a Location header or into a sign-in message.
 */

/** hostname, dotted or bracketed IPv6, with an optional port. */
const HOST_PATTERN = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*|\[[0-9a-f:.]+\])(?::\d{1,5})?$/i;

/** Hosts with no public address and no certificate, so http and never advertised. */
const LOCAL_PATTERN = /^(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1?\]|\[::ffff:127\.0\.0\.1\])(?::\d+)?$/i;

export interface RequestOrigin {
  /** The host with its port, e.g. "example.art" or "127.0.0.1:3038". */
  host: string;
  /** The scheme and host, e.g. "https://example.art". No trailing slash. */
  origin: string;
  /** True for localhost and friends: a developer's machine, not a deployment. */
  isLocal: boolean;
}

export function isLocalHost(host: string): boolean {
  return LOCAL_PATTERN.test(host);
}

/** What the request says it was addressed to, or null when it does not say anything usable. */
export function requestOrigin(request: Request): RequestOrigin | null {
  const trusted = trustsProxyHeaders();
  const forwardedHost = trusted ? request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() : null;
  const host = (forwardedHost || request.headers.get('host')?.trim() || '').toLowerCase();
  if (!host || !HOST_PATTERN.test(host)) return null;

  const isLocal = isLocalHost(host);
  const forwardedProto = trusted ? request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase() : null;
  const scheme = forwardedProto === 'http' || forwardedProto === 'https' ? forwardedProto : isLocal ? 'http' : 'https';

  return { host, origin: `${scheme}://${host}`, isLocal };
}
