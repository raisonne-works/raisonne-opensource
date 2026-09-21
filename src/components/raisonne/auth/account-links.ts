import { collectorHref } from '@/components/raisonne/collectors/lib';

/**
 * Where being signed in takes you.
 *
 * Separate from routes.ts because the proxy imports that file and would
 * otherwise carry the collectors package into its bundle for the sake of one
 * href.
 *
 * Only pages that exist are listed. An account menu with four entries, three
 * of which answer 404, is worse than a menu with two that work. These routes
 * belong to the collectors and store packages; this one only links to them.
 */

export interface AccountLink {
  href: string;
  label: string;
  /** One line under the label, in the menu and in the signed-in panel. */
  description: string;
}

export const COLLECTOR_LINKS: AccountLink[] = [
  { href: '/collector', label: 'My collection', description: 'Everything you hold, your tier and your badges.' },
  { href: '/orders', label: 'Orders', description: 'What you have bought from the shop.' },
];

/** The signed-in collector's own public page, which needs their address to build. */
export function publicProfileLink(address: string): AccountLink {
  return {
    href: collectorHref(address),
    label: 'My public page',
    description: 'What anyone else sees about this wallet.',
  };
}

/**
 * Pages only the artist sees.
 *
 * The update page is the one owner surface that always exists: every install
 * runs some version of Raisonne, and the artist is the only person who should
 * pull a newer one. Other owner tools (import, design system) stay under
 * RAISONNE_TOOLS and are linked from the footer when that is on.
 */
export const OWNER_LINKS: AccountLink[] = [
  {
    href: '/update',
    label: 'Update Raisonne',
    description: 'Check for a newer release of the app and pull it in.',
  },
];
