import Link from 'next/link';

import { OwnerOnly } from '@/components/raisonne/auth/owner-only';
import { ArtistLinkList, groupLinks } from '@/components/raisonne/profile/artist-links';
import { NewsletterForm } from '@/components/raisonne/landing/newsletter-form';
import { addressExplorerUrl, CHAIN_LABELS, shortAddress } from '@/components/raisonne/works/lib';
import { Badge } from '@/components/ui/badge';
import type { Artist, Landing, SiteSettings } from '@/lib/types';
import { newsletterState } from '@/lib/newsletter';
import { cn } from '@/lib/utils';

import { CopyButton } from './copy-button';
import { BackToTop, FooterShell } from './footer-modes';
import { type NavGroup, DOCS_NAV, TOOLS_NAV } from './nav';
import { Container } from './page';

const linkClass =
  'rounded-sm text-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50';

/**
 * The quiet end of every page: who the artist is, everywhere else they are,
 * where the work can be collected, the wallets this catalogue is built from,
 * the sign-up, and, for the artist alone, the way into their own tools.
 *
 * "For the artist alone" is now literal. Two blocks here are addressed to
 * whoever installed the site rather than whoever is reading it: the tools
 * nav and, when there is nowhere to send an address, the newsletter block
 * with its setup note. Both render inside OwnerOnly, which asks the session
 * in the browser so this footer can stay in a static layout.
 *
 * The columns are balanced rather than grouped by where the data came from.
 * A single tall column holding four different things beside four columns of
 * three links each left two thirds of an 820 px footer empty, so each group
 * is now its own column, "More" is folded into Artist where its one link
 * belongs, and the minting addresses, which are a table and not a link list,
 * get a row of their own.
 *
 * How it ends the page is the route's choice: FooterShell reads the mode
 * from the path (see nav.ts), so a browsing page can keep the footer behind
 * a bar and the CV can do without one.
 */
export function SiteFooter({
  artist,
  groups = [],
  settings,
  newsletter = null,
  tools = false,
  demoData = false,
}: {
  artist: Artist;
  /** The same navigation the header shows, so every page is reachable from the bottom too. */
  groups?: NavGroup[];
  settings?: SiteSettings | null;
  /** The sign-up block from the landing data; null hides the form. */
  newsletter?: Landing['newsletter'];
  /** Show the artist's own tools (import, design system). */
  tools?: boolean;
  /** This install is still showing the bundled demo artist. */
  demoData?: boolean;
}) {
  const year = new Date().getFullYear();
  const { social, marketplace } = groupLinks(artist.links);
  const signUp = newsletter === null ? 'off' : newsletterState(settings);
  const legal = settings?.legal;
  const navColumns = footerColumns(groups);

  return (
    <FooterShell>
      <Container className="flex flex-col gap-10 py-10 md:py-12">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col items-start gap-1">
            <p className="text-base font-semibold tracking-tight">{artist.name}</p>
            {artist.tagline ? <p className="max-w-prose text-sm text-muted-foreground">{artist.tagline}</p> : null}
            {artist.location ? <p className="text-sm text-muted-foreground">{artist.location}</p> : null}
            {artist.email ? (
              <a href={`mailto:${artist.email}`} className={cn(linkClass, 'mt-1')}>
                {artist.email}
              </a>
            ) : null}
            {demoData ? (
              <Badge variant="outline" className="mt-2">
                Demo data
              </Badge>
            ) : null}
          </div>

          {/* A sign-up that works is for everybody. A sign-up with nowhere
              to send an address is for the artist alone: a form that quietly
              drops what a visitor types into it is worse than no form, and
              the note beside it names a variable nobody else needs to read. */}
          {signUp === 'on' && newsletter ? (
            <div className="w-full max-w-sm">
              <NewsletterForm title={newsletter.title} description={newsletter.description} source="footer" />
            </div>
          ) : null}
          {signUp === 'unconfigured' && newsletter ? (
            <OwnerOnly>
              <div className="w-full max-w-sm">
                <NewsletterForm
                  title={newsletter.title}
                  description={newsletter.description}
                  source="footer"
                  setupNote
                />
              </div>
            </OwnerOnly>
          ) : null}
        </div>

        {/* Four even columns, each one group. Two across on a phone, so the
            footer is not longer than the page above it. */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-8 md:grid-cols-4">
          {navColumns.length > 0 ? (
            <nav aria-label="Footer" className="contents">
              {navColumns.map(group => (
                <div key={group.id} className="flex flex-col gap-3">
                  <h2 className="text-sm font-medium">{group.label}</h2>
                  <ul className="flex flex-col gap-2">
                    {group.items.map(item => (
                      <li key={item.href}>
                        <Link href={item.href} className={linkClass}>
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          ) : null}

          {social.length > 0 ? (
            <div className="flex flex-col gap-3">
              <h2 id="footer-elsewhere" className="text-sm font-medium">
                Elsewhere
              </h2>
              <ArtistLinkList links={social} labelledBy="footer-elsewhere" className="flex flex-col gap-0.5" />
            </div>
          ) : null}

          {marketplace.length > 0 ? (
            <div className="flex flex-col gap-3">
              <h2 id="footer-collect" className="text-sm font-medium">
                Where to collect
              </h2>
              <ArtistLinkList links={marketplace} labelledBy="footer-collect" className="flex flex-col gap-0.5" />
            </div>
          ) : null}

          {/* Public how-to — everyone. Owner workbench stays OwnerOnly below. */}
          <nav aria-labelledby="footer-docs-title" className="flex flex-col gap-3">
            <h2 id="footer-docs-title" className="text-sm font-medium">
              Raisonne
            </h2>
            <ul className="flex flex-col gap-2">
              <li>
                <Link href={DOCS_NAV.href} className={linkClass}>
                  {DOCS_NAV.label}
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/orkhan-art-web/raisonne-os"
                  className={linkClass}
                  target="_blank"
                  rel="noreferrer"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </nav>

          {/* The importer and the design system are the artist's own tools.
              Shown to the owner session and to nobody else. */}
          {tools ? (
            <OwnerOnly>
              <nav aria-labelledby="footer-tools-title" className="flex flex-col gap-3">
                <h2 id="footer-tools-title" className="text-sm font-medium">
                  For the artist
                </h2>
                <ul className="flex flex-col gap-2">
                  {TOOLS_NAV.map(item => (
                    <li key={item.href}>
                      <Link href={item.href} className={linkClass}>
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </OwnerOnly>
          ) : null}
        </div>

        {artist.wallets.length > 0 ? (
          <div className="flex flex-col gap-3 border-t pt-8">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <h2 className="text-sm font-medium">Minting addresses</h2>
              <Link href="/about#minting-addresses" className={linkClass}>
                How to check an address
              </Link>
            </div>
            <ul className="grid gap-x-8 gap-y-1.5 sm:grid-cols-2 xl:grid-cols-3">
              {artist.wallets.map(wallet => (
                <li key={`${wallet.chain}:${wallet.address}`} className="flex min-w-0 items-center gap-2">
                  <span className="w-18 shrink-0 text-sm text-muted-foreground">{CHAIN_LABELS[wallet.chain]}</span>
                  <a
                    href={addressExplorerUrl(wallet.chain, wallet.address)}
                    title={wallet.address}
                    className={cn(linkClass, 'font-mono text-xs text-foreground')}
                  >
                    <span aria-hidden="true">{shortAddress(wallet.address)}</span>
                    <span className="sr-only">
                      {CHAIN_LABELS[wallet.chain]} wallet {wallet.address} on a block explorer
                    </span>
                  </a>
                  <CopyButton value={wallet.address} label={`Copy ${CHAIN_LABELS[wallet.chain]} address`} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Container>

      <div className="border-t">
        <Container className="flex flex-col gap-2 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {year} {artist.name}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {legal?.privacy ? (
              <Link href="/privacy" className={linkClass}>
                Privacy
              </Link>
            ) : null}
            {legal?.terms ? (
              <Link href="/terms" className={linkClass}>
                Terms
              </Link>
            ) : null}
            {/* Plain text until the open-source repository has a public home. */}
            <Link href="/docs" className={linkClass}>
              Docs
            </Link>
            <a
              href="https://github.com/orkhan-art-web/raisonne-os"
              className={linkClass}
              target="_blank"
              rel="noreferrer"
            >
              Built with Raisonne
            </a>
            <BackToTop className="-mr-2.5" />
          </div>
        </Container>
      </div>
    </FooterShell>
  );
}


/**
 * The footer's link columns. "More" is usually one standalone page, and a
 * column with a single link in it under a heading called More says nothing,
 * so it joins the Artist column where a commissions page belongs anyway.
 */
function footerColumns(groups: readonly NavGroup[]): NavGroup[] {
  const columns: NavGroup[] = [];
  for (const group of groups) {
    if (group.items.length === 0) continue;
    const foldInto = group.id === 'more' ? columns.find(column => column.id === 'artist') : undefined;
    if (foldInto) {
      foldInto.items = [...foldInto.items, ...group.items];
      continue;
    }
    columns.push({ ...group, items: [...group.items] });
  }
  return columns;
}
