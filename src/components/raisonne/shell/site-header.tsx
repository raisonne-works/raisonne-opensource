import Link from 'next/link';
import type { ReactNode } from 'react';

import type { Artist } from '@/lib/types';

import { HideOnBareRoute } from './bare-shell';
import type { NavGroup } from './nav';
import { Container } from './page';
import { MainNav, MobileNav, PackLinks } from './site-nav';
import { ThemeToggle } from './theme-toggle';

/**
 * Quiet chrome: the artist's name as the home link, the grouped navigation,
 * the account slot and the theme toggle. Solid background and a hairline, no
 * blur.
 *
 * On a bare route the navigation is left out, and so is the account. A page
 * whose message is that the catalogue is closed should not offer working
 * links to every part of it; the wordmark and the theme toggle are all that
 * stay.
 *
 * `account` and `cart` are slots rather than components the header knows
 * about, so the shell carries no sign-in code and no shop code, and an
 * install with collectors and the store switched off renders a header with
 * nothing extra in it.
 */
export function SiteHeader({
  artist,
  groups,
  account,
  cart,
  packLinks = [],
}: {
  artist: Artist;
  groups: NavGroup[];
  /** Usually <AccountSlot />. Sits between the navigation and the theme toggle. */
  account?: ReactNode;
  /** Usually <CartSlot />. Only an install that sells something passes one. */
  cart?: ReactNode;
  /** Links only a design pack shows, beside the menus. Hidden in skin zero. */
  packLinks?: { href: string; label: string }[];
}) {
  return (
    <header data-shell="header" className="sticky top-0 z-40 border-b bg-background print:hidden">
      <Container className="flex h-14 items-center gap-2">
        <Link
          href="/"
          className="-mx-1.5 min-w-0 truncate rounded-md px-1.5 py-1 text-base font-semibold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {artist.name}
        </Link>
        <div className="ml-auto flex items-center gap-1">
          {packLinks.length > 0 ? (
            <HideOnBareRoute>
              <PackLinks links={packLinks} />
            </HideOnBareRoute>
          ) : null}
          <HideOnBareRoute>
            <MainNav groups={groups} className="hidden md:flex" />
          </HideOnBareRoute>
          {account ? <HideOnBareRoute>{account}</HideOnBareRoute> : null}
          {cart ? <HideOnBareRoute>{cart}</HideOnBareRoute> : null}
          <ThemeToggle />
          <HideOnBareRoute>
            <MobileNav groups={groups} title={artist.name} description={artist.tagline} className="md:hidden" />
          </HideOnBareRoute>
        </div>
      </Container>
    </header>
  );
}
