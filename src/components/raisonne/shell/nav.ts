import { isModuleEnabled, worksLabel } from '@/lib/records';
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
 * The grouped navigation for this install.
 *
 * Two menus, the same split the catalogue uses: Catalog is the records
 * (index, series, one of ones, immersive, exhibitions, awards).
 * Insights is the person and the figures (about, press, analytics,
 * leaderboard). A section with nothing in it is left out. Collaborations,
 * the CV and commissions stay on the page and in the footer; they are not
 * items in these menus.
 */
export function siteNav(
  data: SiteData,
  /** Counts the data itself cannot answer, read from the optional fixtures by the caller. */
  extras: { shopProducts?: number } = {},
): NavGroup[] {
  const { settings } = data;
  const installations = data.installations.length + data.immersives.length;
  const hasCatalogue = data.series.length > 0 || data.works.length > 0;

  const series = data.series.filter(item => !item.hidden && item.kind !== 'one-of-one');
  const oneOfOneSeries = data.series.filter(item => !item.hidden && item.kind === 'one-of-one');
  const oneOfOneWorks = data.works.filter(
    work => !work.hidden && work.oneOfOne && !oneOfOneSeries.some(item => item.slug === work.seriesSlug),
  );
  const oneOfOnes = oneOfOneSeries.length + oneOfOneWorks.length;

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

  const catalog = compact([
    // The menu has always said Index here; the artist's own name for the
    // section wins when settings give one.
    hasCatalogue
      ? { href: '/works', label: worksLabel(settings, 'Index'), description: 'The whole catalogue, in one list.' }
      : null,
    series.length > 0
      ? {
          href: '/works?type=series',
          label: 'Series',
          description: 'Bodies of work, each one a contract.',
          count: series.length,
        }
      : null,
    oneOfOnes > 0
      ? {
          href: '/works?type=one-of-one',
          label: 'One of ones',
          description: 'Unique works, with nothing listed twice.',
          count: oneOfOnes,
        }
      : null,
    installations > 0
      ? {
          href: '/immersive',
          label: 'Immersive',
          description: 'Installations, rooms and immersive experiences.',
          count: installations,
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
    data.awards.length > 0
      ? { href: '/awards', label: 'Awards', description: 'Prizes and nominations.', count: data.awards.length }
      : null,
  ]);

  const insights = compact([
    { href: '/about', label: 'About', description: `Who ${data.artist.name} is and how the work is made.` },
    data.press.length > 0
      ? { href: '/press', label: 'Press & media', description: 'Articles, interviews and talks.', count: data.press.length }
      : null,
    isModuleEnabled(settings, 'insights')
      ? { href: '/insights', label: 'Analytics', description: 'What the chain says about the work.' }
      : null,
    isModuleEnabled(settings, 'insights')
      ? { href: '/leaderboard', label: 'Leaderboard', description: 'Who holds the work.' }
      : null,
  ]);

  const shop =
    shopProducts > 0
      ? [{ href: '/shop', label: 'Shop', description: 'Prints, books and objects.', count: shopProducts }]
      : [];

  return [
    { id: 'insights', label: 'Insights', items: insights },
    { id: 'catalog', label: 'Catalog', items: catalog },
    shop.length > 0 ? { id: 'shop', label: 'Shop', items: shop } : null,
  ].filter((group): group is NavGroup => group !== null && group.items.length > 0);
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
  { prefix: '/immersive', exact: true, mode: 'panel' },
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
  immersive: 'Immersive',
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
