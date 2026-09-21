'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import type { SessionRole } from '@/lib/types';

import { AccountMenu } from './account-menu';
import { COLLECTOR_LINKS, OWNER_LINKS } from './account-links';
import { signInUrl } from './routes';
import { onSessionChange } from './session-events';

/**
 * The header's account corner: a Sign in button, or the account menu.
 *
 * It asks the server who is signed in rather than being told by the layout,
 * and that is deliberate. Reading the session cookie in the root layout
 * would make every page on the site dynamic, and this catalogue prerenders
 * thousands of them. One small request per visit, against a page that is
 * still served from the edge, is the better trade.
 *
 * `enabled` comes from the install's own data, which is static, so an
 * install with collectors switched off makes no request at all and shows no
 * account anything.
 *
 * Nothing is shown while the answer is unknown, and nothing is shown when
 * sign-in is not configured: a Sign in button that cannot work is worse than
 * no button. The /auth page still explains what is missing to whoever goes
 * looking for it.
 */

type State =
  | { status: 'unknown' }
  | { status: 'signed-out'; configured: boolean }
  | {
      status: 'signed-in';
      address: string;
      ens: string | null;
      role: SessionRole;
      expiresAt: number;
      publicProfiles: boolean;
    };

interface SessionBody {
  signedIn?: boolean;
  configured?: boolean;
  address?: string;
  ens?: string | null;
  role?: SessionRole;
  expiresAt?: number;
  publicProfiles?: boolean;
}

export function AccountSlot({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  const [state, setState] = useState<State>({ status: 'unknown' });

  const read = useCallback(async () => {
    if (!enabled) return;
    try {
      const response = await fetch('/api/auth/session', { cache: 'no-store' });
      const body = (await response.json().catch(() => null)) as SessionBody | null;
      if (body?.signedIn && typeof body.address === 'string' && typeof body.expiresAt === 'number') {
        setState({
          status: 'signed-in',
          address: body.address,
          ens: body.ens ?? null,
          role: body.role === 'owner' ? 'owner' : 'collector',
          expiresAt: body.expiresAt,
          publicProfiles: body.publicProfiles === true,
        });
        return;
      }
      setState({ status: 'signed-out', configured: body?.configured === true });
    } catch {
      // The header is not the place to report that a fetch failed. Leaving it
      // unknown shows nothing, which is honest.
      setState({ status: 'unknown' });
    }
  }, [enabled]);

  useEffect(() => {
    const recheck = () => void read();
    recheck();
    const stop = onSessionChange(recheck);
    window.addEventListener('focus', recheck);
    return () => {
      stop();
      window.removeEventListener('focus', recheck);
    };
  }, [read]);

  if (!enabled || state.status === 'unknown') return null;

  if (state.status === 'signed-out') {
    if (!state.configured) return null;
    return (
      <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={signInUrl(pathname)} />}>
        Sign in
      </Button>
    );
  }

  return (
    <AccountMenu
      address={state.address}
      ens={state.ens}
      role={state.role}
      expiresAt={state.expiresAt}
      links={COLLECTOR_LINKS}
      ownerLinks={OWNER_LINKS}
      publicProfile={state.publicProfiles}
      onSignedOut={() => setState({ status: 'signed-out', configured: true })}
    />
  );
}
