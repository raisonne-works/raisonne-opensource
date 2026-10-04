import 'server-only';

import fs from 'node:fs';
import path from 'node:path';

import { isAnimatedImage, seriesTitle, workTitle } from '@/components/raisonne/works/lib';
import { ipfsGateway } from '@/lib/config';
import { type ImportEvent, isImportEvent } from '@/lib/import-events';
import { DEFAULT_SETTINGS, catalogueCounts, recordHref } from '@/lib/records';
import type {
  Artist,
  Award,
  Badge,
  BadgeCategory,
  CatalogueCounts,
  ChainSnapshot,
  Collaboration,
  CollectorUpdate,
  CommissionsPage,
  Cv,
  Drop,
  Exhibition,
  Immersive,
  Installation,
  Landing,
  GuildData,
  Media,
  PhysicalWork,
  PhygitalProduct,
  PressItem,
  Product,
  ProductCategory,
  RecordRef,
  Seo,
  Series,
  ShippingMethod,
  SiteData,
  SiteSettings,
  StoreCollection,
  StoreData,
  Tier,
  Work,
  Writing,
} from '@/lib/types';

import demoJson from './demo.json';

/**
 * Where a site's data comes from until the CMS and the live importer land.
 *
 *  - src/fixtures/local/site.json: the artist's own data, built from an import
 *    run and their existing site (see scripts/snapshot-cms.ts). Gitignored: it
 *    never ships in the public repo.
 *  - src/fixtures/demo.json: a fictional "Demo Artist" with public-domain (CC0)
 *    images from The Met, so a fresh clone renders something real-looking.
 *
 * Pages call these functions; components only ever receive the typed props.
 *
 * A fixture written before a type was added still loads: the loader fills a
 * missing array with [], a missing object with null and the settings with
 * DEFAULT_SETTINGS, so no page has to guard against an older file.
 *
 * Lists come back newest first, and by-slug lookups return null rather than
 * throwing, so a page can answer notFound() in one line.
 */

const FIXTURES_DIR = path.join(process.cwd(), 'src', 'fixtures');
const LOCAL_SITE = path.join(FIXTURES_DIR, 'local', 'site.json');
/**
 * Waves 2 and 3 keep their own files beside site.json, because they are
 * refreshed on their own schedules: the chain snapshot whenever the artist
 * runs `pnpm snapshot:chain`, the store whenever they change what they sell.
 * Each one wins over the same key inside site.json, and each one is
 * gitignored with the rest of src/fixtures/local.
 */
const LOCAL_CHAIN = path.join(FIXTURES_DIR, 'local', 'chain.json');
const LOCAL_GUILD = path.join(FIXTURES_DIR, 'local', 'guild.json');
const LOCAL_STORE = path.join(FIXTURES_DIR, 'local', 'store.json');
const LOCAL_IMPORT = path.join(FIXTURES_DIR, 'local', 'import-events.ndjson');
const DEMO_IMPORT = path.join(FIXTURES_DIR, 'demo-import.ndjson');

export type SiteSource = 'local' | 'demo';

/**
 * Text from contracts and old CMS records sometimes carries em-dashes; the
 * house style has none, so they become a comma on the way in.
 */
function reviveText(_key: string, value: unknown): unknown {
  return typeof value === 'string' ? value.replace(/\s*\u2014\s*/g, ', ') : value;
}

function assertSiteData(value: unknown, file: string): SiteData {
  const data = value as Partial<SiteData> | null;
  const ok =
    typeof data === 'object' &&
    data !== null &&
    typeof data.artist === 'object' &&
    data.artist !== null &&
    typeof data.artist.name === 'string' &&
    Array.isArray(data.series) &&
    Array.isArray(data.works) &&
    Array.isArray(data.exhibitions) &&
    Array.isArray(data.awards) &&
    Array.isArray(data.press);
  if (!ok) throw new Error(`${file} is not SiteData (needs artist, series, works, exhibitions, awards, press)`);
  return data as SiteData;
}

/**
 * A still that is only a marketplace thumbnail. Alchemy's "thumbnailv2"
 * variant is about 250 px wide, which is soft in a 450 px tile, so the
 * full-size original is used instead and next/image resizes it.
 */
const THUMBNAIL_STILL = /\/image\/upload\/thumbnailv2\//;

/**
 * Repairs any importer's data needs before it reaches a page: a still that
 * animates is not a still, and a still smaller than a tile is worse than the
 * original. next/image does the resizing either way.
 */
/** A public gateway's path, or an ipfs:// address, with the content id and path after it. */
const IPFS_ADDRESS = /^(?:ipfs:\/\/(?:ipfs\/)?|https:\/\/(?:ipfs\.io|dweb\.link|cloudflare-ipfs\.com|gateway\.ipfs\.io)\/ipfs\/)(.+)$/;

/**
 * A live work or film recorded on a public gateway loads through the
 * install's own gateway when it has one. Pictures keep their address: the
 * image optimiser only fetches from hosts it was told about.
 */
function throughGateway(url: string | null | undefined): string | null | undefined {
  const gateway = ipfsGateway();
  if (!url || !gateway) return url;
  const match = IPFS_ADDRESS.exec(url);
  return match ? gateway + match[1] : url;
}

function normalizeMedia<T extends Media | null>(media: T): T {
  if (!media) return media;
  const { full } = media;
  let still = media.still;
  if (still && isAnimatedImage(still)) still = full && !isAnimatedImage(full) ? full : null;
  if (still && full && still !== full && THUMBNAIL_STILL.test(still)) still = full;
  const animation = throughGateway(media.animation);
  return still === media.still && animation === media.animation ? media : ({ ...media, still, animation } as T);
}

function list<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

/** Settings an older fixture does not carry fall back to the defaults, module by module. */
function normalizeSettings(settings: SiteSettings | undefined | null): SiteSettings {
  if (!settings) return DEFAULT_SETTINGS;
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    modules: { ...DEFAULT_SETTINGS.modules, ...(settings.modules ?? {}) },
    analytics: { ...DEFAULT_SETTINGS.analytics, ...(settings.analytics ?? {}) },
    maintenance: { ...DEFAULT_SETTINGS.maintenance, ...(settings.maintenance ?? {}) },
    legal: { ...DEFAULT_SETTINGS.legal, ...(settings.legal ?? {}) },
    redirects: list(settings.redirects),
  };
}

function normalizeSite(data: SiteData): SiteData {
  return {
    ...data,
    series: data.series.map(series => ({ ...series, cover: normalizeMedia(series.cover) })),
    works: data.works.map(work => ({ ...work, media: normalizeMedia(work.media) })),
    exhibitions: list(data.exhibitions),
    awards: list(data.awards),
    press: list(data.press),
    installations: list(data.installations),
    immersives: list(data.immersives),
    physicalWorks: list(data.physicalWorks),
    collaborations: list(data.collaborations),
    writings: list(data.writings),
    drops: list(data.drops),
    landing: data.landing ?? null,
    commissions: data.commissions ?? null,
    cv: data.cv ?? null,
    pages: data.pages ?? {},
    settings: normalizeSettings(data.settings),
  };
}

/** Re-read a file only when it changes on disk, so editing a fixture needs no restart. */
const fileCache = new Map<string, { mtimeMs: number; value: unknown }>();

function readCached<T>(file: string, parse: (text: string) => T): T | null {
  let stat: fs.Stats;
  try {
    stat = fs.statSync(file);
  } catch {
    return null;
  }
  const hit = fileCache.get(file);
  if (hit && hit.mtimeMs === stat.mtimeMs) return hit.value as T;
  const value = parse(fs.readFileSync(file, 'utf8'));
  fileCache.set(file, { mtimeMs: stat.mtimeMs, value });
  return value;
}

let demoSite: SiteData | null = null;

function readDemoSite(): SiteData {
  demoSite ??= normalizeSite(assertSiteData(JSON.parse(JSON.stringify(demoJson), reviveText), 'src/fixtures/demo.json'));
  return demoSite;
}

function readLocalSite(): SiteData | null {
  return readCached(LOCAL_SITE, text =>
    normalizeSite(assertSiteData(JSON.parse(text, reviveText), 'src/fixtures/local/site.json')),
  );
}

/**
 * RAISONNE_FIXTURES=demo serves the demo artist even on an install that has
 * its own data. It is how you see what a fresh clone shows without moving
 * anyone's files, and it is what the demo screenshots are taken from. Any
 * other value, or none, means the install's own data when it exists.
 */
function demoForced(): boolean {
  return process.env.RAISONNE_FIXTURES?.trim().toLowerCase() === 'demo';
}

/** Which fixture getSiteData() is serving: the artist's local data or the demo. */
export function getSiteSource(): SiteSource {
  return !demoForced() && fs.existsSync(LOCAL_SITE) ? 'local' : 'demo';
}

/** The whole site: local/site.json when present, otherwise the demo artist. */
export function getSiteData(): SiteData {
  if (demoForced()) return readDemoSite();
  return readLocalSite() ?? readDemoSite();
}

function parseNdjson(text: string): ImportEvent[] {
  const events: ImportEvent[] = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      const value: unknown = JSON.parse(line, reviveText);
      if (isImportEvent(value)) events.push(value);
    } catch {
      // A torn or malformed line is skipped, as the live page would.
    }
  }
  return events;
}

/**
 * A recorded import run, in stream order, so the import page can replay it
 * without a live importer: local/import-events.ndjson when present (the
 * artist's own run, unfiltered: suggestions and look-alikes included, which
 * is what review is for), otherwise a short run for the demo artist.
 */
export function getImportReplay(): ImportEvent[] {
  return readCached(LOCAL_IMPORT, parseNdjson) ?? readCached(DEMO_IMPORT, parseNdjson) ?? [];
}

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

/** Newest first. A record with no year sits at the end, where an undated thing belongs. */
function byYearDesc<T extends { year: number | null }>(records: T[]): T[] {
  return [...records].sort((a, b) => (b.year ?? -Infinity) - (a.year ?? -Infinity));
}

function time(value: string | null | undefined): number {
  if (!value) return -Infinity;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? -Infinity : parsed;
}

function byDateDesc<T>(records: T[], date: (record: T) => string | null | undefined): T[] {
  return [...records].sort((a, b) => time(date(b)) - time(date(a)));
}

// ---------------------------------------------------------------------------
// The artist and the site
// ---------------------------------------------------------------------------

export function getArtist(): Artist {
  return getSiteData().artist;
}

export function getSettings(): SiteSettings {
  return getSiteData().settings;
}

/** Search and share text for one page key ('home', 'works', 'about', 'cv', ...). */
export function getPage(key: string): Seo | null {
  return getSiteData().pages[key] ?? null;
}

/** Live counts for the section index, the home stats and the {{tokens}} in the bio. */
export function getCounts(): CatalogueCounts {
  return catalogueCounts(getSiteData());
}

// ---------------------------------------------------------------------------
// Series and works
// ---------------------------------------------------------------------------

export function getSeries(slug: string): Series | null {
  return getSiteData().series.find(series => series.slug === slug) ?? null;
}

/** The chapters of a series, in fixture order. Empty for a series that has none. */
export function getChildSeries(parentSlug: string): Series[] {
  return getSiteData().series.filter(series => series.parentSlug === parentSlug);
}

/** The works a fixture carries for a series, in fixture order. May be fewer than Series.workCount. */
export function getWorksForSeries(slug: string): Work[] {
  return getSiteData().works.filter(work => work.seriesSlug === slug);
}

export function getWork(seriesSlug: string, tokenId: string): Work | null {
  return getSiteData().works.find(work => work.seriesSlug === seriesSlug && work.tokenId === tokenId) ?? null;
}

/** A work by its catalogue id (chain:contract:tokenId), which is what a RecordRef carries. */
export function getWorkById(id: string): Work | null {
  return getSiteData().works.find(work => work.id === id) ?? null;
}

/**
 * Up to n series to lead with: ones that have a cover, the artist's own
 * contracts before their tokens on shared marketplace contracts, in fixture
 * order (newest first).
 */
export function getFeaturedSeries(n: number): Series[] {
  const withCover = getSiteData().series.filter(series => series.cover?.still);
  const own = withCover.filter(series => series.kind !== 'shared-platform');
  const shared = withCover.filter(series => series.kind === 'shared-platform');
  return [...own, ...shared].slice(0, Math.max(0, n));
}

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

/** Installations, newest first. The /immersive page lists these with the immersive experiences. */
export function getInstallations(): Installation[] {
  return byYearDesc(getSiteData().installations);
}

export function getInstallation(slug: string): Installation | null {
  return getSiteData().installations.find(record => record.slug === slug) ?? null;
}

export function getImmersives(): Immersive[] {
  return byYearDesc(getSiteData().immersives);
}

/** /immersive/[slug] serves both kinds, so it looks here when getInstallation misses. */
export function getImmersive(slug: string): Immersive | null {
  return getSiteData().immersives.find(record => record.slug === slug) ?? null;
}

export function getPhysicalWorks(): PhysicalWork[] {
  return byYearDesc(getSiteData().physicalWorks);
}

export function getPhysicalWork(slug: string): PhysicalWork | null {
  return getSiteData().physicalWorks.find(record => record.slug === slug) ?? null;
}

/** Exhibitions, newest first. Includes the featured ones, which the CV shows as cards. */
export function getExhibitions(): Exhibition[] {
  return byYearDesc(getSiteData().exhibitions);
}

/** Only a show with its own page has a slug; the rest are rows on the CV. */
export function getExhibition(slug: string): Exhibition | null {
  return getSiteData().exhibitions.find(record => record.slug === slug) ?? null;
}

export function getCollaborations(): Collaboration[] {
  return byYearDesc(getSiteData().collaborations);
}

export function getCollaboration(slug: string): Collaboration | null {
  return getSiteData().collaborations.find(record => record.slug === slug) ?? null;
}

export function getAwards(): Award[] {
  return byYearDesc(getSiteData().awards);
}

export function getAward(slug: string): Award | null {
  return getSiteData().awards.find(record => record.slug === slug) ?? null;
}

export function getWritings(): Writing[] {
  return byDateDesc(getSiteData().writings, record => record.publishedAt);
}

export function getWriting(slug: string): Writing | null {
  return getSiteData().writings.find(record => record.slug === slug) ?? null;
}

/** Press, newest first. Undated items sit at the end. */
export function getPress(): PressItem[] {
  return byDateDesc(getSiteData().press, record => record.date ?? `${record.year}-01-01`);
}

/** Only an item kept on-site (its text, or a player) has a slug. */
export function getPressItem(slug: string): PressItem | null {
  return getSiteData().press.find(record => record.slug === slug) ?? null;
}

/** Press items by id, for the story block that lists press about one record. */
export function getPressByIds(ids: string[]): PressItem[] {
  const press = getSiteData().press;
  return ids.map(id => press.find(item => item.id === id)).filter((item): item is PressItem => item !== undefined);
}

/** Drops, soonest first, so the next one leads. */
export function getDrops(): Drop[] {
  return [...getSiteData().drops].sort((a, b) => time(a.startsAt) - time(b.startsAt));
}

export function getDrop(slug: string): Drop | null {
  return getSiteData().drops.find(record => record.slug === slug) ?? null;
}

// ---------------------------------------------------------------------------
// The pages that are one record each
// ---------------------------------------------------------------------------

export function getLanding(): Landing | null {
  return getSiteData().landing;
}

export function getCommissions(): CommissionsPage | null {
  return getSiteData().commissions;
}

export function getCv(): Cv | null {
  return getSiteData().cv;
}

// ---------------------------------------------------------------------------
// References between records
// ---------------------------------------------------------------------------

/**
 * Where a reference points. A work's page lives under its series, so this is
 * the only place that can resolve one: hand components the finished href.
 */
export function getRecordHref(ref: RecordRef): string | null {
  return recordHref(ref, id => {
    const work = getWorkById(id);
    return work ? { seriesSlug: work.seriesSlug, tokenId: work.tokenId } : null;
  });
}

/** The title a reference should read, so a link never says "series: paste-grounds". */
export function getRecordTitle(ref: RecordRef): string | null {
  const data = getSiteData();
  switch (ref.type) {
    case 'series': {
      const series = data.series.find(entry => entry.slug === ref.key);
      return series ? seriesTitle(series) : null;
    }
    case 'work': {
      const work = data.works.find(entry => entry.id === ref.key);
      return work ? workTitle(work) : null;
    }
    case 'installation':
      return getInstallation(ref.key)?.title ?? null;
    case 'immersive':
      return getImmersive(ref.key)?.title ?? null;
    case 'physical-work':
      return getPhysicalWork(ref.key)?.title ?? null;
    case 'exhibition':
      return getExhibition(ref.key)?.title ?? null;
    case 'collaboration':
      return getCollaboration(ref.key)?.title ?? null;
    case 'award':
      return getAward(ref.key)?.title ?? null;
    case 'writing':
      return getWriting(ref.key)?.title ?? null;
    case 'press':
      return getPressItem(ref.key)?.title ?? null;
    case 'drop':
      return getDrop(ref.key)?.title ?? null;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Wave 2: the chain snapshot and the guild
// ---------------------------------------------------------------------------

/**
 * Everything below is optional. A surface whose data is absent renders its
 * "nothing here yet" state and, where a variable would fix it, says which
 * one. Nothing is estimated and no count is borrowed from somewhere else:
 * a catalogue raisonne that invents a number is not one.
 */

/**
 * A Wave 2 or Wave 3 fixture, when the install has one.
 *
 * Unlike site.json, a bad file here does not throw: the catalogue is the
 * point of the site and must keep working whatever state the shop or the
 * chain snapshot is in. The surface that wanted it renders its empty state,
 * and the reason is logged once, where whoever runs the install will see it.
 */
function readLocalJson<T>(file: string, guard: (value: unknown) => value is T): T | null {
  try {
    return readCached(file, text => {
      const value: unknown = JSON.parse(text, reviveText);
      if (!guard(value)) throw new Error('not the shape this install expects');
      return value;
    });
  } catch (error) {
    console.warn(`[raisonne] ignoring ${path.relative(process.cwd(), file)}: ${error instanceof Error ? error.message : 'unreadable'}`);
    return null;
  }
}

function isChainSnapshot(value: unknown): value is ChainSnapshot {
  const snapshot = value as Partial<ChainSnapshot> | null;
  return (
    typeof snapshot === 'object' &&
    snapshot !== null &&
    typeof snapshot.computedAt === 'string' &&
    Array.isArray(snapshot.holders) &&
    Array.isArray(snapshot.events) &&
    Array.isArray(snapshot.leaderboard)
  );
}

function isGuildData(value: unknown): value is GuildData {
  const guild = value as Partial<GuildData> | null;
  return typeof guild === 'object' && guild !== null && Array.isArray(guild.tiers) && Array.isArray(guild.badges);
}

function isStoreData(value: unknown): value is StoreData {
  const store = value as Partial<StoreData> | null;
  return typeof store === 'object' && store !== null && typeof store.currency === 'string' && Array.isArray(store.products);
}

function normalizeGuild(guild: GuildData): GuildData {
  return {
    ...guild,
    tiers: list(guild.tiers).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    badges: list(guild.badges),
    badgeCategories: list(guild.badgeCategories),
    howItWorks: list(guild.howItWorks),
  };
}

function normalizeStore(store: StoreData): StoreData {
  return {
    ...store,
    currency: store.currency.toUpperCase(),
    products: list(store.products),
    phygitals: list(store.phygitals),
    categories: list(store.categories),
    collections: list(store.collections),
    shippingMethods: list(store.shippingMethods).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    podProviders: list(store.podProviders),
    page: store.page ?? null,
    commissionForm: store.commissionForm ?? null,
  };
}

/**
 * The on-chain snapshot: local/chain.json, then whatever site.json carries,
 * then the demo's. Null when the install has never run `pnpm snapshot:chain`
 * and the demo is not in play.
 */
export function getChainSnapshot(): ChainSnapshot | null {
  if (!demoForced()) {
    const local = readLocalJson(LOCAL_CHAIN, isChainSnapshot);
    if (local) return local;
  }
  return getSiteData().chain ?? null;
}

/** Tiers, badges and the guild page's own words. */
export function getGuild(): GuildData | null {
  if (!demoForced()) {
    const local = readLocalJson(LOCAL_GUILD, isGuildData);
    if (local) return normalizeGuild(local);
  }
  const guild = getSiteData().guild;
  return guild ? normalizeGuild(guild) : null;
}

export function getTiers(): Tier[] {
  return getGuild()?.tiers ?? [];
}

export function getTier(id: string): Tier | null {
  return getTiers().find(tier => tier.id === id) ?? null;
}

export function getBadges(): Badge[] {
  return getGuild()?.badges ?? [];
}

export function getBadge(id: string): Badge | null {
  return getBadges().find(badge => badge.id === id) ?? null;
}

export function getBadgeCategories(): BadgeCategory[] {
  return getGuild()?.badgeCategories ?? [];
}

/** Notes from the artist to their collectors, newest first. */
export function getCollectorUpdates(): CollectorUpdate[] {
  return byDateDesc(list(getSiteData().collectorUpdates), update => update.date);
}

// ---------------------------------------------------------------------------
// Wave 3: the store
// ---------------------------------------------------------------------------

/** What this install sells: local/store.json, then site.json, then the demo's. */
export function getStore(): StoreData | null {
  if (!demoForced()) {
    const local = readLocalJson(LOCAL_STORE, isStoreData);
    if (local) return normalizeStore(local);
  }
  const store = getSiteData().store;
  return store ? normalizeStore(store) : null;
}

/** Products a visitor may see, featured first. Hidden ones stay reachable by URL. */
export function getProducts(): Product[] {
  const store = getStore();
  if (!store) return [];
  const products = [...store.products, ...store.phygitals].filter(product => !product.hidden);
  return [...products.filter(product => product.featured), ...products.filter(product => !product.featured)];
}

export function getProduct(slug: string): Product | null {
  const store = getStore();
  if (!store) return null;
  return [...store.products, ...store.phygitals].find(product => product.slug === slug) ?? null;
}

/** Objects made from a work the buyer already holds. */
export function getPhygitals(): PhygitalProduct[] {
  return (getStore()?.phygitals ?? []).filter(product => !product.hidden);
}

export function getProductCategories(): ProductCategory[] {
  return getStore()?.categories ?? [];
}

export function getProductCategory(slug: string): ProductCategory | null {
  return getProductCategories().find(category => category.slug === slug) ?? null;
}

export function getStoreCollections(): StoreCollection[] {
  return getStore()?.collections ?? [];
}

export function getStoreCollection(slug: string): StoreCollection | null {
  return getStoreCollections().find(collection => collection.slug === slug) ?? null;
}

export function getShippingMethods(): ShippingMethod[] {
  return getStore()?.shippingMethods ?? [];
}

export function getShippingMethod(id: string): ShippingMethod | null {
  return getShippingMethods().find(method => method.id === id) ?? null;
}

/** Products in one category, then in one collection. Both keep the store's own order. */
export function getProductsInCategory(slug: string): Product[] {
  return getProducts().filter(product => product.categorySlug === slug);
}

export function getProductsInCollection(slug: string): Product[] {
  return getProducts().filter(product => product.collectionSlug === slug);
}
