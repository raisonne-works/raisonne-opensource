import { EXHIBITION_KIND_LABEL, exhibitionPlace } from '@/components/raisonne/profile/format';
import {
  CHAIN_LABELS,
  SERIES_KIND_LABELS,
  contractExplorerUrl,
  formatCount,
  plural,
  seriesHref,
  seriesTitle,
  term,
  terms,
  workHref,
  workTitle,
} from '@/components/raisonne/works/lib';
import { RECORD_TYPE_LABELS, dropStatus, exhibitionStatus, isModuleEnabled, recordHref } from '@/lib/records';
import type {
  Asset,
  Award,
  Chain,
  Collaboration,
  Drop,
  Exhibition,
  Immersive,
  Installation,
  Media,
  PhysicalWork,
  PressItem,
  RecordType,
  Series,
  SiteData,
  Work,
  Writing,
} from '@/lib/types';

/**
 * One row of the catalogue, whatever kind of record it came from.
 *
 * The index lists series beside shows, installations, awards and papers, so
 * the browser, the card, the table and the gallery wall all work on this one
 * shape instead of eleven. Everything a list needs is worked out once, here:
 * the href, the caption line, the facet values and the text search matches
 * against. Nothing in this file renders, and nothing reads the filesystem.
 */

export interface CatalogueEntry {
  /** Unique across types: "series:visions", "work:ethereum:0x..:12". */
  key: string;
  type: RecordType;
  typeLabel: string;
  /** What the card prints: a display title when the record has one. */
  title: string;
  /** The full on-chain or catalogue title, when it is longer than `title`. */
  fullTitle: string | null;
  subtitle: string | null;
  /** The record's page on this site, or null when it has none (a CV-only show). */
  href: string | null;
  /** Where to go when there is no page of our own: the venue, the article, the paper. */
  externalHref: string | null;
  media: Media | null;
  /** A second image the card crossfades to on hover. */
  hoverStill: string | null;
  /** A short film the card plays, muted, while the pointer is on it. Series only. */
  teaser?: { src: string; poster: string | null } | null;
  /** Covers fill their frame; artworks are shown whole. */
  fit: 'cover' | 'contain';
  year: number | null;
  /** ISO date for sorting; falls back to the year. */
  date: string | null;
  /** The sub-kind inside a type: "Solo", "One of one", "Podcast", "Brand". */
  kind: string | null;
  /** Medium or category names, a facet. */
  medium: string[];
  chain: Chain | null;
  platform: string | null;
  contract: string | null;
  explorerUrl: string | null;
  tags: string[];
  featured: boolean;
  oneOfOne: boolean;
  /** A live HTML work: it is never run from a list, only from its own page. */
  interactive: boolean;
  /** Worked out from dates at render time: "On now", "Upcoming", "Live". */
  status: string | null;
  /** The caption line under the title, already in plain words. */
  meta: string[];
  /** Lowercased haystack for free-text search. */
  search: string;
}

/** The synthetic section that gathers unique works from every contract. */
export const ONE_OF_ONE_TYPE = 'one-of-one';

/** What a `type` filter can hold: a record type, or the one-of-ones section. */
export type CatalogueTypeFilter = RecordType | typeof ONE_OF_ONE_TYPE;

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

/** A record's cover asset as the media shape every image component takes. */
export function assetMedia(asset: Asset | null | undefined): Media | null {
  if (!asset) return null;
  const still = asset.kind === 'video' ? asset.poster : asset.src;
  return {
    kind: asset.kind === 'video' ? 'video' : 'image',
    still,
    full: asset.kind === 'video' ? asset.poster : asset.src,
    animation: asset.kind === 'video' ? asset.src : null,
    width: asset.width,
    height: asset.height,
  };
}

/** The first still photograph of a record, for the card's hover image. Videos are not stills. */
function firstPhoto(photos: Asset[] | undefined): string | null {
  return photos?.find(photo => photo.kind === 'image')?.src ?? null;
}

function yearOf(iso: string | null | undefined, fallback: number | null = null): number | null {
  if (!iso) return fallback;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.getUTCFullYear();
}

function clean(values: readonly (string | null | undefined)[] | null | undefined): string[] {
  const out: string[] = [];
  for (const value of values ?? []) {
    const trimmed = value?.trim();
    if (trimmed && !out.includes(trimmed)) out.push(trimmed);
  }
  return out;
}

/** Everything a visitor might type: title, place, facts, categories, ids. */
function haystack(parts: (string | number | null | undefined)[]): string {
  return parts
    .filter(part => part !== null && part !== undefined && part !== '')
    .join(' ')
    .toLowerCase();
}

// ---------------------------------------------------------------------------
// One builder per record type
// ---------------------------------------------------------------------------

export function seriesEntry(series: Series, hoverStill: string | null = null): CatalogueEntry {
  const name = seriesTitle(series);
  const meta = clean([
    series.year !== null ? String(series.year) : null,
    CHAIN_LABELS[series.chain],
    series.kind === 'one-of-one' ? null : plural(series.workCount, 'work'),
    series.collectorCount ? plural(series.collectorCount, 'collector') : null,
  ]);

  return {
    key: `series:${series.slug}`,
    type: 'series',
    typeLabel: series.kind === 'one-of-one' ? RECORD_TYPE_LABELS.work.one : RECORD_TYPE_LABELS.series.one,
    title: name,
    fullTitle: series.displayTitle && series.displayTitle !== series.name ? series.name : null,
    subtitle: series.description,
    href: seriesHref(series),
    externalHref: series.marketUrl,
    media: series.cover,
    hoverStill,
    teaser:
      series.teaser?.kind === 'video' && series.teaser.src
        ? { src: series.teaser.renditions?.[0]?.src ?? series.teaser.src, poster: series.teaser.poster }
        : null,
    fit: 'cover',
    year: series.year,
    date: series.year !== null ? `${series.year}-12-31` : null,
    // "Series" is already the Type of this row; only the exceptions are a Kind.
    kind: series.kind === 'series' ? null : SERIES_KIND_LABELS[series.kind],
    medium: terms(series.categories),
    chain: series.chain,
    platform: series.platform ?? null,
    contract: series.contract,
    explorerUrl: contractExplorerUrl(series.chain, series.contract),
    tags: series.coAuthored ? ['Co-authored'] : [],
    featured: Boolean(series.featured),
    oneOfOne: series.kind === 'one-of-one',
    interactive: false,
    status: null,
    meta,
    search: haystack([
      name,
      series.name,
      series.slug,
      series.description,
      series.year,
      CHAIN_LABELS[series.chain],
      series.platform,
      series.contract,
      SERIES_KIND_LABELS[series.kind],
      ...(series.categories ?? []),
    ]),
  };
}

export function workEntry(work: Work, series: Series | undefined): CatalogueEntry {
  const title = workTitle(work);
  const year = yearOf(work.mintedAt, series?.year ?? null);
  const meta = clean([
    year !== null ? String(year) : null,
    CHAIN_LABELS[work.chain],
    work.editionSize !== null && work.editionSize > 1 ? `Edition of ${formatCount(work.editionSize)}` : null,
    work.media.kind === 'html' ? 'Interactive' : work.media.kind === 'video' ? 'Video' : null,
  ]);

  return {
    key: `work:${work.id}`,
    type: 'work',
    typeLabel: RECORD_TYPE_LABELS.work.one,
    title,
    fullTitle: title !== work.title ? work.title : null,
    subtitle: series ? seriesTitle(series) : null,
    href: workHref(work),
    externalHref: work.marketUrl ?? work.explorerUrl,
    media: work.media,
    hoverStill: null,
    fit: 'contain',
    year,
    date: work.mintedAt,
    kind: work.oneOfOne ? 'One of one' : null,
    medium: terms(work.categories),
    chain: work.chain,
    platform: work.platform ?? null,
    contract: work.contract,
    explorerUrl: work.explorerUrl,
    tags: clean((work.traits ?? []).map(trait => trait.value)).slice(0, 4),
    featured: Boolean(work.featured),
    oneOfOne: Boolean(work.oneOfOne),
    interactive: work.media.kind === 'html',
    status: null,
    meta,
    search: haystack([
      title,
      work.title,
      work.tokenId,
      series?.name,
      work.description,
      year,
      CHAIN_LABELS[work.chain],
      work.platform,
      work.contract,
      work.inscription,
      ...(work.categories ?? []),
      ...(work.traits ?? []).map(trait => `${trait.name} ${trait.value}`),
    ]),
  };
}

export function installationEntry(record: Installation): CatalogueEntry {
  return {
    key: `installation:${record.slug}`,
    type: 'installation',
    typeLabel: RECORD_TYPE_LABELS.installation.one,
    title: record.title,
    fullTitle: null,
    subtitle: record.subtitle ?? record.location,
    href: recordHref({ type: 'installation', key: record.slug }),
    externalHref: null,
    media: assetMedia(record.cover),
    hoverStill: firstPhoto(record.photos),
    fit: 'cover',
    year: record.year,
    date: record.year !== null ? `${record.year}-06-30` : null,
    kind: record.medium ? term(record.medium) : null,
    medium: terms([record.medium, ...(record.materials ?? [])]),
    chain: null,
    platform: null,
    contract: null,
    explorerUrl: null,
    tags: terms(record.tags),
    featured: record.featured,
    oneOfOne: false,
    interactive: false,
    status: null,
    meta: clean([record.year !== null ? String(record.year) : null, record.medium, record.location]),
    search: haystack([
      record.title,
      record.subtitle,
      record.description,
      record.location,
      record.curator,
      record.medium,
      record.year,
      ...(record.materials ?? []),
      ...(record.tags ?? []),
    ]),
  };
}

export function immersiveEntry(record: Immersive): CatalogueEntry {
  return {
    key: `immersive:${record.slug}`,
    type: 'immersive',
    typeLabel: RECORD_TYPE_LABELS.immersive.one,
    title: record.title,
    fullTitle: null,
    subtitle: record.subtitle ?? record.platform,
    href: recordHref({ type: 'immersive', key: record.slug }),
    externalHref: record.experienceUrl,
    media: assetMedia(record.cover),
    hoverStill: firstPhoto(record.photos),
    fit: 'cover',
    year: record.year,
    date: record.date ?? (record.year !== null ? `${record.year}-06-30` : null),
    kind: RECORD_TYPE_LABELS.immersive.one,
    medium: terms([record.platform]),
    chain: null,
    platform: record.platform,
    contract: null,
    explorerUrl: null,
    tags: clean(record.tags),
    featured: record.featured,
    oneOfOne: false,
    interactive: false,
    status: record.status,
    meta: clean([record.year !== null ? String(record.year) : null, record.platform, record.duration]),
    search: haystack([
      record.title,
      record.subtitle,
      record.description,
      record.platform,
      record.curator,
      record.requirements,
      record.year,
      ...(record.tags ?? []),
    ]),
  };
}

export function physicalWorkEntry(record: PhysicalWork): CatalogueEntry {
  return {
    key: `physical-work:${record.slug}`,
    type: 'physical-work',
    typeLabel: RECORD_TYPE_LABELS['physical-work'].one,
    title: record.title,
    fullTitle: null,
    subtitle: record.subtitle ?? record.medium,
    href: recordHref({ type: 'physical-work', key: record.slug }),
    externalHref: null,
    media: assetMedia(record.cover),
    hoverStill: null,
    fit: 'cover',
    year: record.year,
    date: record.year !== null ? `${record.year}-06-30` : null,
    kind: record.medium ? term(record.medium) : null,
    medium: terms([record.medium, ...(record.materials ?? [])]),
    chain: null,
    platform: null,
    contract: null,
    explorerUrl: null,
    tags: terms(record.tags),
    featured: record.featured,
    oneOfOne: true,
    interactive: false,
    status: record.availability,
    meta: clean([record.year !== null ? String(record.year) : null, record.medium, record.dimensions]),
    search: haystack([
      record.title,
      record.subtitle,
      record.description,
      record.medium,
      record.dimensions,
      record.location,
      record.availability,
      record.year,
      ...(record.materials ?? []),
      ...(record.tags ?? []),
    ]),
  };
}

const EXHIBITION_STATUS_LABEL: Record<string, string | null> = {
  upcoming: 'Upcoming',
  current: 'On now',
  past: null,
  unknown: null,
};

export function exhibitionEntry(record: Exhibition, now?: number): CatalogueEntry {
  const place = exhibitionPlace(record);
  const kind = EXHIBITION_KIND_LABEL[record.kind];
  return {
    key: `exhibition:${record.id}`,
    type: 'exhibition',
    typeLabel: RECORD_TYPE_LABELS.exhibition.one,
    title: record.title,
    fullTitle: null,
    subtitle: place || null,
    href: record.slug ? recordHref({ type: 'exhibition', key: record.slug }) : null,
    externalHref: record.url,
    media: assetMedia(record.cover),
    hoverStill: null,
    fit: 'cover',
    year: record.year,
    date: record.startDate ?? `${record.year}-01-01`,
    kind,
    medium: terms([record.format]),
    chain: null,
    platform: null,
    contract: null,
    explorerUrl: null,
    tags: clean(record.tags),
    featured: Boolean(record.featured),
    oneOfOne: false,
    interactive: false,
    status: EXHIBITION_STATUS_LABEL[exhibitionStatus(record, now)] ?? null,
    meta: clean([String(record.year), kind, place || null]),
    search: haystack([
      record.title,
      place,
      record.venue,
      record.city,
      record.country,
      record.curator,
      record.event,
      record.format,
      record.description,
      kind,
      record.year,
      ...(record.tags ?? []),
    ]),
  };
}

export function collaborationEntry(record: Collaboration): CatalogueEntry {
  const partners = (record.partners ?? []).map(partner => partner.name);
  return {
    key: `collaboration:${record.slug}`,
    type: 'collaboration',
    typeLabel: RECORD_TYPE_LABELS.collaboration.one,
    title: record.title,
    fullTitle: null,
    subtitle: record.subtitle ?? (partners.length > 0 ? partners.join(', ') : null),
    href: recordHref({ type: 'collaboration', key: record.slug }),
    externalHref: record.projectUrl,
    media: assetMedia(record.cover),
    hoverStill: firstPhoto(record.photos),
    fit: 'cover',
    year: record.year,
    date: record.date ?? (record.year !== null ? `${record.year}-06-30` : null),
    kind: record.kind ? term(record.kind) : null,
    medium: terms([record.kind]),
    chain: null,
    platform: null,
    contract: null,
    explorerUrl: null,
    tags: terms(record.tags),
    featured: record.featured,
    oneOfOne: false,
    interactive: false,
    status: record.status,
    meta: clean([record.year !== null ? String(record.year) : null, record.kind, partners[0] ?? null]),
    search: haystack([
      record.title,
      record.subtitle,
      record.description,
      record.kind,
      record.year,
      ...partners,
      ...(record.highlights ?? []),
      ...(record.tags ?? []),
    ]),
  };
}

export function awardEntry(record: Award): CatalogueEntry {
  return {
    key: `award:${record.id}`,
    type: 'award',
    typeLabel: RECORD_TYPE_LABELS.award.one,
    title: record.title,
    fullTitle: null,
    subtitle: record.organization,
    href: record.slug ? recordHref({ type: 'award', key: record.slug }) : null,
    externalHref: record.url,
    media: assetMedia(record.cover),
    hoverStill: null,
    fit: 'cover',
    year: record.year,
    date: `${record.year}-01-01`,
    // An award's result ("Silver Award", "1st Place in Motion") names this
    // one prize, not a kind of record, so it stays in the caption and out of
    // the Kind facet, where it could only ever count one row.
    kind: record.category ? term(record.category) : null,
    medium: terms([record.category]),
    chain: null,
    platform: null,
    contract: null,
    explorerUrl: null,
    tags: [],
    featured: false,
    oneOfOne: false,
    interactive: false,
    status: null,
    meta: clean([String(record.year), record.organization, record.result]),
    search: haystack([
      record.title,
      record.organization,
      record.result,
      record.category,
      record.prize,
      record.ceremonyLocation,
      record.description,
      record.year,
    ]),
  };
}

export function writingEntry(record: Writing): CatalogueEntry {
  return {
    key: `writing:${record.slug}`,
    type: 'writing',
    typeLabel: RECORD_TYPE_LABELS.writing.one,
    title: record.title,
    fullTitle: null,
    subtitle: record.subtitle ?? record.publishedIn,
    href: recordHref({ type: 'writing', key: record.slug }),
    externalHref: record.originalUrl ?? (record.doi ? `https://doi.org/${record.doi}` : record.pdfUrl),
    media: assetMedia(record.cover),
    hoverStill: null,
    fit: 'cover',
    year: record.year ?? yearOf(record.publishedAt),
    date: record.publishedAt ?? (record.year !== null ? `${record.year}-01-01` : null),
    kind: record.category ? term(record.category) : null,
    medium: terms([record.category]),
    chain: null,
    platform: null,
    contract: null,
    explorerUrl: null,
    tags: clean(record.tags),
    featured: record.featured,
    oneOfOne: false,
    interactive: false,
    status: null,
    meta: clean([
      record.year !== null ? String(record.year) : null,
      record.publishedIn,
      record.authors?.length ? record.authors.join(', ') : null,
    ]),
    search: haystack([
      record.title,
      record.subtitle,
      record.description,
      record.publishedIn,
      record.category,
      record.doi,
      record.year,
      ...(record.authors ?? []),
      ...(record.tags ?? []),
    ]),
  };
}

const PRESS_KIND_LABEL: Record<string, string> = {
  article: 'Article',
  video: 'Video',
  podcast: 'Podcast',
};

export function pressEntry(record: PressItem): CatalogueEntry {
  const kind = PRESS_KIND_LABEL[record.kind ?? 'article'] ?? 'Article';
  return {
    key: `press:${record.id}`,
    type: 'press',
    typeLabel: RECORD_TYPE_LABELS.press.one,
    title: record.title,
    fullTitle: null,
    subtitle: record.outlet,
    href: record.slug ? recordHref({ type: 'press', key: record.slug }) : null,
    externalHref: record.url,
    media: assetMedia(record.image),
    hoverStill: null,
    fit: 'cover',
    year: record.year,
    date: record.date ?? `${record.year}-01-01`,
    kind,
    medium: terms([record.category]),
    chain: null,
    platform: null,
    contract: null,
    explorerUrl: null,
    tags: clean(record.tags),
    featured: Boolean(record.featured),
    oneOfOne: false,
    interactive: false,
    status: null,
    meta: clean([String(record.year), record.outlet, record.category ?? kind]),
    search: haystack([
      record.title,
      record.outlet,
      record.author,
      record.category,
      record.description,
      kind,
      record.year,
      ...(record.tags ?? []),
    ]),
  };
}

const DROP_STATUS_LABEL: Record<string, string> = {
  announced: 'Announced',
  scheduled: 'Upcoming',
  live: 'Live now',
  ended: 'Closed',
};

export function dropEntry(record: Drop, now?: number): CatalogueEntry {
  return {
    key: `drop:${record.slug}`,
    type: 'drop',
    typeLabel: RECORD_TYPE_LABELS.drop.one,
    title: record.title,
    fullTitle: null,
    subtitle: record.subtitle ?? record.kind,
    href: recordHref({ type: 'drop', key: record.slug }),
    externalHref: record.mintUrl ?? record.marketUrl,
    media: assetMedia(record.cover),
    hoverStill: null,
    fit: 'cover',
    year: record.year ?? yearOf(record.startsAt),
    date: record.startsAt ?? (record.year !== null ? `${record.year}-01-01` : null),
    kind: record.kind ? term(record.kind) : null,
    medium: terms([record.kind]),
    chain: record.chain,
    platform: record.platform,
    contract: record.contract,
    explorerUrl: record.chain ? contractExplorerUrl(record.chain, record.contract) : null,
    tags: clean(record.tags),
    featured: record.featured,
    oneOfOne: false,
    interactive: false,
    status: DROP_STATUS_LABEL[dropStatus(record, now)] ?? null,
    meta: clean([
      record.year !== null ? String(record.year) : null,
      record.kind,
      record.chain ? CHAIN_LABELS[record.chain] : null,
    ]),
    search: haystack([
      record.title,
      record.subtitle,
      record.description,
      record.kind,
      record.platform,
      record.contract,
      record.year,
      ...(record.tags ?? []),
    ]),
  };
}

// ---------------------------------------------------------------------------
// Whole lists
// ---------------------------------------------------------------------------

/** The first still of each series, so a card can crossfade to a second image. */
function secondStills(data: SiteData): Map<string, string> {
  const stills = new Map<string, string>();
  for (const work of data.works) {
    if (work.hidden || stills.has(work.seriesSlug)) continue;
    const still = work.media.still;
    if (!still) continue;
    const cover = data.series.find(series => series.slug === work.seriesSlug)?.cover?.still;
    if (still !== cover) stills.set(work.seriesSlug, still);
  }
  return stills;
}

/** Series a visitor may see: never a hidden one. */
export function visibleSeries(data: SiteData): Series[] {
  return data.series.filter(series => !series.hidden);
}

export function visibleWorks(data: SiteData): Work[] {
  return data.works.filter(work => !work.hidden);
}

/** Every series as an entry, covers first so the index opens on art. */
export function seriesEntries(data: SiteData): CatalogueEntry[] {
  const stills = secondStills(data);
  const entries = visibleSeries(data).map(series => seriesEntry(series, stills.get(series.slug) ?? null));
  const withCover = entries.filter(entry => entry.media?.still);
  return withCover.length === entries.length
    ? entries
    : [...withCover, ...entries.filter(entry => !entry.media?.still)];
}

/** Every individual work as an entry. Hidden works stay inside their series. */
export function workEntries(data: SiteData): CatalogueEntry[] {
  const byslug = new Map(data.series.map(series => [series.slug, series]));
  return visibleWorks(data)
    .filter(work => !byslug.get(work.seriesSlug)?.hidden)
    .map(work => workEntry(work, byslug.get(work.seriesSlug)));
}

/**
 * Unique works, with nothing listed twice: a contract made for a single work
 * is listed as that series, and a work flagged one of one is listed on its
 * own unless its series is already here.
 */
export function oneOfOneEntries(data: SiteData): CatalogueEntry[] {
  const stills = secondStills(data);
  const singles = visibleSeries(data).filter(series => series.kind === 'one-of-one');
  const covered = new Set(singles.map(series => series.slug));
  const byslug = new Map(data.series.map(series => [series.slug, series]));
  const works = visibleWorks(data).filter(work => work.oneOfOne && !covered.has(work.seriesSlug));
  return [
    ...singles.map(series => seriesEntry(series, stills.get(series.slug) ?? null)),
    ...works.map(work => workEntry(work, byslug.get(work.seriesSlug))),
  ];
}

export function installationEntries(data: SiteData): CatalogueEntry[] {
  return [...data.installations.map(installationEntry), ...data.immersives.map(immersiveEntry)];
}

export function physicalWorkEntries(data: SiteData): CatalogueEntry[] {
  return data.physicalWorks.map(physicalWorkEntry);
}

export function exhibitionEntries(data: SiteData, now?: number): CatalogueEntry[] {
  return data.exhibitions.map(record => exhibitionEntry(record, now));
}

export function collaborationEntries(data: SiteData): CatalogueEntry[] {
  return data.collaborations.map(collaborationEntry);
}

export function awardEntries(data: SiteData): CatalogueEntry[] {
  return data.awards.map(awardEntry);
}

export function writingEntries(data: SiteData): CatalogueEntry[] {
  return data.writings.map(writingEntry);
}

export function pressEntries(data: SiteData): CatalogueEntry[] {
  return data.press.map(pressEntry);
}

export function dropEntries(data: SiteData, now?: number): CatalogueEntry[] {
  return data.drops.map(record => dropEntry(record, now));
}

/**
 * The unified index. Works are grouped under their series by default, which
 * is what "the whole catalogue" means on an index: 29 series read, 4,000
 * tokens do not. Choosing the Works or One of ones section lists tokens
 * themselves. Press is about the artist rather than the work, so it has its
 * own page and stays out of the catalogue index.
 */
export function indexEntries(data: SiteData, type: CatalogueTypeFilter | null, now?: number): CatalogueEntry[] {
  switch (type) {
    case 'work':
      return workEntries(data);
    case ONE_OF_ONE_TYPE:
      return oneOfOneEntries(data);
    case 'series':
      return seriesEntries(data);
    case 'installation':
    case 'immersive':
      return installationEntries(data);
    case 'physical-work':
      return physicalWorkEntries(data);
    case 'exhibition':
      return exhibitionEntries(data, now);
    case 'collaboration':
      return collaborationEntries(data);
    case 'award':
      return awardEntries(data);
    case 'writing':
      return writingEntries(data);
    case 'press':
      return pressEntries(data);
    case 'drop':
      return dropEntries(data, now);
    default:
      return [
        ...seriesEntries(data),
        ...installationEntries(data),
        ...physicalWorkEntries(data),
        ...exhibitionEntries(data, now),
        ...collaborationEntries(data),
        ...awardEntries(data),
        ...(isModuleEnabled(data.settings, 'writings') ? writingEntries(data) : []),
        ...(isModuleEnabled(data.settings, 'drops') ? dropEntries(data, now) : []),
      ];
  }
}

/**
 * Narrows a list that already holds one scope to one type inside it, which
 * is how /installations filters the immersive experiences folded into it.
 */
export function scopeByType(entries: CatalogueEntry[], type: CatalogueTypeFilter | null): CatalogueEntry[] {
  if (!type) return entries;
  if (type === ONE_OF_ONE_TYPE) return entries.filter(entry => entry.oneOfOne);
  return entries.filter(entry => entry.type === type);
}

/** How many entries each section of the index holds, for the type filter and the tiles. */
export function sectionCounts(data: SiteData): Record<CatalogueTypeFilter, number> {
  const oneOfOnes = oneOfOneEntries(data).length;
  return {
    series: visibleSeries(data).length,
    work: workEntries(data).length,
    [ONE_OF_ONE_TYPE]: oneOfOnes,
    installation: data.installations.length + data.immersives.length,
    immersive: data.immersives.length,
    'physical-work': data.physicalWorks.length,
    exhibition: data.exhibitions.length,
    collaboration: data.collaborations.length,
    award: data.awards.length,
    writing: data.writings.length,
    press: data.press.length,
    drop: data.drops.length,
  };
}
