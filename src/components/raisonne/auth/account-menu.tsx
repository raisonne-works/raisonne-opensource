'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { CheckIcon, CopyIcon, LogOutIcon, PaletteIcon } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { shortAddress } from '@/components/raisonne/works/lib';
import type { SessionRole } from '@/lib/types';
import { cn } from '@/lib/utils';

import { signOutTo } from './actions';
import { type AccountLink, publicProfileLink } from './account-links';
import { signInUrl } from './routes';
import { announceSessionChange } from './session-events';

/**
 * Who is signed in, in the header.
 *
 * The button is the person's name for themselves: their ENS if the install
 * resolved one, otherwise the short form of the address. The menu underneath
 * is the only navigation to the collector pages, so they stay out of the
 * site's own menu, where they would be four dead links for everyone who is
 * not signed in.
 *
 * Two quiet jobs besides the links. It keeps an active session alive, by
 * asking the server to rotate the cookie once the session is more than
 * halfway through its life, so somebody reading a long page is not signed
 * out under them. And when the server says the session has gone, it says so
 * and offers the way back in, rather than showing an address that no longer
 * means anything.
 */

export interface AccountMenuProps {
  address: string;
  ens: string | null;
  role: SessionRole;
  /** Whether this install publishes a page per wallet. */
  publicProfile?: boolean;
  /** Unix seconds. Used to decide when to ask for a rotation. */
  expiresAt: number;
  links: AccountLink[];
  ownerLinks: AccountLink[];
  /** Lets the header drop the menu the moment sign-out starts, before the redirect lands. */
  onSignedOut?: () => void;
}

export function AccountMenu({ address, ens, role, publicProfile = false, expiresAt, links, ownerLinks, onSignedOut }: AccountMenuProps) {
  const pathname = usePathname();
  const [expired, setExpired] = useState(false);
  const [copied, setCopied] = useState(false);
  const [signingOut, startSignOut] = useTransition();
  const deadline = useRef(expiresAt);

  useEffect(() => {
    deadline.current = expiresAt;
  }, [expiresAt]);

  /** Rotate the cookie once the session is inside its last half hour, and not before. */
  const keepAlive = useCallback(async () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    if (deadline.current * 1000 - Date.now() > RENEW_WITHIN_MS) return;

    try {
      const response = await fetch('/api/auth/session', { method: 'POST', cache: 'no-store' });
      if (response.status === 401 || response.status === 503) {
        setExpired(true);
        return;
      }
      const body = (await response.json().catch(() => null)) as { expiresAt?: number } | null;
      if (typeof body?.expiresAt === 'number') {
        deadline.current = body.expiresAt;
        setExpired(false);
      }
    } catch {
      // Offline, or the server is restarting. The cookie is still valid for
      // now, so nothing is claimed either way and the next try will tell.
    }
  }, []);

  useEffect(() => {
    const recheck = () => void keepAlive();
    recheck();
    const timer = window.setInterval(recheck, 60_000);
    document.addEventListener('visibilitychange', recheck);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', recheck);
    };
  }, [keepAlive]);

  const label = ens ?? shortAddress(address);

  if (expired) {
    return (
      <Button variant="outline" size="sm" nativeButton={false} render={<Link href={signInUrl(pathname, 'expired')} />}>
        Session ended, sign in
      </Button>
    );
  }

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            aria-label={role === 'owner' ? `Artist account: ${label}` : `Account: ${label}`}
          />
        }
      >
        <Avatar className="size-5">
          <AvatarFallback className="text-[0.625rem]" style={avatarStyle(address)}>
            {initials(address)}
          </AvatarFallback>
        </Avatar>
        {/* A word, not just a circle. At 390 the avatar sat in a row of four
            equal icons and read as decoration, where a signed-out visitor
            gets the word "Sign in". And the artist was indistinguishable
            from a collector anywhere on the site: the role now shows in the
            header rather than only inside a menu nobody has opened. */}
        <span className="sm:hidden">{role === 'owner' ? 'Artist' : 'Account'}</span>
        <span className="hidden max-w-32 truncate sm:inline">{label}</span>
        {role === 'owner' ? (
          <Badge variant="secondary" className="hidden font-normal sm:inline-flex">
            Artist
          </Badge>
        ) : null}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-1">
            <span className="truncate font-medium">{label}</span>
            {ens ? <span className="font-mono text-xs text-muted-foreground">{shortAddress(address)}</span> : null}
            {role === 'owner' ? (
              <Badge variant="secondary" className="mt-1 w-fit">
                <PaletteIcon aria-hidden data-icon="inline-start" />
                Artist
              </Badge>
            ) : null}
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          {[...links, ...(publicProfile ? [publicProfileLink(address)] : [])].map(link => (
            <DropdownMenuItem key={link.href} render={<Link href={link.href} />}>
              {link.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>

        {role === 'owner' && ownerLinks.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {ownerLinks.map(link => (
                <DropdownMenuItem key={link.href} render={<Link href={link.href} />}>
                  {link.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </>
        ) : null}

        <DropdownMenuSeparator />

        <DropdownMenuItem closeOnClick={false} onClick={() => void copyAddress()}>
          {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
          {copied ? 'Address copied' : 'Copy address'}
        </DropdownMenuItem>

        <DropdownMenuItem
          disabled={signingOut}
          onClick={() => {
            // The header drops the menu now; the action then clears the
            // cookie and redirects. Waiting for the round trip would leave an
            // address on screen that is already on its way out.
            onSignedOut?.();
            announceSessionChange();
            startSignOut(() => void signOutTo(pathname));
          }}
          className={cn(signingOut && 'opacity-70')}
        >
          {signingOut ? <Spinner aria-hidden className="size-4" /> : <LogOutIcon aria-hidden />}
          {signingOut ? 'Signing out' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * How close to the end a session has to be before it is worth rotating.
 *
 * The cookie does not tell the browser when it was issued, so "halfway
 * through" is approximated by a fixed window. At the default hour-long
 * session that is the second half of it, and at a longer one it simply means
 * the last half hour, which is the part that matters.
 */
const RENEW_WITHIN_MS = 30 * 60_000;

/**
 * Two characters from the address, so an avatar is never an empty circle.
 *
 * From the end, not the beginning. The leading characters after 0x are the
 * least distinctive part of an address, and on a set of demo or vanity
 * addresses they are often identical: eight collectors all showed "00".
 */
function initials(address: string): string {
  return address.slice(-2).toUpperCase();
}

/**
 * A colour derived from the address itself. Not an identicon: just enough
 * difference that two wallets in the same browser do not look identical.
 */
function avatarStyle(address: string): { backgroundColor: string; color: string } {
  let hash = 0;
  for (let index = 2; index < address.length; index += 1) hash = (hash * 31 + address.charCodeAt(index)) % 360;
  return { backgroundColor: `oklch(0.86 0.06 ${hash})`, color: `oklch(0.28 0.04 ${hash})` };
}
