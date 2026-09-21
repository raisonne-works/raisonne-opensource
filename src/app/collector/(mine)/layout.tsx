import { getSettings } from '@/fixtures';
import { requireSession } from '@/lib/auth/guards';
import { surfaceState } from '@/lib/config';

/**
 * The sign-in gate for the collector's own page, and only that page.
 *
 * Why it is here rather than in the page: loading.tsx turns this segment into
 * a streamed shell, and a shell goes out with its 200 before the page runs.
 * A redirect() inside the page therefore arrives after the status line has
 * already been sent, so a visitor with no valid session got 200 and a
 * redirect delivered inside the stream. The browser still ends up at /auth,
 * but the status was a lie, and anything that reads status codes (a monitor,
 * a crawler, a test) was told the page had rendered. Held here, above the
 * boundary, the redirect is a real 307.
 *
 * Why a route group: /collector/<address> is a PUBLIC profile and shares the
 * parent layout at src/app/collector/layout.tsx, which is where the module
 * gate belongs. Putting a session gate there would have hidden every public
 * profile behind sign-in. The (mine) group covers /collector alone and
 * changes no URL.
 *
 * The unconfigured case is deliberately let through: with no session secret
 * nobody can sign in at all, and the page answers that with a setup panel
 * naming the variable, which is more use than bouncing an installer to a
 * sign-in page that cannot work either.
 */
export default async function OwnCollectorLayout({ children }: { children: React.ReactNode }) {
  if (surfaceState(getSettings(), 'collectors') !== 'unconfigured') {
    await requireSession({ next: '/collector' });
  }
  return children;
}
