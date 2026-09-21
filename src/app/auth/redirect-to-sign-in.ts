import 'server-only';

import { NextResponse } from 'next/server';

import { SIGN_IN_ROUTE, safeReturnPath } from '@/components/raisonne/auth/routes';

/**
 * The one sign-in page, reached from every name it has ever had.
 *
 * orkhan.art had /auth/signin and /auth/signup; other installs and other
 * habits reach for /signin. All of them land on /auth, carrying whatever
 * return path they were given, so a bookmark from five years ago still works
 * and there is only ever one page to keep right.
 *
 * 308 rather than 302: the old names are gone for good, and a permanent
 * redirect is what tells a browser and a crawler so.
 *
 * The Location is a path and not a full address, on purpose. Inside a Route
 * Handler request.url carries the address the server is bound to rather than
 * the one the visitor typed, so building an absolute URL from it sends every
 * visitor of a deployed install to http://0.0.0.0:3000/auth. A relative
 * Location is allowed (RFC 7231 section 7.1.2), every browser resolves it
 * against the address it asked for, and it cannot name the wrong host.
 */
export function redirectToSignIn(request: Request): NextResponse {
  const incoming = new URL(request.url);
  const next = safeReturnPath(incoming.searchParams.get('next') ?? incoming.searchParams.get('redirect'));
  const target = next ? `${SIGN_IN_ROUTE}?next=${encodeURIComponent(next)}` : SIGN_IN_ROUTE;
  return new NextResponse(null, {
    status: 308,
    headers: { Location: target, 'Cache-Control': 'no-store' },
  });
}
