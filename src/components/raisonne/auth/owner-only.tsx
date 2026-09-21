'use client';

import { useSession } from './use-session';

/**
 * Renders its children only for the artist.
 *
 * There are a handful of blocks on this site that are addressed to whoever
 * installed it rather than to whoever is reading it: the importer and the
 * design system in the footer, the note that says which variable the
 * newsletter needs, the panel naming Stripe's keys. Published to everyone,
 * those read as a stranger's deployment notes on a page that should be
 * showing them the work, and one of them ("Nobody else sees this block")
 * asserted the opposite of what was happening.
 *
 * The install already knows who the artist is: an address on
 * RAISONNE_OWNER_ADDRESSES, in a signed session cookie. This asks, in the
 * browser, so the page above it can stay static.
 *
 * Nothing sensitive may be passed as children, because a client component's
 * props travel to every browser whether they render or not. Anything secret
 * is fetched from an owner-gated route instead: see InstallerPanel.
 */
export function OwnerOnly({ children }: { children: React.ReactNode }) {
  const session = useSession();
  return session.status === 'signed-in' && session.role === 'owner' ? <>{children}</> : null;
}
