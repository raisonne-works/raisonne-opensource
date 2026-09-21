import { NextResponse, type NextRequest } from 'next/server';

import { SESSION_COOKIE_NAME, isProtectedPath, safeReturnPath, signInUrl } from '@/components/raisonne/auth/routes';

/**
 * The one file that runs before a page renders.
 *
 * Next 16 accepts src/proxy.ts and not src/middleware.ts, and it refuses to
 * build when both exist. Two things need to happen before a request reaches
 * a page, so both live here, in order: maintenance mode, then the collector
 * gate. Anything else added later belongs in this file too.
 *
 * 1. MAINTENANCE MODE
 *
 * While it is on, every address answers with /maintenance instead of the
 * catalogue. Two switches, in order:
 *
 *  a. RAISONNE_MAINTENANCE=1 or 0, set on the server.
 *  b. settings.maintenance.enabled in the data, which next.config.ts reads at
 *     build and passes in as RAISONNE_MAINTENANCE_FROM_DATA.
 *
 * The proxy reads no files. It runs before every request, and a proxy that
 * touches the filesystem makes the build trace the whole project into the
 * server output. The data is a build artefact here anyway (4,000 pages are
 * prerendered from it), so reading the flag at build is the honest place;
 * the environment variable is what closes the site without a rebuild. It is
 * read at build as well, so set it for both: RAISONNE_MAINTENANCE=1 pnpm
 * build && RAISONNE_MAINTENANCE=1 pnpm start.
 *
 * robots.txt, sitemap.xml and the manifest are deliberately outside the
 * matcher. They answer for themselves while the site is closed: robots
 * disallows everything and the sitemap is empty, which is what a crawler
 * arriving during an outage should be told.
 *
 * 2. THE COLLECTOR GATE
 *
 * A visitor with no session cookie is sent to /auth before a gated page is
 * rendered, carrying where they were going so they land back there.
 *
 * What this deliberately does not do is decide whether the cookie is real.
 * It checks that one is present, nothing more. Verifying the signature means
 * reading RAISONNE_SESSION_SECRET and running HMAC, which belongs on the
 * page, where requireSession() and requireOwner() already do it on every
 * request. A forged or expired cookie therefore gets past this file and is
 * turned away one step later, which is the same outcome by a slightly longer
 * road. Nothing here is what makes a page safe.
 *
 * The gate list is PROTECTED_ROUTES in components/raisonne/auth/routes.ts:
 * /collector exactly, and /orders/<id> as a prefix. /collector/<address> is
 * a public profile and /orders renders its own signed-out state, so neither
 * is gated. A package adding a gated route adds it there.
 */

const MAINTENANCE_PATH = '/maintenance';

function flag(value: string | undefined): boolean | null {
  const text = value?.trim().toLowerCase();
  if (text === '1' || text === 'true') return true;
  if (text === '0' || text === 'false') return false;
  return null;
}

function maintenanceEnabled(): boolean {
  return flag(process.env.RAISONNE_MAINTENANCE) ?? flag(process.env.RAISONNE_MAINTENANCE_FROM_DATA) ?? false;
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;

  // The maintenance page itself, and nothing else, is served as it is.
  const onMaintenancePage = pathname === MAINTENANCE_PATH || pathname.startsWith(`${MAINTENANCE_PATH}/`);
  if (!onMaintenancePage && maintenanceEnabled()) {
    const url = request.nextUrl.clone();
    url.pathname = MAINTENANCE_PATH;
    url.search = '';

    // Temporary on purpose: a permanent redirect would be cached by browsers
    // long after the site came back.
    const response = NextResponse.redirect(url, 307);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }

  if (isProtectedPath(pathname) && !request.cookies.has(SESSION_COOKIE_NAME)) {
    const back = safeReturnPath(`${pathname}${search}`);
    const target = new URL(signInUrl(back), request.nextUrl);
    const response = NextResponse.redirect(target);
    // A gated page's redirect is about this one visitor and this one moment.
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /**
     * Everything except Next's own assets and any address that ends in a file
     * extension. That leaves robots.txt, sitemap.xml, the manifest, the app
     * icon and the static files answering while the site is closed.
     *
     * Broad because maintenance mode has to catch every address. The gated
     * routes (/collector, /orders/<id>) fall inside it, so the collector gate
     * needs no matcher of its own.
     */
    '/((?!_next/|.*\\.(?:txt|xml|json|webmanifest|ico|png|jpg|jpeg|gif|webp|avif|svg|css|js|mjs|map|woff|woff2|ttf|otf|mp4|webm|mp3|pdf)$).*)',
  ],
};
