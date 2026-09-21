import type { CSSProperties } from 'react';

import type { Chain, Evidence, Media, MediaKind, Series, SeriesKind, TokenStandard, Work } from '@/lib/types';

/**
 * Plain-words labels and small helpers shared by the works components.
 * Everything here is pure, so it runs in server and client components alike.
 */

export const CHAIN_LABELS: Record<Chain, string> = {
  ethereum: 'Ethereum',
  base: 'Base',
  tezos: 'Tezos',
  bitcoin: 'Bitcoin',
  solana: 'Solana',
};

export const SERIES_KIND_LABELS: Record<SeriesKind, string> = {
  series: 'Series',
  'one-of-one': 'One of one',
  'shared-platform': 'Platform 1/1s',
};

export const SERIES_KIND_DESCRIPTIONS: Record<SeriesKind, string> = {
  series: 'A contract the artist deployed for this body of work.',
  'one-of-one': 'A contract made for a single work.',
  'shared-platform': "The artist's own tokens on a marketplace's shared contract.",
};

export const MEDIA_KIND_LABELS: Record<MediaKind, string> = {
  image: 'Image',
  video: 'Video',
  html: 'Interactive',
  unknown: 'Media unknown',
};

export const STANDARD_LABELS: Record<TokenStandard, string> = {
  ERC721: 'ERC-721',
  ERC1155: 'ERC-1155',
  ORDINAL: 'Ordinal inscription',
  FA2: 'FA2',
  OTHER: 'Other',
};

export interface EvidenceCopy {
  label: string;
  /** One sentence a collector can read without knowing how contracts work. */
  explanation: string;
}

export const EVIDENCE_COPY: Record<Evidence['signal'], EvidenceCopy> = {
  deployer: {
    label: 'Deployed by the artist',
    explanation: "The artist's wallet created this contract.",
  },
  owner: {
    label: 'Owned by the artist',
    explanation: "The contract names the artist's wallet as its owner today, so the artist controls it.",
  },
  'ownership-log': {
    label: 'Ownership history',
    explanation: "The contract's ownership records show the artist's wallet as an owner.",
  },
  'token-creator': {
    label: 'Token creator',
    explanation: "The marketplace contract records the artist's wallet as the creator of these tokens.",
  },
  'storefront-decode': {
    label: 'Creator in token ID',
    explanation: "On this shared storefront the creator's address is written into each token ID, and it reads as the artist's wallet.",
  },
  'minted-to': {
    label: 'Minted to the artist',
    explanation: "The tokens were minted straight to the artist's wallet.",
  },
};

export const CO_AUTHORED_COPY: EvidenceCopy = {
  label: 'Co-authored',
  explanation:
    'The artist deployed and controls this contract, but the works were made together with others, so authorship is shared.',
};

/** Signals in a stable order, each with every detail recorded for it. */
export function groupEvidence(evidence: Evidence[]): { signal: Evidence['signal']; details: string[] }[] {
  const order = Object.keys(EVIDENCE_COPY) as Evidence['signal'][];
  const groups = new Map<Evidence['signal'], string[]>();
  for (const item of evidence) {
    const details = groups.get(item.signal) ?? [];
    if (item.detail && !details.includes(item.detail)) details.push(item.detail);
    groups.set(item.signal, details);
  }
  return order.filter(signal => groups.has(signal)).map(signal => ({ signal, details: groups.get(signal) ?? [] }));
}

/** 0x1234…abcd. Short values come back unchanged. */
export function shortAddress(address: string, lead = 6, tail = 4): string {
  if (address.length <= lead + tail + 1) return address;
  return `${address.slice(0, lead)}…${address.slice(-tail)}`;
}

/** Token ids can be 78 digits long (shared storefronts); keep both ends. */
export function shortTokenId(tokenId: string, max = 10): string {
  if (tokenId.length <= max) return tokenId;
  const side = Math.max(2, Math.floor((max - 1) / 2));
  return `${tokenId.slice(0, side)}…${tokenId.slice(-side)}`;
}

/** Where an address (a contract or a wallet) is shown on each chain's explorer. */
const ADDRESS_EXPLORERS: Record<Chain, (address: string) => string> = {
  ethereum: address => `https://etherscan.io/address/${address}`,
  base: address => `https://basescan.org/address/${address}`,
  tezos: address => `https://tzkt.io/${address}`,
  bitcoin: address => `https://mempool.space/address/${address}`,
  solana: address => `https://solscan.io/account/${address}`,
};

/** A wallet or any other address on its chain's explorer. */
export function addressExplorerUrl(chain: Chain, address: string): string {
  return ADDRESS_EXPLORERS[chain](address);
}

/** A contract on its chain's explorer. Bitcoin has no contracts (Ordinals are not on one). */
export function contractExplorerUrl(chain: Chain, contract: string | null): string | null {
  if (!contract || chain === 'bitcoin') return null;
  return ADDRESS_EXPLORERS[chain](contract);
}

/** Human host for "Open on etherscan.io" style links. */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * Fixed three-letter months: locale data varies ("Sept" in some en-GB
 * builds), and dates are data here, so they read the same everywhere.
 */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export function parseDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "12 May 2024" (UTC). */
export function formatDate(iso: string | null): string | null {
  const date = parseDate(iso);
  if (!date) return null;
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** "May 2024", or "May" when the year is shown elsewhere (UTC). */
export function formatMonth(iso: string | null, { withYear = true }: { withYear?: boolean } = {}): string | null {
  const date = parseDate(iso);
  if (!date) return null;
  const month = MONTHS[date.getUTCMonth()];
  return withYear ? `${month} ${date.getUTCFullYear()}` : month;
}

const NUMBER_FORMAT = new Intl.NumberFormat('en-US');

export function formatCount(n: number): string {
  return NUMBER_FORMAT.format(n);
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${formatCount(n)} ${n === 1 ? one : many}`;
}

export function editionLabel(work: Pick<Work, 'editionSize' | 'standard'>): string {
  if (work.editionSize !== null) {
    return work.editionSize === 1 ? 'Unique' : `Edition of ${formatCount(work.editionSize)}`;
  }
  // An unknown size is not a unique. ERC-721 without a recorded edition and
  // ERC-1155 without a supply both mean the catalogue does not know, so the
  // label says so instead of inventing "Unique".
  return 'Edition not recorded';
}

export function seriesHref(series: Pick<Series, 'slug'>): string {
  return `/works/${encodeURIComponent(series.slug)}`;
}

export function workHref(work: Pick<Work, 'seriesSlug' | 'tokenId'>): string {
  return `/works/${encodeURIComponent(work.seriesSlug)}/${encodeURIComponent(work.tokenId)}`;
}

/** A route param as the data spells it: decoded when it can be, as given when it cannot. */
export function decodeParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * True when the title already carries the token number ("Visions #001" for
 * token 1), so a caption does not repeat it.
 */
export function titleHasTokenNumber(title: string, tokenId: string): boolean {
  const match = /#\s*0*(\d+)\s*$/.exec(title.trim());
  if (!match) return false;
  return match[1] === (tokenId.replace(/^0+(?=\d)/, '') || '0');
}

/** A single-work series is shown as that work, not as a grid of one. */
export function isSingleWorkSeries(series: Pick<Series, 'kind' | 'workCount'>, works: readonly unknown[]): boolean {
  return series.kind === 'one-of-one' && series.workCount <= 1 && works.length === 1;
}

/**
 * next/image sizes for the shared media grid: 2 columns on phones, 3 from md
 * (768 px), 4 from xl (1280), 5 from 3xl (1920), 6 from 4xl (2560). Past
 * 2976 px the wide Container stops growing (2880 px of content), so a tile
 * stays about 470 px.
 */
export const GRID_SIZES =
  '(min-width: 2976px) 470px, (min-width: 2560px) 16vw, (min-width: 1920px) 20vw, (min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw';

/**
 * The grid those sizes describe. It uses the theme breakpoints only (3xl and
 * 4xl are defined in globals.css): Tailwind cannot order an arbitrary px
 * variant such as min-[1920px] against rem breakpoints, so xl would win.
 */
export const GRID_CLASS =
  'grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5 4xl:grid-cols-6';

/** How many tiles fill two whole rows of the shared grid at its widest (6 columns). */
export const TWO_ROWS = 12;

/** The grid's column count at each of its breakpoints. */
const GRID_COLUMNS = [
  { key: 'base', columns: 2 },
  { key: 'md', columns: 3 },
  { key: 'xl', columns: 4 },
  { key: '3xl', columns: 5 },
  { key: '4xl', columns: 6 },
] as const;

// Written out so Tailwind finds them: a class built from a variable is never generated.
const SHOW_FROM: Record<string, string> = {
  md: 'md:block',
  xl: 'xl:block',
  '3xl': '3xl:block',
  '4xl': '4xl:block',
};

const HIDE_FROM: Record<string, string> = {
  md: 'md:hidden',
  xl: 'xl:hidden',
  '3xl': '3xl:hidden',
  '4xl': '4xl:hidden',
};

/** Whole rows only, at most `maxRows`; a selection smaller than one row is shown as it is. */
function tilesShown(count: number, columns: number, maxRows: number): number {
  const rows = Math.min(maxRows, Math.floor(count / columns));
  return rows > 0 ? rows * columns : count;
}

/**
 * Per-tile classes that keep a fixed selection to whole rows at every
 * breakpoint, so a featured row never ends with one orphan tile. Pass the
 * number of tiles; the result goes to a grid's `itemClassName`.
 */
export function wholeRowTileClass(count: number, maxRows = 2): (index: number) => string | undefined {
  const shown = GRID_COLUMNS.map(({ key, columns }) => ({ key, shown: tilesShown(count, columns, maxRows) }));

  return index => {
    const classes: string[] = [];
    let visible = index < shown[0].shown;
    if (!visible) classes.push('hidden');
    for (const { key, shown: limit } of shown.slice(1)) {
      const now = index < limit;
      if (now === visible) continue;
      classes.push(now ? SHOW_FROM[key] : HIDE_FROM[key]);
      visible = now;
    }
    return classes.length > 0 ? classes.join(' ') : undefined;
  };
}

/**
 * The field every media tile sits on: one plate colour and one hairline, the
 * same in both themes.
 *
 * A work with a black background has to keep an edge in dark mode, or the
 * grid loses its rhythm and the tiles bleed into the page; a work that does
 * not fill its tile has to letterbox onto the same plate, or the art looks
 * boxed. One class does both, because the letterbox bars are this background.
 */
export const MEDIA_FRAME_CLASS = 'bg-muted ring-1 ring-inset ring-border';

/**
 * The stage a work page shows its media in, at every width. The rule itself
 * is the `work-stage` utility in globals.css; this is the name the
 * components use, with the plate the rest of the site's media sits on.
 */
export const WORK_STAGE_CLASS = 'work-stage';

/**
 * The cover band at the top of a series page.
 *
 * Its width is capped rather than its ratio alone, so the crop stops getting
 * deeper as the display grows: at 3.4:1 a landscape painting survives a
 * 2560 px screen only as a horizontal band with its top and bottom cut away.
 * Past 1,536 px the band stays the same size and the page grows around it.
 */
export const SERIES_HERO_CLASS =
  'mx-auto w-full max-w-[96rem] aspect-[16/9] max-h-[min(60svh,34rem)] sm:aspect-[5/2]';

/**
 * The two numbers the stage divides to get the work's proportions. A still
 * with no recorded size starts square and is corrected once the browser has
 * measured the image, so a landscape work is never left in a square box.
 */
export function stageVars(size: Pick<Media, 'width' | 'height'> | null): CSSProperties {
  const width = size?.width ?? 0;
  const height = size?.height ?? 0;
  if (!(width > 0 && height > 0)) return {};
  return { '--stage-w': width, '--stage-h': height } as CSSProperties;
}

/**
 * The image a large stage should show: the full-size original for image
 * works (sharper than a light still), the still for everything else. Video
 * and interactive originals are never used here, and neither is a GIF.
 */
export function stageStill(media: Media): string | null {
  if (media.kind === 'image' && media.full && !isAnimatedImage(media.full)) return media.full;
  return media.still;
}

/** GIFs animate, so they never stand in for a still. */
export function isAnimatedImage(url: string): boolean {
  try {
    return /\.gif$/i.test(new URL(url).pathname);
  } catch {
    return /\.gif(?:$|[?#])/i.test(url);
  }
}

// ---------------------------------------------------------------------------
// Titles
// ---------------------------------------------------------------------------

/**
 * What a heading should read. A contract's name is often a machine name
 * ("Conversations_Between_Natures_Memory_001"), so the artist can give the
 * record a short display title; the full name stays on the record itself.
 */
export function seriesTitle(series: Pick<Series, 'name' | 'displayTitle'>): string {
  return series.displayTitle?.trim() || series.name;
}

export function workTitle(work: Pick<Work, 'title' | 'displayTitle'>): string {
  return work.displayTitle?.trim() || work.title;
}

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

/** The series essay as its own page. */
export function seriesAboutHref(series: Pick<Series, 'slug'>): string {
  return `/works/${encodeURIComponent(series.slug)}/about`;
}

export function dropHref(slug: string): string {
  return `/drops/${encodeURIComponent(slug)}`;
}

/**
 * One spelling for a category, wherever it came from.
 *
 * A CMS text field collects the same idea three ways: "NEW MEDIA ART" from
 * one import, "New Media Art" from another, "new media art" typed by hand.
 * Left alone they become three facet values counting the same works, and
 * they shout in a row of quiet badges. A value that is all capitals is
 * lowered to sentence case unless it is short enough to be an initialism
 * (AI, CNN, VR), which is a name rather than a shout.
 */
export function term(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (!trimmed) return trimmed;
  const shoutedWord = trimmed.length <= 4 && !trimmed.includes(' ');
  if (shoutedWord || trimmed !== trimmed.toUpperCase()) return trimmed;
  return trimmed.charAt(0) + trimmed.slice(1).toLowerCase();
}

/** A list of categories, normalised, de-duplicated without regard to case, in order. */
export function terms(values: readonly (string | null | undefined)[] | null | undefined): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values ?? []) {
    const name = value ? term(value) : '';
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

/**
 * The catalogue index, filtered to one medium or category. The index reads
 * its state from the URL, so a category on a work page is a real link, and
 * it points at the value the facet actually holds.
 */
export function mediumHref(medium: string): string {
  return `/works?medium=${encodeURIComponent(term(medium))}`;
}

/** A marketplace's own name when the data has one, otherwise its host. */
export function marketLabel(url: string, platform?: string | null): string {
  return platform?.trim() || hostOf(url);
}

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

const BYTE_UNITS = ['bytes', 'KB', 'MB', 'GB'] as const;

/** "5.1 MB". Decimal units, the ones a file manager shows. */
export function formatBytes(bytes: number | null | undefined): string | null {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes) || bytes < 0) return null;
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < BYTE_UNITS.length - 1) {
    value /= 1000;
    unit += 1;
  }
  const rounded = unit === 0 ? Math.round(value) : Number(value.toFixed(value < 10 ? 1 : 0));
  return `${formatCount(rounded)} ${BYTE_UNITS[unit]}`;
}

const FORMAT_LABELS: Record<string, string> = {
  'image/jpeg': 'JPEG image',
  'image/png': 'PNG image',
  'image/gif': 'GIF image',
  'image/webp': 'WebP image',
  'image/svg+xml': 'SVG image',
  'video/mp4': 'MP4 video',
  'video/quicktime': 'QuickTime video',
  'video/webm': 'WebM video',
  'text/html': 'HTML',
  'model/gltf-binary': 'glTF model',
};

/** "JPEG image" from a media type, or the type itself when it is not a known one. */
export function formatMediaType(format: string | null | undefined): string | null {
  if (!format) return null;
  const type = format.trim().toLowerCase();
  if (FORMAT_LABELS[type]) return FORMAT_LABELS[type];
  const subtype = type.split('/')[1];
  return subtype ? subtype.replace(/^x-/, '').toUpperCase() : type;
}

/** "3468 x 2310 px", when both sides are recorded. */
export function formatDimensions(media: Pick<Media, 'width' | 'height'>): string | null {
  const { width, height } = media;
  if (!width || !height) return null;
  return `${formatCount(width)} x ${formatCount(height)} px`;
}

// ---------------------------------------------------------------------------
// Editions and uniqueness
// ---------------------------------------------------------------------------

/**
 * A unique work: the artist marked it as one, or it is the only token its
 * contract holds. Editions of an ERC-1155 are not unique even when one copy
 * was minted, because more can follow.
 */
export function isOneOfOne(work: Pick<Work, 'oneOfOne'>, series: Pick<Series, 'kind'> | null): boolean {
  return Boolean(work.oneOfOne) || series?.kind === 'one-of-one' || series?.kind === 'shared-platform';
}

// ---------------------------------------------------------------------------
// Dates and prices, for drops
// ---------------------------------------------------------------------------

/** "12 May 2024, 17:00 UTC". Drops are announced to the minute, so the time matters. */
export function formatDateTime(iso: string | null | undefined): string | null {
  const date = parseDate(iso);
  if (!date) return null;
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}, ${hours}:${minutes} UTC`;
}

/** "0.05 ETH", with the currency as the artist wrote it. */
export function formatPrice(price: { amount: number; currency: string } | null | undefined): string | null {
  if (!price || !Number.isFinite(price.amount)) return null;
  const amount = Number.isInteger(price.amount) ? String(price.amount) : String(Number(price.amount.toFixed(6)));
  return `${amount} ${price.currency}`.trim();
}
