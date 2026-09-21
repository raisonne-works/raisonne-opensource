import { isModuleEnabled } from '@/lib/records';
import type { SiteData } from '@/lib/types';

/**
 * The site's navigation, worked out from the install's own data.
 *
 * Two rules decide what a visitor sees: a module that is switched off in
 * settings never appears, and neither does a section with nothing in it. A
 * catalogue with no writings has no Writings entry, so no visitor ever lands
 * on an empty page.
 *
 * Pure and client-safe: the header computes the groups on the server and
 * hands the plain objects to the menu.
 */

export interface NavItem {
  href: string;
  label: string;
  /** One line under the label in the desktop menu and the mobile sheet. */
  description?: string;
  /** Live count, shown beside the label. */
  count?: number;
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

/** Owner workbench links (import, design system). Docs is public — see DOCS_NAV. */
export const TOOLS_NAV = [
  { href: '/import', label: 'Import' },
  { href: '/design-system', label: 'Design system' },
] as const;

/** Always-on public how-to. Safe to show every visitor. */
export const DOCS_NAV = { href: '/docs', label: 'Docs' } as const;

/** A nav item is current on its own route and on every route below it. */
export function isActivePath(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** True when any item in the group is the current page. */
export function isActiveGroup(pathname: string | null, group: NavGroup): boolean {
  return group.items.some(item => isActivePath(pathname, item.href));
}

/** Every item of every group, in order: the flat list the mobile sheet shows. */
export function navItems(groups: readonly NavGroup[]): NavItem[] {
  return groups.flatMap(group => group.items);
}

/** Drops the entries a rule ruled out. */
function compact(items: (NavItem | null)[]): NavItem[] {
  return items.filter((item): item is NavItem => item !== null);
}

/**
 * The grouped navigation for this install: Catalogue (the records), Artist
 * (the person), and the standalone pages a module adds.
 */
export function siteNav(
  data: SiteData,
  /** Counts the data itself cannot answer, read from the optional fixtures by the caller. */
  extras: { shopProducts?: number } = {},
): NavGroup[] {
  const { settings } = data;
  const installations = data.installations.length + data.immersives.length;
  const hasCatalogue = data.series.length > 0 || data.works.length > 0;
  const hasCv =
    data.cv !== null ||
    data.exhibitions.length > 0 ||
    data.awards.length > 0 ||
    data.press.length > 0 ||
    Boolean(data.artist.bio) ||
    Boolean(data.artist.statement);

  // The count beside a label has to be the thing the label names: this said
  // 29 next to Works on an install that holds 3,914 of them.
  const works = data.works.filter(work => !work.hidden).length;

  /**
   * What the shop has for sale, hidden products left out, phygitals counted.
   *
   * An install can keep its shop in a file of its own (local/store.json),
   * which this pure function cannot read, so the count may be handed in. The
   * fallback reads whatever the catalogue data itself carries.
   */
  const shopProducts = isModuleEnabled(settings, 'store')
    ? (extras.shopProducts ??
      (data.store?.products ?? []).filter(product => !product.hidden).length +
        (data.store?.phygitals ?? []).filter(product => !product.hidden).length)
    : 0;

  const catalogue = compact([
    hasCatalogue
      ? {
          href: '/works',
          label: 'Works',
          description: 'Every series and every token.',
          count: works || data.series.length,
        }
      : null,
    installations > 0
      ? {
          href: '/installations',
          label: 'Installations',
          description: 'Rooms, screens and immersive pieces.',
          count: installations,
        }
      : null,
    data.physicalWorks.length > 0
      ? {
          href: '/physical-works',
          label: 'Physical works',
          description: 'Works that exist as objects.',
          count: data.physicalWorks.length,
        }
      : null,
    data.exhibitions.length > 0
      ? {
          href: '/exhibitions',
          label: 'Exhibitions',
          description: 'Shows, solo and group.',
          count: data.exhibitions.length,
        }
      : null,
    data.collaborations.length > 0
      ? {
          href: '/collaborations',
          label: 'Collaborations',
          description: 'Projects made with others.',
          count: data.collaborations.length,
        }
      : null,
    data.awards.length > 0
      ? { href: '/awards', label: 'Awards', description: 'Prizes and nominations.', count: data.awards.length }
      : null,
    data.writings.length > 0 && isModuleEnabled(settings, 'writings')
      ? { href: '/writings', label: 'Writings', description: 'Papers and essays.', count: data.writings.length }
      : null,
  ]);

  const artist = compact([
    { href: '/about', label: 'About', description: `Who ${data.artist.name} is and how the work is made.` },
    hasCv ? { href: '/cv', label: 'CV', description: 'The full record, ready to print.' } : null,
    data.press.length > 0
      ? { href: '/press', label: 'Press', description: 'Articles, interviews and talks.', count: data.press.length }
      : null,
  ]);

  const standalone = compact([
    data.commissions !== null && isModuleEnabled(settings, 'commissions')
      ? { href: '/commissions', label: 'Commissions', description: 'Working together.' }
      : null,
    // Insights follows the module switch alone. Whether there is a chain
    // snapshot to read lives in a file this pure function cannot see, and the
    // page answers that itself: with no snapshot it prints the panel naming
    // the command to run, which is a page worth reaching.
    isModuleEnabled(settings, 'insights')
      ? { href: '/insights', label: 'Insights', description: 'What the chain says about the work.' }
      : null,
    // The shop needs both: the module on, and something in it. A switched-on
    // store with no products is an empty room, and the rule here is that a
    // link leads somewhere.
    shopProducts > 0
      ? { href: '/shop', label: 'Shop', description: 'Prints, books and objects.', count: shopProducts }
      : null,
  ]);

  return [
    { id: 'catalogue', label: 'Catalogue', items: catalogue },
    { id: 'artist', label: 'Artist', items: artist },
    { id: 'more', label: 'More', items: standalone },
  ].filter(group => group.items.length > 0);
}

// ---------------------------------------------------------------------------
// Footer modes
// ---------------------------------------------------------------------------

/**
 * How a route ends.
 *
 *  - `flow`: the footer sits at the bottom of the document, as usual.
 *  - `panel`: a bar at the bottom of the window opens the footer over the
 *    page; scrolling up, Escape or the close button puts it away. Browsing
 *    pages use it so a long grid is not interrupted by the footer.
 *  - `off`: no footer at all. The CV is a document, and a printed CV should
 *    not carry site chrome.
 */
export type FooterMode = 'flow' | 'panel' | 'off';

/** Routes that end in something other than the default flow, longest match first. */
const FOOTER_MODES: { prefix: string; exact?: boolean; mode: FooterMode }[] = [
  { prefix: '/cv', mode: 'off' },
  { prefix: '/works', exact: true, mode: 'panel' },
  { prefix: '/installations', exact: true, mode: 'panel' },
  { prefix: '/physical-works', exact: true, mode: 'panel' },
  { prefix: '/exhibitions', exact: true, mode: 'panel' },
  { prefix: '/collaborations', exact: true, mode: 'panel' },
  { prefix: '/awards', exact: true, mode: 'panel' },
  { prefix: '/writings', exact: true, mode: 'panel' },
  { prefix: '/press', exact: true, mode: 'panel' },
  // /shop is deliberately not here. The bar is worth its cost on a long
  // uninterrupted grid, where the footer would break the scroll; the shop
  // front opens with a featured product and a call to action, and at
  // 1920x1080 the bar landed across that button. A store's first screen is
  // the one place on the site where nothing may sit on top of the thing the
  // page is asking the reader to press.
];

/** The footer mode for a path. Anything not listed keeps the footer in the flow. */
export function footerModeFor(pathname: string | null): FooterMode {
  if (!pathname) return 'flow';
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  for (const rule of FOOTER_MODES) {
    if (rule.exact ? path === rule.prefix : path === rule.prefix || path.startsWith(`${rule.prefix}/`)) {
      return rule.mode;
    }
  }
  return 'flow';
}

// ---------------------------------------------------------------------------
// Breadcrumbs
// ---------------------------------------------------------------------------

/** Labels for the route segments the trail can name without reading the data. */
const SEGMENT_LABELS: Record<string, string> = {
  works: 'Works',
  installations: 'Installations',
  'physical-works': 'Physical works',
  exhibitions: 'Exhibitions',
  collaborations: 'Collaborations',
  awards: 'Awards',
  writings: 'Writings',
  press: 'Press',
  drops: 'Drops',
  about: 'About',
  cv: 'CV',
  commissions: 'Commissions',
  insights: 'Insights',
  collections: 'Collections',
  activity: 'Activity',
  leaderboard: 'Leaderboard',
  guild: 'Tiers and badges',
  shop: 'Shop',
  cart: 'Cart',
  product: 'Product',
  collection: 'Collection',
  privacy: 'Privacy',
  terms: 'Terms',
  import: 'Import',
  'design-system': 'Design system',
  docs: 'Docs',
  update: 'Update',
  // A breadcrumb should say what the page calls itself. These four used to
  // say something else: "Auth" over a page titled Sign in, "Signout" over
  // "Sign out?", "Store" in a title with "Shop" in the nav below it.
  auth: 'Sign in',
  signin: 'Sign in',
  signout: 'Sign out',
  orders: 'Orders',
  checkout: 'Checkout',
  request: 'Make a request',
  collector: 'Collector',
  collectors: 'Collectors',
};

/** An Ethereum address, which is a URL segment nobody wants to read in full. */
const ADDRESS_SEGMENT = /^0x[0-9a-f]{40}$/i;

/**
 * "paste-grounds" reads as "Paste grounds" when nothing better is known.
 *
 * What comes back is a route segment, which is to say text a stranger chose,
 * so it is stripped to words and cut short before it is printed: a trail
 * should never become a place to put anything a URL can carry.
 */
function segmentLabel(segment: string): string {
  const known = SEGMENT_LABELS[segment];
  if (known) return known;

  // A 42-character address rendered in full made the trail wider than a
  // 390 px viewport, which gave the page a horizontal scroll. Pages that
  // know the wallet's ENS name render their own trail; this is the floor.
  if (ADDRESS_SEGMENT.test(segment)) return `${segment.slice(0, 6)}…${segment.slice(-4)}`;

  let decoded = segment;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    // A half-escaped segment is used as it was typed.
  }
  const words = decoded
    .replace(/[-_]+/g, ' ')
    .replace(/[^\p{L}\p{N} '&.]+/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 48);
  if (!words) return 'Page';
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export interface Crumb {
  label: string;
  /** Absent on the current page. */
  href?: string;
}

/**
 * The trail for a path, starting at Home. An empty array means no trail (the
 * home page).
 *
 * `labels` overrides a segment's name with what the page actually calls
 * itself, which the install's own data decides: an artist who titles their
 * shop "Store" should not read "Shop" in the trail under it, and a guild
 * page titled "The guild" should not be reached through a crumb saying
 * something else. The root layout passes the handful of names data can
 * change; everything else is a constant.
 */
export function breadcrumbsFor(pathname: string | null, labels: Record<string, string> = {}): Crumb[] {
  if (!pathname || pathname === '/') return [];
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return [];

  const crumbs: Crumb[] = [{ label: 'Home', href: '/' }];
  let href = '';
  segments.forEach((segment, index) => {
    href += `/${segment}`;
    const last = index === segments.length - 1;
    crumbs.push({ label: labels[segment]?.trim() || segmentLabel(segment), href: last ? undefined : href });
  });
  return crumbs;
}
