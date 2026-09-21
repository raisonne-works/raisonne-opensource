import { NextResponse } from 'next/server';

import { endSession, getSession, renewSession, requireSessionJson } from '@/lib/auth/guards';
import { getCollector } from '@/lib/chain/holdings';
import { getSettings } from '@/fixtures';
import { isConfigured } from '@/lib/config';

/**
 * /api/auth/session
 *
 *  GET     what the session is, or that there is none
 *  POST    extend a session that is still good (rotation)
 *  DELETE  sign out
 *
 * The session itself is an httpOnly cookie, so nothing in the browser can
 * read it. This route is how a page that has been open for a while finds out
 * whether it is still signed in, and how it stays signed in while somebody
 * is using it: the account menu asks to renew when the session is more than
 * halfway through its life, and a 401 tells it to stop pretending.
 *
 * Rotation can only happen in a route handler, because a server component
 * cannot set a cookie. That is the whole reason POST exists.
 */

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ signedIn: false, configured: isConfigured('accounts') }, { headers: NO_STORE });
  }
  const collector = getCollector(session.address);
  return NextResponse.json(
    {
      signedIn: true,
      configured: true,
      address: session.address,
      role: session.role,
      expiresAt: session.expiresAt,
      ens: collector?.ens ?? null,
      // Whether this install publishes a page per wallet. The account menu
      // offers "my public page" only when there is one, rather than a link
      // to a page nobody else can open.
      publicProfiles: getSettings().publicCollectorProfiles === true,
    },
    { headers: NO_STORE },
  );
}

export async function POST(request: Request) {
  const check = await requireSessionJson();
  if (!check.ok) return check.response;

  await renewSession(check.session, request);

  // renewSession writes a fresh cookie; what is reported is the session as it
  // will be on the next request, so the menu's countdown does not lag a turn.
  const session = (await getSession()) ?? check.session;
  return NextResponse.json(
    { signedIn: true, address: session.address, role: session.role, expiresAt: session.expiresAt },
    { headers: NO_STORE },
  );
}

export async function DELETE(request: Request) {
  await endSession(request);
  return NextResponse.json({ ok: true, signedIn: false }, { headers: NO_STORE });
}
