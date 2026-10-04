/**
 * Builds src/fixtures/local/site.json from a live CMS, so an artist who
 * already has a site can see their own catalogue in this theme before any
 * back-end work starts.
 *
 *   RAISONNE_CMS_URL=https://x.art pnpm snapshot   reads that install's proxy
 *   pnpm snapshot -- --base=https://x.art          the same, as an argument
 *   pnpm snapshot -- --max-works=200       a fast run while developing
 *   pnpm snapshot -- --skip=works          leaves the works alone
 *
 * What it will not do:
 *
 *  - It only ever sends GET requests, and only to the proxy and its media
 *    hosts. It never writes to the CMS.
 *  - It only ever writes inside src/fixtures/local, which is gitignored, so
 *    an artist's own data cannot reach the public repo by accident.
 *  - The on-chain importer stays the source of truth for attribution: CMS
 *    records are merged onto the series and works that are already in
 *    local/site.json, and evidence, chain, contract and tokenId are never
 *    overwritten.
 *  - It copies no secrets and no personal data. Admin addresses, API keys,
 *    collector names and every personal-data collection (members, customers,
 *    orders, commissions) stay out. Contact addresses are left out too: see
 *    INCLUDE_CONTACT below.
 *
 * Every run also writes src/fixtures/local/snapshot-report.json: what was
 * read, what was skipped and why, and what could not be matched.
 *
 * A run that finds them also writes two more files beside site.json:
 * local/guild.json (tiers and badges) and local/store.json (products,
 * variants, categories, collections and shipping methods). Both are read by
 * src/fixtures/index.ts ahead of the matching key inside site.json. Neither
 * carries a collector, a customer, an order, a commission or a provider key:
 * those are personal data or secrets, and a snapshot holds neither.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import type {
  Announcement,
  Artist,
  ArtistLink,
  ArtistWallet,
  Asset,
  Award,
  Badge,
  BadgeCategory,
  Chain,
  Client,
  Collaboration,
  CommissionsPage,
  Cv,
  CvEducation,
  CvRole,
  CvSkill,
  Drop,
  DropPhase,
  Exhibition,
  ExhibitionKind,
  Fact,
  FulfilmentKind,
  GuildData,
  Immersive,
  Installation,
  Landing,
  LandingSection,
  LandingSectionId,
  Media,
  Money,
  PartnerGroup,
  PhygitalProduct,
  PhysicalWork,
  PressItem,
  PressKind,
  Product,
  ProductCategory,
  ProductVariant,
  RecordRef,
  RecordType,
  RichBlock,
  RichInline,
  RichText,
  Seo,
  Series,
  Service,
  ShippingMethod,
  SiteData,
  SiteEvent,
  SiteSettings,
  SkillCategory,
  Stat,
  StoreCollection,
  StoreData,
  StoryBlock,
  Tier,
  TokenStandard,
  Trait,
  Work,
  Writing,
} from '@/lib/types';

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

/**
 * Contact addresses are personal data, so the snapshot leaves them out: no
 * artist.email, no mailto: link and no mailto: call to action. The artist can
 * fill them in by hand, or flip this to true for their own install. Every
 * address that was dropped is counted in the report.
 */
const INCLUDE_CONTACT = false;

/**
 * Which CMS a snapshot reads. There is no default: this theme belongs to
 * whoever installs it, so the address of one artist's site does not live in
 * its source. Set RAISONNE_CMS_URL, or pass --base=.
 */
const DEFAULT_BASE = process.env.RAISONNE_CMS_URL?.trim().replace(/\/+$/, '') ?? '';
const WORKS_PAGE_SIZE = 500;
const REQUEST_TIMEOUT_MS = 120_000;
const REQUEST_RETRIES = 2;

const ROOT = process.cwd();
const LOCAL_DIR = path.join(ROOT, 'src', 'fixtures', 'local');
const SITE_FILE = path.join(LOCAL_DIR, 'site.json');
const REPORT_FILE = path.join(LOCAL_DIR, 'snapshot-report.json');
/**
 * Waves 2 and 3 keep their own files, because they change on their own
 * schedules and because a run that only refreshes the shop should not
 * rewrite the catalogue. The fixture loader reads each of them ahead of the
 * matching key in site.json.
 */
const GUILD_FILE = path.join(LOCAL_DIR, 'guild.json');
const STORE_FILE = path.join(LOCAL_DIR, 'store.json');

/**
 * The currency every price in the store fixture is written in. A CMS that
 * stores prices without one gives no way to tell, and one store is one
 * currency, so it is stated here rather than guessed per row.
 */
const STORE_CURRENCY = (process.env.RAISONNE_STORE_CURRENCY?.trim().toUpperCase() || 'USD').slice(0, 3);

// ---------------------------------------------------------------------------
// Reading unknown JSON safely
// ---------------------------------------------------------------------------

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function obj(value: unknown): Json | null {
  return isObject(value) ? value : null;
}

function arr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function str(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function bool(value: unknown): boolean {
  return value === true;
}

/** Reads a nested field by path, e.g. pick(doc, 'requiredInformation', 'contractAddress'). */
function pick(value: unknown, ...keys: string[]): unknown {
  let current: unknown = value;
  for (const key of keys) {
    const record = obj(current);
    if (!record) return null;
    current = record[key];
  }
  return current;
}

/** A relationship is an id at depth 0 and the whole record at depth 1 or more. */
function related(value: unknown): Json | null {
  return obj(value);
}

/** The title of an expanded taxonomy row ({ id, title }). */
function title(value: unknown): string | null {
  return str(pick(value, 'title'));
}

/**
 * A repeater row rarely calls its one text field "title": a materials list is
 * [{ material: "wool" }], a credits list is [{ name: "..." }]. Reading only
 * `title` left those rows unnamed, and String(row) then wrote the literal
 * "[object Object]" into the fixture. So: try the keys a label actually uses,
 * and drop a row that carries none rather than printing its shape.
 */
const LABEL_KEYS = ['title', 'name', 'label', 'material', 'value', 'text'];

function label(value: unknown): string | null {
  const direct = str(value);
  if (direct) return direct;
  const record = obj(value);
  if (!record) return null;
  for (const key of LABEL_KEYS) {
    const text = str(record[key]);
    if (text) return text;
  }
  return null;
}

function titles(value: unknown): string[] {
  return arr(value)
    .map(entry => label(entry))
    .filter((entry): entry is string => Boolean(entry));
}

function isoDate(value: unknown): string | null {
  const text = str(value);
  if (!text) return null;
  const parsed = Date.parse(text);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

function yearOf(value: unknown): number | null {
  const date = isoDate(value);
  return date ? new Date(date).getUTCFullYear() : null;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

/** Slugs drift between an importer and a CMS ("muraqqa-data-miniatures", "muraqqa-dataminiatures"). */
function looseSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// ---------------------------------------------------------------------------
// House style
// ---------------------------------------------------------------------------

/** The house style has no em dashes. The fixture loader does this too; doing it here keeps the file itself clean. */
function withoutEmDashes<T>(value: T): T {
  if (typeof value === 'string') return value.replace(/\s*\u2014\s*/g, ', ') as unknown as T;
  if (Array.isArray(value)) return value.map(entry => withoutEmDashes(entry)) as unknown as T;
  if (isObject(value)) {
    const out: Json = {};
    for (const [key, entry] of Object.entries(value)) out[key] = withoutEmDashes(entry);
    return out as unknown as T;
  }
  return value;
}

const KEEP_UPPERCASE = new Set(['AI', 'CGI', 'VR', 'AR', 'XR', '3D', 'NFT', 'DNA', 'UI', 'UX', 'A.I.', 'I']);

/**
 * A lot of CMS copy is typed in capitals because the artist's own site sets
 * it that way. This theme is not that site, so a heading that shouts is
 * brought back to a sentence. Short words and known initialisms are left
 * alone, and anything that is not all capitals is untouched.
 */
function sentenceCase(value: string | null): string | null {
  if (!value) return value;
  const text = value.trim();
  if (!text || text !== text.toUpperCase() || !/[A-Z]{4,}/.test(text)) return text;
  const words = text.split(/(\s+)/).map(word => {
    if (!/[A-Z]/.test(word)) return word;
    if (KEEP_UPPERCASE.has(word.replace(/[^A-Z.0-9]/g, ''))) return word;
    return word.toLowerCase();
  });
  const joined = words.join('');
  return joined.replace(/^([^a-zA-Z]*)([a-z])/, (_whole, lead: string, first: string) => lead + first.toUpperCase());
}

// ---------------------------------------------------------------------------
// The report
// ---------------------------------------------------------------------------

interface SourceReport {
  id: string;
  url: string;
  status: number | 'skipped' | 'failed';
  records: number;
  used: number;
  note: string | null;
}

interface Report {
  startedAt: string;
  finishedAt: string | null;
  base: string;
  includeContact: boolean;
  sources: SourceReport[];
  counts: Record<string, number>;
  cmsSeriesWithoutImporterMatch: string[];
  importerSeriesWithoutCmsMatch: string[];
  importerWorksWithoutCmsMatch: number;
  skippedWorks: { id: string; reason: string }[];
  skippedWorkCounts: Record<string, number>;
  unresolvedMedia: { record: string; field: string }[];
  droppedContact: number;
  /** Shows that arrived twice and were folded into one. */
  duplicateExhibitions: number;
  notes: string[];
}

const report: Report = {
  startedAt: new Date().toISOString(),
  finishedAt: null,
  base: DEFAULT_BASE,
  includeContact: INCLUDE_CONTACT,
  sources: [],
  counts: {},
  cmsSeriesWithoutImporterMatch: [],
  importerSeriesWithoutCmsMatch: [],
  importerWorksWithoutCmsMatch: 0,
  skippedWorks: [],
  skippedWorkCounts: {},
  unresolvedMedia: [],
  droppedContact: 0,
  duplicateExhibitions: 0,
  notes: [],
};

function note(text: string): void {
  report.notes.push(text);
  console.log(`  note: ${text}`);
}

/** Every skipped work is counted by reason; a short sample is kept so the reason can be checked by hand. */
function skipWork(id: string, reason: string): void {
  report.skippedWorkCounts[reason] = (report.skippedWorkCounts[reason] ?? 0) + 1;
  if (report.skippedWorks.length < 50) report.skippedWorks.push({ id, reason });
}

function unresolved(record: string, field: string): void {
  if (report.unresolvedMedia.length < 200) report.unresolvedMedia.push({ record, field });
}

// ---------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------

interface Options {
  base: string;
  maxWorks: number | null;
  skip: Set<string>;
}

function parseOptions(argv: string[]): Options {
  let base = DEFAULT_BASE;
  let maxWorks: number | null = null;
  const skip = new Set<string>();
  for (const arg of argv) {
    if (arg.startsWith('--base=')) base = arg.slice('--base='.length).replace(/\/+$/, '');
    else if (arg.startsWith('--max-works=')) maxWorks = num(arg.slice('--max-works='.length));
    else if (arg.startsWith('--skip=')) for (const id of arg.slice('--skip='.length).split(',')) skip.add(id.trim());
  }
  if (!base) {
    console.error(
      'No CMS address. Set RAISONNE_CMS_URL, or pass --base=https://your-site.example:\n' +
        '  RAISONNE_CMS_URL=https://your-site.example pnpm snapshot\n' +
        '  pnpm snapshot -- --base=https://your-site.example',
    );
    process.exit(1);
  }
  return { base, maxWorks, skip };
}

let options: Options = { base: DEFAULT_BASE, maxWorks: null, skip: new Set() };

function proxyUrl(pathAndQuery: string): string {
  return `${options.base}/api/proxy/${pathAndQuery.replace(/^\//, '')}`;
}

interface FetchResult {
  status: number | 'failed';
  body: unknown;
}

/**
 * The longest slug a record may carry.
 *
 * A CMS that slugifies a whole headline produces slugs of 200 characters and
 * more. Every static page is written to a file named after its slug, and a
 * filename cannot exceed 255 bytes on any common filesystem, so one long
 * press slug fails the whole build with ENAMETOOLONG. It is also a bad URL.
 * 72 characters is still readable and still says what the piece is.
 */
const SLUG_MAX = 72;

/**
 * Shortens one slug, deterministically: the same input always gives the same
 * output, so a record and every reference to it stay in agreement. The cut is
 * made at a word boundary and a short hash of the full slug is appended, so
 * two headlines that begin the same way do not collide.
 */
function shortSlug(value: string): string {
  if (value.length <= SLUG_MAX) return value;
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (Math.imul(hash, 31) + value.charCodeAt(index)) >>> 0;
  const suffix = hash.toString(36).slice(0, 6);
  const room = SLUG_MAX - suffix.length - 1;
  const cut = value.slice(0, room);
  const boundary = cut.lastIndexOf('-');
  const stem = (boundary > room / 2 ? cut.slice(0, boundary) : cut).replace(/-+$/, '');
  return `${stem}-${suffix}`;
}

/**
 * Applied to every response as it arrives, so a slug is shortened once, in
 * one place, whether it is read from the record itself or from a reference
 * embedded in another record.
 */
function shortenSlugs(value: unknown): unknown {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) value[index] = shortenSlugs(value[index]);
    return value;
  }
  if (!isObject(value)) return value;
  for (const [key, child] of Object.entries(value)) {
    if (key === 'slug' && typeof child === 'string') value[key] = shortSlug(child);
    else value[key] = shortenSlugs(child);
  }
  return value;
}

async function getJson(url: string): Promise<FetchResult> {
  for (let attempt = 0; attempt <= REQUEST_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (response.status === 404) return { status: 404, body: null };
      if (!response.ok) {
        if (attempt === REQUEST_RETRIES) return { status: response.status, body: null };
        continue;
      }
      return { status: response.status, body: shortenSlugs((await response.json()) as unknown) };
    } catch (error) {
      if (attempt === REQUEST_RETRIES) {
        console.warn(`  request failed: ${url} (${String(error)})`);
        return { status: 'failed', body: null };
      }
    }
  }
  return { status: 'failed', body: null };
}

/** A Payload collection: { docs, totalDocs }. A 404 or an empty collection is a note, never an error. */
async function getDocs(id: string, pathAndQuery: string): Promise<Json[]> {
  if (options.skip.has(id)) {
    report.sources.push({ id, url: proxyUrl(pathAndQuery), status: 'skipped', records: 0, used: 0, note: '--skip' });
    return [];
  }
  const url = proxyUrl(pathAndQuery);
  process.stdout.write(`  ${id} ... `);
  const { status, body } = await getJson(url);
  const docs = arr(pick(body, 'docs')).filter(isObject);
  const total = num(pick(body, 'totalDocs')) ?? docs.length;
  const entry: SourceReport = { id, url, status, records: docs.length, used: 0, note: null };
  if (status === 404) entry.note = 'not found on this install, skipped';
  else if (typeof status !== 'number') entry.note = 'request failed, skipped';
  else if (status >= 400) entry.note = `the CMS answered ${status}, skipped`;
  else if (docs.length === 0) entry.note = 'empty collection, skipped';
  report.sources.push(entry);
  console.log(`${status} (${docs.length}/${total})`);
  if (entry.note) note(`${id}: ${entry.note}`);
  return docs;
}

/** A Payload global: one object. */
async function getGlobal(id: string, pathAndQuery: string): Promise<Json | null> {
  if (options.skip.has(id)) {
    report.sources.push({ id, url: proxyUrl(pathAndQuery), status: 'skipped', records: 0, used: 0, note: '--skip' });
    return null;
  }
  const url = proxyUrl(pathAndQuery);
  process.stdout.write(`  ${id} ... `);
  const { status, body } = await getJson(url);
  const doc = obj(body);
  const entry: SourceReport = { id, url, status, records: doc ? 1 : 0, used: doc ? 1 : 0, note: null };
  if (!doc) entry.note = status === 404 ? 'not found on this install, skipped' : 'no data, skipped';
  report.sources.push(entry);
  console.log(`${status}`);
  if (entry.note) note(`${id}: ${entry.note}`);
  return doc;
}

function used(id: string, count: number): void {
  const entry = report.sources.find(source => source.id === id);
  if (entry) entry.used = count;
}

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

/** Every URL in the CMS is relative to the site it came from. Fixtures hold absolute URLs only. */
function absolute(value: unknown): string | null {
  const text = str(value);
  if (!text) return null;
  if (/^https?:\/\//i.test(text)) return text;
  if (text.startsWith('//')) return `https:${text}`;
  if (text.startsWith('/')) return `${options.base}${text}`;
  return null;
}

function isImageDoc(doc: Json): boolean {
  const mime = str(doc.mimeType) ?? '';
  return mime.startsWith('image/');
}

/** An uploaded image, as an Asset. */
function imageAsset(value: unknown, caption?: string | null): Asset | null {
  const doc = related(value);
  if (!doc) return null;
  const src = absolute(doc.url);
  if (!src) return null;
  return {
    kind: 'image',
    src,
    poster: null,
    alt: str(doc.alt),
    caption: caption ?? null,
    width: num(doc.width),
    height: num(doc.height),
  };
}

/**
 * An uploaded video. The encoder writes a poster and a ladder of encodings;
 * a player picks a rendition by screen width instead of pulling a 100 MB
 * original into a page.
 */
function videoAsset(value: unknown, caption?: string | null): Asset | null {
  const doc = related(value);
  if (!doc) return null;
  const src = absolute(doc.url);
  if (!src) return null;
  const stream = obj(doc.stream);
  const renditions: { height: number; src: string }[] = [];
  for (const [height, encoding] of Object.entries(obj(pick(stream, 'encodings')) ?? {})) {
    const encodingUrl = absolute(pick(encoding, 'url'));
    const encodingHeight = num(height);
    if (encodingUrl && encodingHeight) renditions.push({ height: encodingHeight, src: encodingUrl });
  }
  renditions.sort((a, b) => a.height - b.height);
  return {
    kind: 'video',
    src,
    poster: absolute(pick(stream, 'poster_url')) ?? absolute(pick(stream, 'thumbnail_url')),
    alt: str(doc.alt) ?? str(doc.title),
    caption: caption ?? null,
    width: num(doc.width) ?? null,
    height: num(doc.height) ?? num(pick(stream, 'video_height')),
    ...(renditions.length ? { renditions } : {}),
    duration: num(pick(stream, 'duration')),
  };
}

/** An upload that could be either: image collections and video collections both answer here. */
function anyAsset(value: unknown, caption?: string | null): Asset | null {
  const doc = related(value);
  if (!doc) return null;
  return isImageDoc(doc) ? imageAsset(doc, caption) : videoAsset(doc, caption);
}

function assets(value: unknown): Asset[] {
  return arr(value)
    .map(entry => anyAsset(entry))
    .filter((entry): entry is Asset => entry !== null);
}

function firstAsset(...values: unknown[]): Asset | null {
  for (const value of values) {
    const asset = anyAsset(value);
    if (asset) return asset;
  }
  return null;
}

function assetToMedia(asset: Asset | null): Media | null {
  if (!asset) return null;
  return {
    kind: asset.kind === 'video' ? 'video' : 'image',
    still: asset.kind === 'video' ? asset.poster : asset.src,
    full: asset.kind === 'video' ? asset.poster : asset.src,
    animation: asset.kind === 'video' ? asset.src : null,
    width: asset.width,
    height: asset.height,
  };
}

// ---------------------------------------------------------------------------
// Rich text
// ---------------------------------------------------------------------------

const FORMAT_BOLD = 1;
const FORMAT_ITALIC = 2;

function inlineNodes(children: unknown, href?: string): RichInline[] {
  const out: RichInline[] = [];
  for (const child of arr(children)) {
    const node = obj(child);
    if (!node) continue;
    const type = str(node.type);
    if (type === 'linebreak') {
      out.push({ text: '\n' });
      continue;
    }
    if (type === 'link' || type === 'autolink') {
      const url = str(pick(node, 'fields', 'url')) ?? str(node.url);
      out.push(...inlineNodes(node.children, url ?? href));
      continue;
    }
    if (type === 'text') {
      const text = typeof node.text === 'string' ? node.text : '';
      if (!text) continue;
      const format = num(node.format) ?? 0;
      out.push({
        text,
        ...(format & FORMAT_BOLD ? { bold: true } : {}),
        ...(format & FORMAT_ITALIC ? { italic: true } : {}),
        ...(href ? { href } : {}),
      });
      continue;
    }
    out.push(...inlineNodes(node.children, href));
  }
  return out;
}

function headingLevel(tag: string | null): 2 | 3 | 4 {
  if (tag === 'h2') return 2;
  if (tag === 'h4' || tag === 'h5' || tag === 'h6') return 4;
  return 3;
}

function richBlocks(children: unknown): RichBlock[] {
  const out: RichBlock[] = [];
  for (const child of arr(children)) {
    const node = obj(child);
    if (!node) continue;
    const type = str(node.type);
    if (type === 'paragraph') {
      const inline = inlineNodes(node.children);
      if (inline.some(entry => entry.text.trim())) out.push({ type: 'paragraph', children: inline });
      continue;
    }
    if (type === 'heading') {
      const inline = inlineNodes(node.children);
      if (inline.length) out.push({ type: 'heading', level: headingLevel(str(node.tag)), children: inline });
      continue;
    }
    if (type === 'quote') {
      const inline = inlineNodes(node.children);
      if (inline.length) out.push({ type: 'quote', children: inline });
      continue;
    }
    if (type === 'list') {
      const items = arr(node.children)
        .map(item => inlineNodes(pick(item, 'children')))
        .filter(item => item.length > 0);
      if (items.length) out.push({ type: 'list', ordered: str(node.listType) === 'number', items });
      continue;
    }
    if (type === 'upload') {
      const asset = anyAsset(node.value);
      if (asset) out.push({ type: 'image', asset });
      continue;
    }
    // Anything else (columns, blocks, horizontal rules) contributes its text.
    out.push(...richBlocks(node.children));
  }
  return out;
}

/** Lexical, or any other CMS rich text, becomes the theme's own portable format. */
function richText(value: unknown): RichText | null {
  const root = pick(value, 'root');
  if (!root) {
    const plain = str(value);
    return plain ? [{ type: 'paragraph', children: [{ text: plain }] }] : null;
  }
  const blocks = richBlocks(pick(root, 'children'));
  return blocks.length ? blocks : null;
}

function inlineText(children: RichInline[]): string {
  return children.map(child => child.text).join('');
}

/** Rich text as paragraphs of plain text, which is what Artist.bio and Artist.statement hold. */
function plainText(value: unknown): string | null {
  const blocks = richText(value);
  if (!blocks) return str(value);
  const paragraphs: string[] = [];
  for (const block of blocks) {
    if (block.type === 'image') continue;
    if (block.type === 'list') {
      for (const item of block.items) paragraphs.push(inlineText(item));
      continue;
    }
    const text = inlineText(block.children).trim();
    if (text) paragraphs.push(text);
  }
  return paragraphs.length ? paragraphs.join('\n\n') : null;
}

// ---------------------------------------------------------------------------
// Small shared mappings
// ---------------------------------------------------------------------------

const CHAIN_BY_NAME: Record<string, Chain> = {
  ethereum: 'ethereum',
  eth: 'ethereum',
  mainnet: 'ethereum',
  base: 'base',
  tezos: 'tezos',
  bitcoin: 'bitcoin',
  ordinals: 'bitcoin',
  btc: 'bitcoin',
  solana: 'solana',
};

const EXPLORERS: Record<Chain, string> = {
  ethereum: 'https://etherscan.io',
  base: 'https://basescan.org',
  tezos: 'https://tzkt.io',
  bitcoin: 'https://ordinals.com',
  solana: 'https://solscan.io',
};

/** A CMS field left as a dash or "n/a" is an empty field, not a contract. */
function contractAddress(value: unknown): string | null {
  const text = str(value)?.toLowerCase();
  if (!text || text.length < 4 || /^(-+|n\/a|none|tba)$/.test(text)) return null;
  return text;
}

/** Marketplace slugs ("magiceden") become the names those marketplaces use ("MagicEden"). */
const marketNames = new Map<string, string>();

function marketplaceName(value: unknown): string | null {
  const slug = str(value);
  if (!slug) return null;
  return marketNames.get(slug.toLowerCase().replace(/[^a-z0-9]/g, '')) ?? sentenceCase(slug) ?? slug;
}

function toChain(value: unknown): Chain | null {
  const name = (title(value) ?? str(value) ?? '').toLowerCase();
  return CHAIN_BY_NAME[name] ?? null;
}

function toStandard(value: unknown): TokenStandard | null {
  const name = (title(value) ?? str(value) ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (name === 'erc721') return 'ERC721';
  if (name === 'erc1155') return 'ERC1155';
  if (name === 'ordinals' || name === 'ordinal') return 'ORDINAL';
  if (name === 'fa2') return 'FA2';
  return name ? 'OTHER' : null;
}

const EXHIBITION_KINDS: Record<string, ExhibitionKind> = {
  solo: 'solo',
  group: 'group',
  biennale: 'biennale',
  fair: 'fair',
  festival: 'festival',
  conference: 'conference',
  exhibition: 'other',
};

function toExhibitionKind(value: unknown): ExhibitionKind {
  const name = (title(value) ?? str(value) ?? '').toLowerCase();
  return EXHIBITION_KINDS[name] ?? 'other';
}

/** A CMS workflow state is not something to print on a page. */
const WORKFLOW_STATES = new Set(['published', 'draft', 'archived', 'pending', 'review']);

function projectStatus(value: unknown): string | null {
  const text = title(value) ?? str(value);
  if (!text || WORKFLOW_STATES.has(text.toLowerCase())) return null;
  return text;
}

const SKILL_CATEGORIES: SkillCategory[] = ['technical', 'software', 'artistic', 'conceptual', 'other'];

function toSkillCategory(value: unknown): SkillCategory {
  const name = (str(value) ?? '').toLowerCase();
  return SKILL_CATEGORIES.find(category => category === name) ?? 'other';
}

const RELATION_TYPES: Record<string, RecordType> = {
  nftcollections: 'series',
  artworks: 'work',
  installations: 'installation',
  immersives: 'immersive',
  physicalartworks: 'physical-work',
  exhibitions: 'exhibition',
  collaborations: 'collaboration',
  awards: 'award',
  publications: 'writing',
  pressandmedia: 'press',
};

function seoOf(value: unknown): Seo | null {
  const meta = obj(value);
  if (!meta) return null;
  const seo: Seo = {
    title: str(meta.title),
    description: str(meta.description),
    image: absolute(pick(meta, 'image', 'url')) ?? absolute(meta.image),
    keywords: (str(meta.keywords) ?? '')
      .split(',')
      .map(word => word.trim())
      .filter(Boolean),
  };
  return seo.title || seo.description || seo.image || seo.keywords.length ? seo : null;
}

function isContactHref(href: string): boolean {
  return /^(mailto|tel):/i.test(href);
}

/** Names that have a spelling of their own, so "INSTA" does not become "Insta". */
const BRAND_NAMES: Record<string, string> = {
  insta: 'Instagram',
  instagram: 'Instagram',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  x: 'X',
  twitter: 'X',
  opensea: 'OpenSea',
  superrare: 'SuperRare',
  magiceden: 'Magic Eden',
  foundation: 'Foundation',
  verse: 'Verse',
  discord: 'Discord',
  medium: 'Medium',
  vimeo: 'Vimeo',
  tiktok: 'TikTok',
  farcaster: 'Farcaster',
  github: 'GitHub',
  behance: 'Behance',
  email: 'Email',
};

function linkLabel(value: string | null): string | null {
  const text = str(value);
  if (!text) return null;
  return BRAND_NAMES[looseSlug(text)] ?? sentenceCase(text);
}

/** Two links are the same link when only the protocol, the www or a trailing slash differ. */
function sameLink(href: string): string {
  return href
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '');
}

function link(label: string | null, href: string | null, kind: ArtistLink['kind'] = 'other'): ArtistLink | null {
  const text = linkLabel(label);
  const url = str(href);
  if (!text || !url) return null;
  if (isContactHref(url) && !INCLUDE_CONTACT) {
    report.droppedContact += 1;
    return null;
  }
  return { label: text, href: url, kind };
}

// ---------------------------------------------------------------------------
// Story blocks
// ---------------------------------------------------------------------------

/** A block id has to be stable across runs, so it comes from the CMS row. */
function blockId(block: Json, index: number): string {
  return str(block.id) ?? `block-${index + 1}`;
}

function refOf(value: unknown): RecordRef | null {
  const entry = obj(value);
  if (!entry) return null;
  const type = RELATION_TYPES[str(entry.relationTo) ?? ''];
  const doc = obj(entry.value);
  if (!type || !doc) return null;
  if (type === 'work') {
    const chain = toChain(doc.blockchain);
    const contract = str(doc.contract);
    const tokenId = str(doc.tokenId);
    if (!chain || !contract || !tokenId) return null;
    return { type, key: `${chain}:${contract.toLowerCase()}:${tokenId}` };
  }
  const slug = str(doc.slug);
  return slug ? { type, key: slug } : null;
}

function textBlock(
  id: string,
  blockTitle: string | null,
  body: string | null,
  columns: 1 | 2 | 3 | 4 = 1,
  more: { title: string | null; value: unknown } | null = null,
  cta: ArtistLink | null = null,
): StoryBlock | null {
  if (!blockTitle && !body && !more?.value && !cta) return null;
  return {
    type: 'text',
    id,
    title: sentenceCase(blockTitle),
    columns,
    body,
    moreTitle: sentenceCase(more?.title ?? null),
    more: more ? richText(more.value) : null,
    cta,
  };
}

/** The CMS's layout blocks become the theme's story blocks. Anything unknown is left out and counted. */
function storyBlocks(value: unknown, owner: string): StoryBlock[] {
  const out: StoryBlock[] = [];
  const blocks = arr(value).filter(isObject);
  blocks.forEach((block, index) => {
    const id = blockId(block, index);
    const type = str(block.blockType);
    switch (type) {
      case 'LandscapeDescription':
      case 'QuoteBlock': {
        const columns = (num(block.column) ?? 1) as number;
        const text = textBlock(
          id,
          str(block.title),
          str(block.description),
          (columns >= 1 && columns <= 4 ? columns : 1) as 1 | 2 | 3 | 4,
          { title: str(block.additionalTitle), value: block.additionalDescription },
          link(str(block.urlTitle), str(block.url)),
        );
        if (text) out.push(text);
        break;
      }
      case 'LandscapeDisplay': {
        const asset = firstAsset(block.image, block.video);
        if (asset) out.push({ type: 'media', id, asset });
        else unresolved(owner, `${type}.image`);
        break;
      }
      case 'LandscapeGallery': {
        const items: Asset[] = [];
        for (const entry of arr(block.media)) {
          const caption = str(pick(entry, 'caption'));
          const asset = firstAsset(pick(entry, 'image'), pick(entry, 'video'));
          if (asset) items.push({ ...asset, caption });
        }
        if (items.length)
          out.push({
            type: 'gallery',
            id,
            title: sentenceCase(str(block.leftTitle) ?? str(block.title)),
            aside: sentenceCase(str(block.rightTitle)),
            items,
          });
        break;
      }
      case 'LandscapeRenders': {
        const text = textBlock(id + '-text', str(block.leftTitle) ?? str(block.title), str(block.description), 2);
        if (text) out.push(text);
        const items = assets(block.images ?? block.media);
        if (items.length) out.push({ type: 'gallery', id, title: null, aside: null, items });
        break;
      }
      case 'LandscapeDocumentary': {
        const video = videoAsset(block.video);
        if (video) {
          const poster = imageAsset(block.image);
          out.push({
            type: 'film',
            id,
            title: sentenceCase(str(block.title)),
            description: str(block.description),
            video: poster ? { ...video, poster: poster.src } : video,
          });
        } else unresolved(owner, `${type}.video`);
        break;
      }
      case 'LandscapePress': {
        // The same id PressItem.id gets, so the block and the list agree.
        const pressIds = arr(block.press)
          .map(entry => str(pick(entry, 'slug')) ?? (num(pick(entry, 'id')) === null ? null : `press-${num(pick(entry, 'id'))}`))
          .filter((entry): entry is string => Boolean(entry));
        if (pressIds.length) out.push({ type: 'press', id, title: sentenceCase(str(block.title)), pressIds });
        break;
      }
      case 'LandscapeProcess': {
        const steps: { title: string; body: RichText }[] = [];
        for (const entry of arr(block.items)) {
          const stepTitle = str(pick(entry, 'title'));
          const body = richText(pick(entry, 'content'));
          if (stepTitle && body) steps.push({ title: stepTitle, body });
        }
        if (steps.length)
          out.push({
            type: 'process',
            id,
            title: sentenceCase(str(block.title)),
            steps,
            asset: firstAsset(arr(block.images)[0], block.image, block.video),
          });
        break;
      }
      case 'LandscapeSketchbook': {
        const items = assets(block.images);
        if (items.length) out.push({ type: 'sketchbook', id, title: sentenceCase(str(block.title)), items });
        break;
      }
      case 'LandscapeChapter':
      case 'LandscapeExhibition': {
        const refs: RecordRef[] = [];
        const intro: { title: string | null; text: string }[] = [];
        for (const group of arr(block.relatedItems)) {
          for (const item of arr(pick(group, 'items'))) {
            const ref = refOf(item);
            if (ref) refs.push(ref);
          }
        }
        for (const item of arr(block.items)) {
          const text = str(pick(item, 'description'));
          if (text) intro.push({ title: str(pick(item, 'title')), text });
        }
        if (refs.length || intro.length)
          out.push({
            type: 'related',
            id,
            title: sentenceCase(str(block.leftTitle) ?? str(block.title)),
            intro,
            refs,
          });
        break;
      }
      case 'LandscapeEmbed': {
        const url = str(block.url);
        const provider = str(block.provider);
        if (url)
          out.push({
            type: 'embed',
            id,
            provider:
              provider === 'youtube' || provider === 'vimeo' || provider === 'x' || provider === 'link'
                ? provider
                : 'link',
            url,
            title: sentenceCase(str(block.title)) ?? 'Watch',
            context: str(block.context),
            attribution: str(block.attribution),
            poster: imageAsset(block.poster),
          });
        break;
      }
      case 'LandscapeChapterHero': {
        const heroTitle = sentenceCase(str(block.mainTitle) ?? str(block.title));
        if (heroTitle)
          out.push({
            type: 'chapter',
            id,
            title: heroTitle,
            text: str(block.centerDescription),
            background: imageAsset(block.image),
            labels: arr(block.labels)
              .map(entry => link(str(pick(entry, 'title')) ?? str(entry), str(pick(entry, 'url')) ?? '#'))
              .filter((entry): entry is ArtistLink => entry !== null),
          });
        break;
      }
      case 'LandscapeImmersive':
      case 'LandscapeVisionDisplay': {
        const video = videoAsset(block.video);
        if (video) {
          const room = str(block.roomType) === 'gallery' || type === 'LandscapeVisionDisplay' ? 'gallery' : 'cylinder';
          out.push({
            type: 'immersive',
            id,
            title: sentenceCase(str(block.title)),
            poster: imageAsset(block.posterImage) ?? imageAsset(block.image),
            video,
            room,
          });
        } else unresolved(owner, `${type}.video`);
        break;
      }
      case 'VisionsSpecial':
        break;
      default:
        note(`${owner}: layout block "${type ?? 'unknown'}" has no mapping, left out`);
    }
  });
  return out;
}

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

interface BaseFields {
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  year: number | null;
  cover: Asset | null;
  tags: string[];
  featured: boolean;
  story: StoryBlock[];
  seo: Seo | null;
}

function baseFields(doc: Json, fallbackYear: unknown = null): BaseFields | null {
  const slug = str(doc.slug);
  const recordTitle = str(doc.title) ?? str(doc.name);
  if (!slug || !recordTitle) return null;
  return {
    slug,
    title: recordTitle,
    subtitle: str(doc.subtitle),
    description: str(doc.description),
    year: num(doc.year) ?? yearOf(fallbackYear) ?? yearOf(doc.date),
    cover: firstAsset(doc.coverImage, doc.cardImage, doc.image),
    tags: titles(doc.tags),
    featured: bool(doc.featured),
    story: storyBlocks(doc.layout, `${str(doc.slug) ?? 'record'}`),
    seo: seoOf(doc.meta),
  };
}

function mapInstallation(doc: Json): Installation | null {
  const base = baseFields(doc);
  if (!base) return null;
  return {
    ...base,
    medium: str(doc.medium),
    dimensions: str(doc.dimensions),
    materials: titles(doc.materials),
    location: str(doc.location),
    curator: str(doc.curator),
    photos: assets(doc.photos),
    videos: [...assets(doc.videos), ...(videoAsset(doc.video) ? [videoAsset(doc.video) as Asset] : [])],
  };
}

function mapImmersive(doc: Json): Immersive | null {
  const base = baseFields(doc, doc.date);
  if (!base) return null;
  return {
    ...base,
    platform: str(doc.platform),
    duration: str(doc.duration),
    status: projectStatus(doc.status),
    date: isoDate(doc.date),
    curator: str(doc.curator),
    experienceUrl: str(doc.experienceUrl),
    requirements: str(doc.requirements),
    photos: assets(doc.photos),
    videos: [...assets(doc.videos), ...(videoAsset(doc.video) ? [videoAsset(doc.video) as Asset] : [])],
  };
}

function mapPhysicalWork(doc: Json, seriesSlugById: Map<string, string>): PhysicalWork | null {
  const base = baseFields(doc);
  if (!base) return null;
  const seriesKey = str(pick(doc, 'series', 'slug')) ?? str(doc.series);
  return {
    ...base,
    medium: str(doc.medium),
    dimensions: str(doc.dimensions),
    materials: titles(doc.materials),
    location: str(doc.location),
    availability: projectStatus(doc.availability),
    seriesSlug: seriesKey ? (seriesSlugById.get(seriesKey) ?? seriesKey) : null,
    workIds: arr(doc.artworks)
      .map(entry => {
        const ref = refOf({ relationTo: 'artworks', value: entry });
        return ref?.key ?? null;
      })
      .filter((entry): entry is string => entry !== null),
  };
}

/** Statuses that mean a record is not for the public yet, or no longer. */
const UNPUBLISHED_STATES = new Set(['draft', 'unpublished', 'hidden', 'archived']);

function mapCollaboration(doc: Json): Collaboration | null {
  const base = baseFields(doc, doc.date);
  if (!base) return null;
  // The CMS has no drafts for collaborations; its status field is how one is taken down.
  if (UNPUBLISHED_STATES.has((title(doc.status) ?? str(doc.status) ?? '').toLowerCase())) return null;
  return {
    ...base,
    kind: title(doc.type) ?? str(doc.type),
    status: projectStatus(doc.status),
    date: isoDate(doc.date),
    partners: arr(doc.partners)
      .map(entry => ({
        name: str(pick(entry, 'name')) ?? '',
        role: str(pick(entry, 'role')),
        url: str(pick(entry, 'url')),
      }))
      .filter(partner => partner.name),
    highlights: arr(doc.highlights)
      .map(entry => str(pick(entry, 'highlight')) ?? str(entry))
      .filter((entry): entry is string => Boolean(entry)),
    projectUrl: str(doc.projectUrl),
    about: richText(doc.aboutProject),
    photos: assets(doc.photos),
    videos: [...assets(doc.videos), ...(videoAsset(doc.video) ? [videoAsset(doc.video) as Asset] : [])],
  };
}

/** The words the `kind` field already carries, so a tag never repeats one. */
const EXHIBITION_KIND_WORDS = new Set(['solo', 'group', 'fair', 'biennale', 'festival', 'conference', 'screening', 'museum']);

/**
 * The same show, entered twice.
 *
 * A CMS collects an exhibition once as a record with a page and again as a
 * line on the CV, and both arrive here. Two entries for the same title, year
 * and venue are one show, and the one with a slug is the one to keep: it is
 * the one with a page behind it.
 */
function dedupeExhibitions(exhibitions: Exhibition[]): Exhibition[] {
  const byShow = new Map<string, Exhibition>();
  const order: string[] = [];
  for (const show of exhibitions) {
    const key = [show.title, show.year, show.venue ?? '', show.city ?? '']
      .join('|')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
    const existing = byShow.get(key);
    if (!existing) {
      byShow.set(key, show);
      order.push(key);
      continue;
    }
    // Keep the richer record: a page beats no page, then a cover, then a story.
    const better =
      (show.slug ? 2 : 0) + (show.cover ? 1 : 0) > (existing.slug ? 2 : 0) + (existing.cover ? 1 : 0) ? show : existing;
    byShow.set(key, {
      ...better,
      featured: better.featured || existing.featured || show.featured,
      // A featured record and its own CV line are one show that is both.
      history: existing.history !== false || show.history !== false,
    });
    report.duplicateExhibitions += 1;
  }
  return order.map(key => byShow.get(key)!).filter((show): show is Exhibition => Boolean(show));
}

function mapExhibition(doc: Json): Exhibition | null {
  const showTitle = str(doc.title);
  if (!showTitle) return null;
  const start = isoDate(pick(doc, 'duration', 'startDate'));
  const end = isoDate(pick(doc, 'duration', 'endDate'));
  const story = storyBlocks(doc.layout, str(doc.slug) ?? showTitle);
  const about = richText(doc.about);
  const hasPage = story.length > 0 || about !== null;
  return {
    id: str(doc.slug) ?? `exhibition-${num(doc.id) ?? showTitle}`,
    year: yearOf(start) ?? num(doc.year) ?? new Date().getUTCFullYear(),
    title: showTitle,
    venue: str(doc.gallery),
    city: str(doc.city),
    country: str(doc.country),
    kind: toExhibitionKind(doc.type),
    url: str(doc.url) ?? str(doc.virtualTourUrl),
    slug: hasPage ? str(doc.slug) : null,
    featured: bool(doc.featured),
    // The CMS keeps featured shows out of its history: they are the cards, and
    // the CV lines are the history.
    history: !bool(doc.featured),
    startDate: start,
    endDate: end,
    format: str(doc.format),
    event: title(doc.event) ?? str(doc.event),
    curator: str(doc.curator),
    description: str(doc.description),
    aboutTitle: str(doc.aboutTitle),
    about,
    cover: firstAsset(doc.coverImage, doc.cardImage),
    // A tag that only restates the kind ("Solo" on a solo show) is noise; one
    // that contradicts it ("Solo" on a fair) is a card that argues with
    // itself, and the kind is the field the site actually reads.
    tags: titles(doc.tags).filter(tag => !EXHIBITION_KIND_WORDS.has(tag.trim().toLowerCase())),
    virtualTourUrl: str(doc.virtualTourUrl),
    pressKitUrl: absolute(pick(doc, 'pressKitfile', 'url')),
    highlights: arr(doc.highlights)
      .map(entry => str(pick(entry, 'highlight')) ?? str(entry))
      .filter((entry): entry is string => Boolean(entry)),
    story,
    seo: seoOf(doc.meta),
  };
}

function mapAward(doc: Json): Award | null {
  const awardTitle = str(doc.title);
  if (!awardTitle) return null;
  const story = storyBlocks(doc.layout, str(doc.slug) ?? awardTitle);
  return {
    id: str(doc.slug) ?? `award-${num(doc.id) ?? awardTitle}`,
    year: num(doc.year) ?? yearOf(doc.dateReceived) ?? new Date().getUTCFullYear(),
    title: awardTitle,
    organization: str(doc.organization),
    result: str(doc.prize) ?? title(doc.status),
    url: str(doc.awardUrl),
    slug: story.length ? str(doc.slug) : null,
    description: str(doc.description),
    category: str(doc.category) ?? title(doc.type),
    prize: str(doc.prize),
    ceremonyLocation: str(pick(doc, 'ceremony', 'location')),
    pressReleaseUrl: absolute(pick(doc, 'pressReleaseFile', 'url')),
    cover: firstAsset(doc.coverImage, doc.cardImage, doc.certificateImage),
    project: refOf(doc.project),
    story,
    seo: seoOf(doc.meta),
  };
}

function mapWriting(doc: Json): Writing | null {
  const base = baseFields(doc, doc.publishDate);
  if (!base) return null;
  return {
    ...base,
    cover: base.cover ?? imageAsset(doc.image),
    authors: arr(doc.authors)
      .map(entry => str(pick(entry, 'author')) ?? str(pick(entry, 'name')) ?? str(entry))
      .filter((entry): entry is string => Boolean(entry)),
    abstract: richText(doc.abstractContent),
    body: richText(doc.content),
    publishedIn: title(doc.publishedIn) ?? str(doc.publishedIn),
    publishedAt: isoDate(doc.publishDate),
    category: title(doc.category) ?? str(doc.category),
    doi: str(doc.doi),
    pdfUrl: absolute(pick(doc, 'pdfFile', 'url')),
    originalUrl: str(doc.originalLink) === '#' ? null : str(doc.originalLink),
    references: arr(doc.references)
      .map(entry => str(pick(entry, 'reference')) ?? str(entry))
      .filter((entry): entry is string => Boolean(entry)),
  };
}

const PRESS_KINDS: Record<string, PressKind> = { online: 'article', article: 'article', video: 'video', podcast: 'podcast' };

/** An embed field holds either a URL or an iframe; a player only needs the URL. */
function embedUrl(value: unknown): string | null {
  const text = str(value);
  if (!text) return null;
  if (/^https?:\/\//i.test(text)) return text;
  const match = /src=["']([^"']+)["']/i.exec(text);
  return match ? (absolute(match[1]) ?? match[1]) : null;
}

function mapPress(doc: Json): PressItem | null {
  const pressTitle = str(doc.title);
  if (!pressTitle) return null;
  const date = isoDate(doc.publishDate);
  const body = richText(doc.content);
  const media = absolute(pick(doc, 'videoMedia', 'url')) ?? absolute(pick(doc, 'podcastMedia', 'url'));
  const embed = embedUrl(doc.embedCode);
  const slug = str(doc.slug);
  return {
    id: slug ?? `press-${num(doc.id) ?? pressTitle}`,
    year: yearOf(date) ?? new Date().getUTCFullYear(),
    date,
    title: pressTitle,
    outlet: str(doc.publisher) ?? title(doc.category) ?? 'Press',
    url: str(doc.originalLink),
    slug: body || media || embed ? slug : null,
    kind: PRESS_KINDS[str(doc.contentType) ?? 'online'] ?? 'article',
    category: title(doc.category),
    description: str(doc.description),
    image: imageAsset(doc.image),
    author: str(doc.author),
    minutes: num(doc.readTime),
    body,
    embedUrl: embed,
    mediaUrl: media,
    featured: bool(doc.featured),
    tags: titles(doc.tags),
    relatedSeries: arr(doc.collections)
      .map(entry => str(pick(entry, 'slug')))
      .filter((entry): entry is string => Boolean(entry)),
  };
}

// ---------------------------------------------------------------------------
// Series and works
// ---------------------------------------------------------------------------

interface SeriesPatch {
  cmsSlug: string;
  contract: string | null;
  chain: Chain | null;
  patch: Partial<Series>;
  workCount: number | null;
  cover: Media | null;
  parentCmsSlug: string | null;
  isDraft: boolean;
  name: string;
}

function readSeriesDoc(doc: Json): SeriesPatch | null {
  const slug = str(doc.slug);
  const name = str(doc.name);
  if (!slug || !name) return null;
  const required = obj(doc.requiredInformation);
  const patch: Partial<Series> = {
    name,
    description: str(doc.description),
    categories: titles(doc.artCategory),
    standard: toStandard(doc.tokenStandard),
    editionSize: num(doc.totalSupply),
    inscriptionAddress: str(pick(required, 'collectionInscriptionAddress')),
    platform: marketplaceName(pick(required, 'datamarket')),
    collectorCount: num(doc.uniqueHolders),
    featured: bool(doc.featured),
    hidden: bool(doc.hidelisting),
    year: yearOf(doc.createdDate) ?? yearOf(doc.startDate),
    marketUrl: str(doc.marketUrl),
    story: storyBlocks(doc.layout, slug),
    teaser: videoAsset(doc.videoTeaser),
    seo: seoOf(doc.meta),
  };
  return {
    cmsSlug: slug,
    contract: contractAddress(pick(required, 'contractAddress')),
    chain: toChain(pick(required, 'blockchain')),
    patch,
    workCount: num(doc.totalSupply),
    cover: assetToMedia(firstAsset(doc.cardImage, doc.bannerImage)),
    parentCmsSlug: str(pick(doc, 'parentCollection', 'slug')),
    isDraft: str(doc.status) === 'draft',
    name,
  };
}

/** Empty values never overwrite what the importer found. */
function applyPatch(target: Series, patch: Partial<Series>): void {
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    Reflect.set(target, key, value);
  }
}

function workKey(contract: string, tokenId: string): string {
  return `${contract.toLowerCase()}:${tokenId}`;
}

interface WorkDocResult {
  work: Work | null;
  patch: Partial<Work> | null;
  key: string;
  /** The collection the CMS filed this work under, if its contract agrees. */
  seriesCmsSlug: string | null;
  /** The contract, so a work whose collection disagrees can still find its series. */
  contract: string | null;
  skip: string | null;
}

function readWorkDoc(doc: Json): WorkDocResult {
  const tokenId = str(doc.tokenId);
  const name = str(doc.name);
  const collection = obj(doc.collection);
  const seriesCmsSlug = str(pick(collection, 'slug'));
  const id = `artwork-${num(doc.id) ?? '?'}`;

  /**
   * An Ordinals work has no contract: the inscription is its identity, so it
   * takes the contract's place in Work.id and the EVM contract the CMS
   * sometimes carries from an unrelated mint is ignored.
   */
  const ordinalId = str(pick(doc, 'ordinals', 'ordinalid'));
  const contract = ordinalId ?? str(doc.contract);
  if (!contract || !tokenId || !name)
    return { work: null, patch: null, key: id, seriesCmsSlug, contract, skip: 'no contract, inscription, token id or name' };
  const key = workKey(contract, tokenId);
  if (!collection) return { work: null, patch: null, key, seriesCmsSlug, contract, skip: 'no collection' };

  // A collection that names a different contract has not been kept up to
  // date; the work still belongs to whichever series holds its contract.
  const collectionContract = contractAddress(pick(collection, 'requiredInformation', 'contractAddress'));
  const filedCorrectly = ordinalId !== null || !collectionContract || collectionContract === contract.toLowerCase();

  const chain = ordinalId
    ? 'bitcoin'
    : (toChain(doc.blockchain) ?? toChain(pick(collection, 'requiredInformation', 'blockchain')));
  if (!chain)
    return {
      work: null,
      patch: null,
      key,
      seriesCmsSlug,
      contract,
      skip: `chain "${title(doc.blockchain) ?? '?'}" is not one this theme renders`,
    };

  const displayImage = related(doc.nftDisplayImage);
  const fullImage = related(doc.nftImage);
  const file = related(doc.nftFile);
  const video = related(doc.nftVideo);
  const still = absolute(displayImage?.url) ?? absolute(doc.nftDisplayImageUrl);
  const full = absolute(fullImage?.url) ?? absolute(doc.nftImageUrl) ?? still;
  const html = str(file?.mimeType)?.includes('html') ? absolute(file?.url) : null;
  const videoSrc = absolute(video?.url) ?? absolute(doc.nftDisplayAnimationUrl);
  const kind: Media['kind'] = html ? 'html' : videoSrc ? 'video' : still ? 'image' : 'unknown';

  const traits: Trait[] = arr(doc.traits)
    .map(entry => ({ name: str(pick(entry, 'traitType')) ?? str(pick(entry, 'name')) ?? '', value: str(pick(entry, 'value')) ?? '' }))
    .filter(trait => trait.name && trait.value);

  const fileDoc = file ?? fullImage ?? displayImage;
  const standard = ordinalId ? 'ORDINAL' : (toStandard(doc.standard) ?? 'OTHER');
  const inscription = str(pick(doc, 'ordinals', 'inscriptionNumber'));

  /**
   * An inscription's market link in this CMS points at whichever collection
   * page was last imported, so an Ordinals work gets the item's own URL.
   */
  const marketUrl = ordinalId ? `https://magiceden.io/ordinals/item-details/${ordinalId}` : str(doc.marketLink);

  const patch: Partial<Work> = {
    title: name,
    description: str(doc.description) ?? str(pick(collection, 'description')),
    mintedAt: isoDate(doc.artworkCreatedDate),
    marketUrl,
    categories: unique([...titles(doc.artCategory), ...titles(pick(collection, 'artCategory'))]),
    traits,
    file: fileDoc ? { format: str(fileDoc.mimeType), bytes: num(fileDoc.filesize) } : null,
    oneOfOne: bool(doc.oneofone),
    featured: bool(doc.featured),
    hidden: bool(doc.hidelisting),
    platform: ordinalId ? 'Magic Eden' : title(doc.marketplace),
    inscription,
  };

  const media: Media = {
    kind,
    still,
    full,
    animation: html ?? videoSrc,
    width: num(displayImage?.width) ?? num(fullImage?.width),
    height: num(displayImage?.height) ?? num(fullImage?.height),
  };

  const explorer = EXPLORERS[chain];
  const work: Work = {
    id: `${chain}:${contract.toLowerCase()}:${tokenId}`,
    seriesSlug: '',
    title: name,
    description: patch.description ?? null,
    chain,
    contract: contract.toLowerCase(),
    tokenId,
    standard,
    media,
    mintedAt: patch.mintedAt ?? null,
    explorerUrl: ordinalId
      ? `${explorer}/inscription/${ordinalId}`
      : `${explorer}/nft/${contract.toLowerCase()}/${tokenId}`,
    marketUrl: patch.marketUrl ?? null,
    editionSize: standard === 'ERC1155' ? num(pick(collection, 'totalSupply')) : null,
  };

  return { work, patch, key, seriesCmsSlug: filedCorrectly ? seriesCmsSlug : null, contract, skip: null };
}

/** Media is only patched onto an importer work when the importer found nothing better. */
function patchWorkMedia(target: Work, media: Media): void {
  target.media = {
    kind: target.media.kind === 'unknown' ? media.kind : target.media.kind,
    still: target.media.still ?? media.still,
    full: target.media.full ?? media.full,
    animation: target.media.animation ?? media.animation,
    width: target.media.width ?? media.width,
    height: target.media.height ?? media.height,
  };
}

function applyWorkPatch(target: Work, patch: Partial<Work>): void {
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (value === false) continue;
    Reflect.set(target, key, value);
  }
}

// ---------------------------------------------------------------------------
// The artist, the CV, the landing page and the settings
// ---------------------------------------------------------------------------

function mapWallets(value: unknown): ArtistWallet[] {
  const seen = new Set<Chain>();
  const wallets: ArtistWallet[] = [];
  for (const entry of arr(value)) {
    const address = str(pick(entry, 'walletAddress'));
    const chain = toChain(pick(entry, 'blockchains'));
    if (!address || !chain) continue;
    wallets.push({ address, chain, role: seen.has(chain) ? 'secondary' : 'primary' });
    seen.add(chain);
  }
  return wallets;
}

/** An icon field holds either a name from an icon set or a pasted SVG. Only a name is worth keeping. */
function iconName(value: unknown): string | null {
  const text = str(value);
  if (!text || text.startsWith('<') || text.length > 32) return null;
  return text;
}

/** A handle is typed in capitals as often as not; a name with spaces is a phrase, not a handle. */
function handleText(value: unknown): string | null {
  const text = str(value);
  if (!text) return null;
  if (/\s/.test(text)) return sentenceCase(text);
  return text === text.toUpperCase() ? text.toLowerCase() : text;
}

/**
 * The registrable part of a host, so orkhan.design and www.orkhan.art both
 * reduce to one name that can be compared against the install's own.
 */
function rootHost(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

/**
 * The artist's other sites, so they can be marked as theirs.
 *
 * A link to the same person's own domain is not a social profile, it is the
 * same person, and the theme gives those rel="me". A host is the artist's
 * when it shares a name with the site being snapshotted: orkhan.art and
 * orkhan.design are one person, x.com is not.
 */
function isOwnSite(url: string, base: string): boolean {
  const host = rootHost(url);
  const own = rootHost(base);
  if (!host || !own) return false;
  const name = own.split('.')[0];
  return host === own || (name.length > 3 && host.split('.')[0] === name);
}

function socialLinks(value: unknown, kind: ArtistLink['kind']): ArtistLink[] {
  const out: ArtistLink[] = [];
  for (const entry of arr(value)) {
    const url = str(pick(entry, 'url'));
    const own = url ? isOwnSite(url, DEFAULT_BASE) : false;
    const base = link(str(pick(entry, 'title')), url, own ? 'site' : kind);
    if (!base) continue;
    if (out.some(existing => sameLink(existing.href) === sameLink(base.href))) continue;
    out.push({ ...base, icon: iconName(pick(entry, 'icon')), handle: handleText(pick(entry, 'username')) });
  }
  return out;
}

function mapArtist(existing: Artist, about: Json | null, cv: Json | null, landing: Json | null): Artist {
  const images = assets(pick(about, 'aboutImages'));
  const links: ArtistLink[] = [
    ...socialLinks(pick(landing, 'socialLinks'), 'social'),
    ...socialLinks(pick(landing, 'marketplaceLinks'), 'marketplace'),
  ];
  for (const [label, handle, prefix] of [
    ['X', str(pick(cv, 'x')), 'https://x.com/'],
    ['Instagram', str(pick(cv, 'instagram')), 'https://instagram.com/'],
    ['LinkedIn', str(pick(cv, 'linkedin')), 'https://linkedin.com/in/'],
  ] as const) {
    if (!handle) continue;
    const href = `${prefix}${handle.replace(/^@/, '')}`;
    if (links.some(entry => sameLink(entry.href) === sameLink(href))) continue;
    links.push({ label, href, kind: 'social', icon: label, handle: `@${handle.replace(/^@/, '')}` });
  }

  const partners: PartnerGroup[] = [];
  for (const group of arr(pick(about, 'collaborationsAndPartners'))) {
    const category = title(pick(group, 'partnerCategories'));
    const groupLinks = arr(pick(group, 'links'))
      .map(entry => link(str(pick(entry, 'title')), str(pick(entry, 'url')), 'site'))
      .filter((entry): entry is ArtistLink => entry !== null);
    if (category && groupLinks.length) partners.push({ category, links: groupLinks });
  }

  const pressKitBody = richText(pick(about, 'press', 'leftContent'));
  const pressKitFile = absolute(pick(about, 'press', 'pdfFile', 'url'));
  const pressKitTitle = str(pick(about, 'press', 'leftTitle'));

  return {
    ...existing,
    name: str(pick(cv, 'fullName')) ?? existing.name,
    statement: plainText(pick(about, 'artistStatement')) ?? existing.statement,
    bio: plainText(pick(about, 'artistBiography')) ?? existing.bio,
    location: str(pick(cv, 'location')) ?? existing.location,
    portrait: absolute(pick(about, 'artistImage', 'url')) ?? images[0]?.src ?? existing.portrait,
    links: links.length ? links : existing.links,
    wallets: mapWallets(pick(about, 'officialMintingAddresses')).length
      ? mapWallets(pick(about, 'officialMintingAddresses'))
      : existing.wallets,
    description: str(pick(about, 'description')),
    images,
    email: INCLUDE_CONTACT ? str(pick(cv, 'email')) : null,
    securityNotice: str(pick(about, 'securityNoticeTitle')),
    researchAreas: arr(pick(about, 'areasOfResearch'))
      .map(entry => ({
        title: str(pick(entry, 'title')) ?? '',
        description: str(pick(entry, 'description')),
        icon: iconName(pick(entry, 'icon')),
      }))
      .filter(area => area.title),
    partners,
    pressKit:
      pressKitBody || pressKitFile || pressKitTitle
        ? { title: pressKitTitle, body: pressKitBody, fileUrl: pressKitFile }
        : null,
  };
}

/**
 * The CV rows carry a track ("art", "design" or "both") because this artist
 * keeps two CVs. Only the art practice belongs in a catalogue raisonne, so
 * the filter lives here, in the snapshot, and never in the theme.
 */
const CV_TRACKS = new Set(['both', 'art']);

function onArtTrack(entry: unknown): boolean {
  const track = str(pick(entry, 'track'));
  return !track || CV_TRACKS.has(track);
}

function mapCv(cv: Json | null): Cv | null {
  if (!cv) return null;
  const experience: CvRole[] = arr(cv.experience)
    .filter(onArtTrack)
    .map(entry => ({
      title: str(pick(entry, 'title')) ?? '',
      organization: str(pick(entry, 'organization')),
      location: str(pick(entry, 'location')),
      startDate: isoDate(pick(entry, 'startDate')),
      endDate: isoDate(pick(entry, 'endDate')),
      description: str(pick(entry, 'description')),
      highlights: arr(pick(entry, 'highlights'))
        .map(item => str(pick(item, 'highlight')) ?? str(item))
        .filter((item): item is string => Boolean(item)),
    }))
    .filter(role => role.title);

  const education: CvEducation[] = arr(cv.education)
    .filter(onArtTrack)
    .map(entry => ({
      title: str(pick(entry, 'title')) ?? '',
      institution: str(pick(entry, 'institution')),
      location: str(pick(entry, 'location')),
      startDate: isoDate(pick(entry, 'startDate')),
      endDate: isoDate(pick(entry, 'endDate')),
      description: str(pick(entry, 'description')),
    }))
    .filter(entry => entry.title);

  const skills: CvSkill[] = arr(cv.skills)
    .filter(onArtTrack)
    .map(entry => ({ name: str(pick(entry, 'name')) ?? '', category: toSkillCategory(pick(entry, 'category')) }))
    .filter(skill => skill.name);

  if (!experience.length && !education.length && !skills.length) return null;
  return {
    experience,
    education,
    skills,
    updatedAt: isoDate(cv.lastUpdated),
    pdfUrl: absolute(pick(cv, 'pdfFile', 'url')),
  };
}

function mapClients(value: unknown): Client[] {
  return arr(value)
    .slice()
    .sort((a, b) => (num(pick(a, 'order')) ?? 0) - (num(pick(b, 'order')) ?? 0))
    .map(entry => ({
      name: str(pick(entry, 'name')) ?? '',
      logo: imageAsset(pick(entry, 'logo')),
      url: str(pick(entry, 'url')),
    }))
    .filter(client => client.name);
}

function mapCommissions(page: Json | null): CommissionsPage | null {
  if (!page) return null;
  const services: Service[] = arr(page.services)
    .slice()
    .sort((a, b) => (num(pick(a, 'order')) ?? 0) - (num(pick(b, 'order')) ?? 0))
    .map(entry => ({
      title: sentenceCase(str(pick(entry, 'title'))) ?? '',
      description: sentenceCase(str(pick(entry, 'description'))),
      items: arr(pick(entry, 'items'))
        .map(item => str(pick(item, 'item')) ?? str(item))
        .filter((item): item is string => Boolean(item)),
    }))
    .filter(service => service.title);

  const pageTitle = str(page.heroTitle);
  if (!pageTitle) return null;
  return {
    title: pageTitle,
    description: str(page.heroDescription),
    cta: link(str(page.startProjectLabel), str(page.startProjectUrl), 'email'),
    featured: arr(page.featuredCollaborations)
      .map(entry => str(pick(entry, 'slug')))
      .filter((entry): entry is string => Boolean(entry)),
    clients: mapClients(page.clients),
    services,
  };
}

/**
 * The zone a studio city is in, so the home page's clock reads the studio's
 * own time rather than UTC. An unknown place gets no zone at all and the
 * clock is not shown: a wrong time beside a city name is worse than none.
 */
const CITY_ZONES: Record<string, string> = {
  'san francisco': 'America/Los_Angeles',
  'los angeles': 'America/Los_Angeles',
  seattle: 'America/Los_Angeles',
  'new york': 'America/New_York',
  brooklyn: 'America/New_York',
  toronto: 'America/Toronto',
  'mexico city': 'America/Mexico_City',
  london: 'Europe/London',
  paris: 'Europe/Paris',
  berlin: 'Europe/Berlin',
  amsterdam: 'Europe/Amsterdam',
  zurich: 'Europe/Zurich',
  milan: 'Europe/Rome',
  rome: 'Europe/Rome',
  venice: 'Europe/Rome',
  madrid: 'Europe/Madrid',
  lisbon: 'Europe/Lisbon',
  istanbul: 'Europe/Istanbul',
  baku: 'Asia/Baku',
  dubai: 'Asia/Dubai',
  'abu dhabi': 'Asia/Dubai',
  mumbai: 'Asia/Kolkata',
  singapore: 'Asia/Singapore',
  'hong kong': 'Asia/Hong_Kong',
  shenzhen: 'Asia/Shanghai',
  shanghai: 'Asia/Shanghai',
  seoul: 'Asia/Seoul',
  tokyo: 'Asia/Tokyo',
  sydney: 'Australia/Sydney',
  melbourne: 'Australia/Melbourne',
};

function zoneForPlace(place: string | null): string | null {
  if (!place) return null;
  const parts = place.split(',').map(part => part.trim().toLowerCase());
  for (const part of parts) if (CITY_ZONES[part]) return CITY_ZONES[part];
  return null;
}

/**
 * A stat whose label names something the catalogue counts is rewritten as
 * that token, so the home page can never print 4 installations while the
 * About page prints 5. Only a bare number is replaced: "2,700+" is a claim
 * the artist made, not a count, and it is left alone.
 */
const STAT_TOKENS: Record<string, string> = {
  artwork: '{{artworks}}',
  artworks: '{{artworks}}',
  work: '{{artworks}}',
  works: '{{artworks}}',
  series: '{{series}}',
  collection: '{{series}}',
  collections: '{{series}}',
  installation: '{{installations}}',
  installations: '{{installations}}',
  exhibition: '{{exhibitions}}',
  exhibitions: '{{exhibitions}}',
  award: '{{awards}}',
  awards: '{{awards}}',
  collector: '{{collectors}}',
  collectors: '{{collectors}}',
};

function liveStatValue(label: string, value: string): string {
  if (!/^\d[\d,. ]*$/.test(value.trim())) return value;
  return STAT_TOKENS[label.trim().toLowerCase()] ?? value;
}

function mapLanding(landing: Json | null, partners: Client[], timezone: string | null, city: string | null): Landing | null {
  if (!landing) return null;
  const headline = str(landing.heroHeading);
  if (!headline) return null;

  const showreelVideo = videoAsset(landing.showreel);
  const stats: Stat[] = arr(landing.stats)
    .map(entry => {
      const label = sentenceCase(str(pick(entry, 'label'))) ?? '';
      return {
        label,
        value: liveStatValue(label, str(pick(entry, 'value')) ?? ''),
        description: sentenceCase(str(pick(entry, 'description'))),
      };
    })
    .filter(stat => stat.label && stat.value)
    .slice(0, 6);

  const featured = arr(landing.featuredProjects)
    .map(refOf)
    .filter((ref): ref is RecordRef => ref !== null)
    .slice(0, 6);

  const announcements: Announcement[] = arr(landing.footerAnnouncements)
    .map((entry, index) => ({
      id: str(pick(entry, 'id')) ?? `announcement-${index + 1}`,
      title: str(pick(entry, 'title')) ?? '',
      description: str(pick(entry, 'description')),
      date: isoDate(pick(entry, 'date')),
      image: imageAsset(pick(entry, 'image')),
      url: str(pick(entry, 'url')),
    }))
    .filter(entry => entry.title);

  const events: SiteEvent[] = arr(landing.footerUpcomingEvents)
    .map((entry, index) => ({
      id: str(pick(entry, 'id')) ?? `event-${index + 1}`,
      title: str(pick(entry, 'title')) ?? '',
      description: str(pick(entry, 'description')),
      location: str(pick(entry, 'location')),
      startDate: isoDate(pick(entry, 'date')) ?? isoDate(pick(entry, 'startDate')),
      endDate: isoDate(pick(entry, 'endDate')),
      image: imageAsset(pick(entry, 'image')),
      url: str(pick(entry, 'url')),
      statedStatus: str(pick(entry, 'status')),
    }))
    .filter(entry => entry.title);

  const phrases = arr(landing.matrixPhrases)
    .map(entry => str(pick(entry, 'phrase')) ?? str(entry))
    .filter((entry): entry is string => Boolean(entry));

  const newsletterTitle = sentenceCase(str(landing.newsletterTitle));

  const enabled: Record<LandingSectionId, boolean> = {
    hero: true,
    showreel: showreelVideo !== null,
    stats: stats.length > 0,
    featured: featured.length > 0,
    catalogue: true,
    partners: partners.length > 0,
    news: announcements.length > 0 || events.length > 0,
  };
  const order: LandingSectionId[] = ['hero', 'showreel', 'stats', 'featured', 'catalogue', 'partners', 'news'];
  const sections: LandingSection[] = order.map(id => ({ id, title: null, enabled: enabled[id] }));

  return {
    sections,
    hero: {
      eyebrow: str(landing.heroGreeting),
      headline,
      subtitle: str(landing.heroSubtitle),
      primaryCta: { label: 'View the catalogue', href: '/works', kind: 'site' },
      secondaryCta: { label: "Let's collaborate", href: '/commissions', kind: 'site' },
    },
    ticker: phrases.length ? { timezone: timezone ?? zoneForPlace(city), city, coordinates: null, phrases } : null,
    showreel: showreelVideo ? { video: showreelVideo, poster: imageAsset(landing.showreelThumbnail) } : null,
    stats,
    featured,
    partners,
    announcements,
    events,
    newsletter: newsletterTitle ? { title: newsletterTitle, description: str(landing.newsletterDescription) } : null,
  };
}

/**
 * The keys the CMS uses for its pages are not always the routes this theme
 * has. Keys with no page in Wave 1 (analytics, guild, collectors, store) are
 * kept as they are, for the waves that add them.
 */
const PAGE_KEYS: Record<string, string> = {
  collections: 'works',
  collabs: 'commissions',
  physicals: 'physical-works',
};

/**
 * The routes this theme serves. A CMS row for anything else (a page a later
 * wave adds, or a scratch row called "temp") describes no page here, so it
 * is not copied: an unused entry can only ever become a wrong meta tag.
 */
const WAVE_1_PAGE_KEYS = new Set([
  'home',
  'works',
  'installations',
  'physical-works',
  'exhibitions',
  'collaborations',
  'awards',
  'writings',
  'press',
  'about',
  'cv',
  'commissions',
]);

/** Shortest description worth sending to a search engine. Anything less is a placeholder. */
const MIN_DESCRIPTION = 30;

function usefulSeo(key: string, seo: Seo): Seo | null {
  const description =
    seo.description && seo.description.trim().length >= MIN_DESCRIPTION && seo.description.trim().toLowerCase() !== key
      ? seo.description
      : null;
  const title = seo.title && seo.title.trim().toLowerCase() !== key ? seo.title : null;
  if (!title && !description && !seo.image && seo.keywords.length === 0) return null;
  return { ...seo, title, description };
}

function mapPages(docs: Json[]): Record<string, Seo> {
  const pages: Record<string, Seo> = {};
  // A page named for the route itself wins over one that was only renamed onto it.
  const ordered = [...docs].sort((a, b) => {
    const renamed = (doc: Json) => (PAGE_KEYS[str(doc.key) ?? str(doc.slug) ?? ''] ? 1 : 0);
    return renamed(a) - renamed(b);
  });
  for (const doc of ordered) {
    const rawKey = str(doc.key) ?? str(doc.slug);
    if (!rawKey) continue;
    const key = PAGE_KEYS[rawKey] ?? rawKey;
    if (pages[key] || !WAVE_1_PAGE_KEYS.has(key)) continue;
    const seo: Seo = {
      title: str(pick(doc, 'meta', 'title')) ?? str(doc.title),
      description: str(pick(doc, 'meta', 'description')) ?? str(doc.description),
      image: absolute(pick(doc, 'meta', 'image', 'url')),
      keywords: (str(doc.keywords) ?? '')
        .split(',')
        .map(word => word.trim())
        .filter(Boolean),
    };
    // A placeholder row ("awards desc") would become the page's meta
    // description; the route's own generated one is better than that.
    const useful = usefulSeo(key, seo);
    if (useful) pages[key] = useful;
  }
  return pages;
}

/**
 * Settings carry the install's own decisions, not the CMS's: only the site
 * URL, the timezone and the maintenance flag are read from it. Admin
 * addresses and every key field are never copied.
 */
function mapSettings(settings: Json | null, defaults: SiteSettings): SiteSettings {
  return {
    ...defaults,
    siteUrl: str(pick(settings, 'siteURL')) ?? defaults.siteUrl,
    timezone: str(pick(settings, 'timezone')) ?? defaults.timezone,
    maintenance: {
      enabled: bool(pick(settings, 'maintenanceMode', 'enabled')),
      message: str(pick(settings, 'maintenanceMode', 'message')),
    },
  };
}

function mapDrop(doc: Json, seriesSlug: string | null): Drop | null {
  const base = baseFields(doc);
  const name = str(doc.name) ?? str(doc.title);
  const slug = str(doc.slug);
  if (!slug || !name) return null;
  const required = obj(doc.requiredInformation);
  const phases: DropPhase[] = arr(doc.phases)
    .map(entry => ({
      name: str(pick(entry, 'name')) ?? 'Phase',
      startsAt: isoDate(pick(entry, 'time')) ?? isoDate(pick(entry, 'startsAt')),
      supply: num(pick(entry, 'supply')),
      price: num(pick(entry, 'price')) !== null
        ? { amount: num(pick(entry, 'price')) as number, currency: str(pick(entry, 'currency')) ?? 'ETH' }
        : null,
      audience: str(pick(entry, 'audience')),
    }))
    .filter(phase => phase.name);
  return {
    slug,
    title: name,
    subtitle: null,
    description: str(doc.description),
    year: yearOf(doc.startDate) ?? yearOf(doc.createdDate),
    cover: base?.cover ?? assetsCover(doc),
    tags: [],
    featured: bool(doc.featured),
    story: storyBlocks(doc.layout, slug),
    seo: seoOf(doc.meta),
    seriesSlug,
    kind: str(doc.dropType),
    startsAt: isoDate(doc.startDate),
    endsAt: isoDate(doc.endDate),
    chain: toChain(pick(required, 'blockchain')),
    contract: contractAddress(pick(required, 'contractAddress')),
    standard: toStandard(doc.tokenStandard),
    editionSize: num(doc.totalSupply),
    platform: marketplaceName(pick(required, 'datamarket')),
    marketUrl: str(doc.marketUrl),
    mintUrl: str(doc.mintUrl),
    phases,
    perks: [],
    notify: true,
  };
}

function assetsCover(doc: Json): Asset | null {
  return firstAsset(doc.cardImage, doc.bannerImage);
}

// ---------------------------------------------------------------------------
// The starting point
// ---------------------------------------------------------------------------

/**
 * What this install switches on. The plan sets these by hand rather than
 * reading them from the CMS: they are decisions about the theme, not content.
 * Everything a later wave owns stays off.
 */
const SNAPSHOT_SETTINGS: SiteSettings = {
  siteUrl: 'https://example.art',
  timezone: null,
  modules: {
    showreel: true,
    ticker: true,
    partners: true,
    news: true,
    newsletter: true,
    drops: true,
    commissions: true,
    writings: true,
    'immersive-rooms': false,
    collectors: false,
    insights: false,
    store: false,
  },
  liveHtml: false,
  showOwners: false,
  publicCollectorProfiles: false,
  analytics: { provider: 'none', id: null },
  maintenance: { enabled: false, message: null },
  allowAiCrawlers: true,
  redirects: [],
  legal: { privacy: null, terms: null, updatedAt: null },
};

const EMPTY_ARTIST: Artist = {
  name: 'Artist',
  tagline: null,
  statement: null,
  bio: null,
  location: null,
  portrait: null,
  links: [],
  wallets: [],
};

/** The site on disk, with every array the new types need, so a run can fill them in place. */
function startingSite(existing: SiteData | null): SiteData {
  return {
    artist: existing?.artist ?? EMPTY_ARTIST,
    series: existing?.series ?? [],
    works: existing?.works ?? [],
    exhibitions: existing?.exhibitions ?? [],
    awards: existing?.awards ?? [],
    press: existing?.press ?? [],
    installations: existing?.installations ?? [],
    immersives: existing?.immersives ?? [],
    physicalWorks: existing?.physicalWorks ?? [],
    collaborations: existing?.collaborations ?? [],
    writings: existing?.writings ?? [],
    drops: existing?.drops ?? [],
    landing: existing?.landing ?? null,
    commissions: existing?.commissions ?? null,
    cv: existing?.cv ?? null,
    pages: existing?.pages ?? {},
    settings: { ...SNAPSHOT_SETTINGS, ...(existing?.settings ?? {}) },
  };
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

/** Nothing this script writes may land outside the gitignored local fixture directory. */
function writeLocal(file: string, value: unknown): void {
  const resolved = path.resolve(file);
  const allowed = path.resolve(LOCAL_DIR) + path.sep;
  if (!resolved.startsWith(allowed)) throw new Error(`refusing to write outside src/fixtures/local: ${resolved}`);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, `${JSON.stringify(withoutEmDashes(value), null, 2)}\n`, 'utf8');
}

function readExistingSite(): SiteData | null {
  try {
    return JSON.parse(fs.readFileSync(SITE_FILE, 'utf8')) as SiteData;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Wave 2 and Wave 3: the guild, and what the artist sells
// ---------------------------------------------------------------------------

/**
 * Two more files, written beside site.json: local/guild.json (tiers and
 * badges, which are the artist's writing) and local/store.json (products,
 * variants, shipping and the commission form).
 *
 * What is deliberately NOT read, on an install that has it:
 *
 *  - collectors, customers, members. A collector record in a CMS holds an
 *    email, an auth method and a trading history tied to a person. None of
 *    that belongs in a fixture that sits in a working directory, and none of
 *    it is needed: Raisonne derives a collector from the chain and from the
 *    wallet that signs in, so the only identity it keeps is a public address.
 *  - orders, commissions, suborders. Same reason, plus they are live records
 *    that belong in the order store, not in a snapshot.
 *  - podproviders' keys. The provider names come across; apiKey, apiSecret
 *    and webhookSecret never do. They are environment variables.
 *  - collector scores. They are computed from the events, so copying a
 *    number somebody else worked out would put a figure on the page that
 *    this install cannot reproduce or explain.
 */

function moneyFrom(value: unknown, currency: string): Money | null {
  const amount = num(value);
  if (amount === null) return null;
  // Every CMS this script has met stores a price in major units.
  const digits = currency === 'JPY' || currency === 'KRW' ? 0 : 2;
  return { amount: Math.round(amount * 10 ** digits), currency };
}

function variantId(productSlug: string, parts: (string | null)[]): string {
  const tail = parts.filter(Boolean).join('-') || 'default';
  return `${productSlug}-${looseSlug(tail)}`.slice(0, 80);
}

const FULFILMENT: Record<string, FulfilmentKind> = {
  ship: 'ship',
  inhouse: 'ship',
  in_house: 'ship',
  stock: 'ship',
  pod: 'pod',
  print_on_demand: 'pod',
  printondemand: 'pod',
  digital: 'digital',
  download: 'digital',
  pickup: 'pickup',
};

function toFulfilment(value: unknown): FulfilmentKind {
  const text = str(value)?.toLowerCase().replace(/[^a-z_]/g, '') ?? '';
  return FULFILMENT[text] ?? 'ship';
}

function productFacts(doc: Json): Fact[] {
  const facts: Fact[] = [];
  const add = (label: string, value: unknown) => {
    const text = str(value);
    if (text) facts.push({ label, value: text });
  };
  add('Materials', doc.materials);
  add('Finish', doc.finish);
  add('Origin', doc.origin);
  add('Series', doc.series);
  add('Care', doc.careInstructions);
  for (const spec of arr(doc.additionalSpecs)) {
    const row = obj(spec);
    const label = str(row?.label);
    const value = str(row?.value);
    if (label && value) facts.push({ label, value });
  }
  return facts;
}

/**
 * One product. A CMS that stores a single price and a list of options is
 * turned into the one shape the store uses: a product is a set of variants,
 * and a product with no options has exactly one. That way a cart line always
 * points at a priced thing, and checkout never has to assemble a price.
 */
function mapProduct(doc: Json, currency: string): Product | null {
  const name = title(doc);
  const slugText = str(doc.slug) ?? (name ? looseSlug(name) : null);
  if (!name || !slugText) return null;
  const slug = shortSlug(slugText);

  const basePrice = moneyFrom(doc.price ?? doc.basePrice, currency);
  if (!basePrice) return null;

  const inventory = obj(doc.inventory);
  const tracked = bool(inventory?.trackInventory);
  const shipping = obj(doc.shippingInfo);
  const dimensions = obj(shipping?.dimensions);
  const edition = obj(doc.editionDetails);
  const optionGroup = obj(doc.options);

  const sizes = arr(optionGroup?.sizes).map(obj).filter((row): row is Json => row !== null);
  const frames = arr(optionGroup?.frames).map(obj).filter((row): row is Json => row !== null);

  const variants: ProductVariant[] = [];
  type Combination = { size: Json | null; frame: Json | null };
  const combinations: Combination[] = sizes.length
    ? sizes.flatMap<Combination>(size =>
        frames.length ? frames.map<Combination>(frame => ({ size, frame })) : [{ size, frame: null }],
      )
    : frames.length
      ? frames.map<Combination>(frame => ({ size: null, frame }))
      : [{ size: null, frame: null }];

  for (const { size, frame } of combinations) {
    const sizeLabel = size ? str(size.label) : null;
    const frameLabel = frame ? str(frame.label) : null;
    const modifier = (num(size?.priceModifier) ?? 0) + (num(frame?.priceModifier) ?? 0);
    const price = moneyFrom((num(doc.price ?? doc.basePrice) ?? 0) + modifier, currency) ?? basePrice;
    const options: Record<string, string> = {};
    if (sizeLabel) options.Size = sizeLabel;
    if (frameLabel) options.Frame = frameLabel;

    variants.push({
      id: variantId(slug, [sizeLabel, frameLabel]),
      name: [sizeLabel, frameLabel].filter(Boolean).join(', ') || 'Standard',
      ...(Object.keys(options).length ? { options } : {}),
      price,
      sku: str(doc.sku),
      stock: tracked ? (num(inventory?.quantity) ?? 0) : null,
      lowStockAt: tracked ? num(inventory?.lowStockThreshold) : null,
      weight: num(shipping?.weight),
      dimensions:
        dimensions && num(dimensions.length) !== null
          ? { length: num(dimensions.length) ?? 0, width: num(dimensions.width) ?? 0, height: num(dimensions.height) ?? 0 }
          : null,
      available: true,
    });
  }

  const gallery = arr(doc.gallery)
    .map(entry => imageAsset(obj(entry)?.image, str(obj(entry)?.caption)))
    .filter((asset): asset is Asset => asset !== null);

  return {
    slug,
    title: name,
    subtitle: str(doc.subtitle),
    description: plainText(doc.shortDescription) ?? plainText(doc.description),
    body: richText(doc.description),
    categorySlug: str(related(doc.category)?.slug) ?? null,
    collectionSlug: str(related(doc.storeCollection)?.slug) ?? null,
    cover: imageAsset(doc.mainImage) ?? gallery[0] ?? null,
    gallery,
    variants,
    fulfilment: toFulfilment(doc.fulfillmentType),
    work: null,
    edition: bool(doc.isLimitedEdition)
      ? {
          total: num(edition?.totalEditions),
          numbered: num(edition?.editionNumber) !== null,
          certificate: bool(edition?.certificate),
          signed: bool(edition?.signature),
        }
      : null,
    specs: productFacts(doc),
    highlights: arr(doc.highlights)
      .map(entry => str(obj(entry)?.text))
      .filter((text): text is string => Boolean(text)),
    materials: str(doc.materials),
    year: num(doc.year),
    leadTime: null,
    shippingNote: plainText(shipping?.shippingNote),
    featured: bool(doc.featured),
    hidden: false,
    tags: [],
    seo: seoOf(doc.meta ?? doc.seo),
  };
}

function mapPhygital(doc: Json, currency: string): PhygitalProduct | null {
  const name = title(doc);
  const slugText = str(doc.slug) ?? (name ? looseSlug(name) : null);
  if (!name || !slugText) return null;
  const base = mapProduct({ ...doc, price: doc.basePrice ?? doc.price }, currency);
  if (!base) return null;
  return {
    ...base,
    leadTime: str(doc.leadTime),
    requiresSeriesSlugs: [],
    pickWork: true,
  };
}

function mapProductCategory(doc: Json): ProductCategory | null {
  const name = title(doc);
  const slug = str(doc.slug) ?? (name ? looseSlug(name) : null);
  if (!name || !slug) return null;
  return {
    slug,
    name,
    description: plainText(doc.description),
    cover: imageAsset(doc.image),
    parentSlug: str(related(doc.parent)?.slug) ?? null,
    featured: bool(doc.featured),
  };
}

function mapStoreCollection(doc: Json): StoreCollection | null {
  const name = str(doc.label) ?? title(doc);
  const slug = str(doc.slug) ?? (name ? looseSlug(name) : null);
  if (!name || !slug) return null;
  return {
    slug,
    name,
    description: plainText(doc.description),
    cover: imageAsset(doc.image),
    statement: plainText(doc.artistStatement),
    vision: plainText(doc.vision),
    process: plainText(doc.process),
    year: yearOf(doc.year),
    medium: str(doc.medium),
    featured: bool(doc.isActive),
  };
}

function mapShippingMethod(doc: Json, currency: string): ShippingMethod | null {
  const name = str(doc.name) ?? title(doc);
  if (!name) return null;
  const price = moneyFrom(doc.price, currency) ?? { amount: 0, currency };
  const days = obj(doc.estimatedDays);
  const restrictions = obj(doc.restrictions);
  return {
    id: looseSlug(str(doc.id) ?? name),
    name,
    description: plainText(doc.description),
    price,
    freeAbove: moneyFrom(doc.freeThreshold, currency),
    estimatedDays: days ? { min: num(days.min), max: num(days.max) } : null,
    countries: arr(restrictions?.countries)
      .map(entry => str(obj(entry)?.country)?.toUpperCase())
      .filter((code): code is string => Boolean(code)),
    maxWeight: num(restrictions?.maxWeight),
    order: num(doc.sortOrder),
  };
}

function mapTier(doc: Json, index: number): Tier | null {
  const name = title(doc);
  if (!name) return null;
  return {
    id: looseSlug(str(doc.id) ?? name),
    name,
    description: plainText(doc.description),
    color: null,
    icon: null,
    minPercentile: num(doc.scorePercentileMin),
    maxPercentile: num(doc.scorePercentileMax),
    requirements: plainText(doc.requirements),
    benefits: arr(doc.benefits)
      .map(entry => str(obj(entry)?.title))
      .filter((text): text is string => Boolean(text)),
    earlyAccess: plainText(doc.earlyAccess),
    order: num(doc.sortOrder) ?? index + 1,
  };
}

function mapBadge(doc: Json): Badge | null {
  const name = title(doc);
  if (!name) return null;
  const category = related(doc.badgeCategory);
  return {
    id: looseSlug(str(doc.key) ?? str(doc.id) ?? name),
    name,
    description: plainText(doc.description),
    key: str(doc.key),
    categoryId: category ? looseSlug(str(category.id) ?? title(category) ?? '') : null,
    icon: null,
    color: null,
    positive: doc.positive === undefined ? true : bool(doc.positive),
    howItWorks: plainText(doc.howWork),
  };
}

function mapBadgeCategory(doc: Json, index: number): BadgeCategory | null {
  const name = title(doc);
  if (!name) return null;
  return {
    id: looseSlug(str(doc.id) ?? name),
    name,
    description: plainText(doc.description),
    order: index + 1,
  };
}

function mapGuild(main: Json | null, tiers: Tier[], badges: Badge[], categories: BadgeCategory[]): GuildData | null {
  if (!tiers.length && !badges.length && !main) return null;
  return {
    title: str(main?.leftTitle) ?? 'The guild',
    description: plainText(main?.rightContent) ?? plainText(main?.leftContent),
    intro: richText(main?.leftContent),
    tiers,
    badges,
    badgeCategories: categories,
    howItWorks: arr(main?.howGuildWorks)
      .map(entry => {
        const row = obj(entry);
        const heading = str(row?.title);
        return heading ? { title: heading, description: plainText(row?.description) } : null;
      })
      .filter((entry): entry is { title: string; description: string | null } => entry !== null),
    // Scoring stays off until an install says otherwise: the tiers the CMS
    // holds are the artist's, and a score this install cannot recompute from
    // the chain is a number it cannot explain.
    scoring: false,
  };
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

async function run(): Promise<void> {
  options = parseOptions(process.argv.slice(2));
  report.base = options.base;
  console.log(`Snapshot from ${options.base}/api/proxy`);

  const existing = readExistingSite();
  if (existing) console.log(`  merging onto ${existing.series.length} series and ${existing.works.length} works already on disk`);
  else note('no src/fixtures/local/site.json yet: this run starts an empty catalogue');

  const site: SiteData = startingSite(existing);

  // --- lookups -----------------------------------------------------------
  // Categories, chains and exhibition kinds arrive already expanded at
  // depth 2; only the marketplace names are stored as slugs.
  const marketDocs = await getDocs('marketplaces', 'datamarkets?limit=100');
  for (const doc of marketDocs) {
    const name = str(doc.title);
    if (name) marketNames.set(looseSlug(name), name);
  }
  used('marketplaces', marketNames.size);

  // --- series ------------------------------------------------------------
  const seriesDocs = await getDocs('series', 'nftcollections?limit=100&depth=2');
  const patches = seriesDocs.map(readSeriesDoc).filter((entry): entry is SeriesPatch => entry !== null);
  const published = patches.filter(entry => !entry.isDraft);
  const draftSlugs = new Set(patches.filter(entry => entry.isDraft).map(entry => entry.cmsSlug));
  if (draftSlugs.size) note(`series: ${draftSlugs.size} draft left out (${[...draftSlugs].join(', ')})`);

  const byContract = new Map<string, Series>();
  const bySlug = new Map<string, Series>();
  const byLooseSlug = new Map<string, Series>();
  for (const series of site.series) {
    bySlug.set(series.slug, series);
    byLooseSlug.set(looseSlug(series.slug), series);
    // A marketplace's shared contract holds many artists' tokens, so it is
    // never the same record as a collection that happens to sit on it.
    if (series.contract && series.kind !== 'shared-platform') byContract.set(series.contract.toLowerCase(), series);
  }

  /** CMS slug to the slug the theme uses, which stays the importer's so old URLs keep working. */
  const slugMap = new Map<string, string>();
  const claimed = new Set<Series>();
  const unmatched: SeriesPatch[] = [];
  const parentSlugs = new Set(published.map(entry => entry.parentCmsSlug).filter((slug): slug is string => Boolean(slug)));

  // The slug is the surer signal, so every slug match is made before any
  // contract match: a parent collection shares its contract with a child.
  const matches = new Map<SeriesPatch, Series>();
  for (const entry of published) {
    const target = bySlug.get(entry.cmsSlug) ?? byLooseSlug.get(looseSlug(entry.cmsSlug));
    if (target && ![...matches.values()].includes(target)) matches.set(entry, target);
  }
  for (const entry of published) {
    if (matches.has(entry) || !entry.contract) continue;
    // A collection that groups other collections keeps its own page.
    if (parentSlugs.has(entry.cmsSlug)) continue;
    const target = byContract.get(entry.contract);
    if (target && ![...matches.values()].includes(target)) matches.set(entry, target);
  }

  for (const entry of published) {
    const target = matches.get(entry);
    if (target) {
      claimed.add(target);
      slugMap.set(entry.cmsSlug, target.slug);
      applyPatch(target, entry.patch);
      if (!target.cover && entry.cover) target.cover = entry.cover;
      if (entry.workCount && entry.workCount > target.workCount) target.workCount = entry.workCount;
    } else {
      unmatched.push(entry);
    }
  }

  for (const series of site.series) if (!claimed.has(series)) report.importerSeriesWithoutCmsMatch.push(series.slug);

  // CMS series with no importer match join the catalogue as their own record,
  // as long as they hold works or group the ones that do.
  for (const entry of unmatched) {
    if (!entry.workCount && !parentSlugs.has(entry.cmsSlug)) {
      note(`series: "${entry.cmsSlug}" has no importer match and no works, left out`);
      continue;
    }
    const series: Series = {
      slug: entry.cmsSlug,
      name: entry.name,
      chain: entry.chain ?? 'ethereum',
      contract: entry.contract,
      kind: entry.workCount === 1 ? 'one-of-one' : 'series',
      description: null,
      year: null,
      workCount: entry.workCount ?? 0,
      cover: entry.cover,
      evidence: [],
      coAuthored: false,
      marketUrl: null,
    };
    applyPatch(series, entry.patch);
    site.series.push(series);
    bySlug.set(series.slug, series);
    slugMap.set(entry.cmsSlug, series.slug);
    report.cmsSeriesWithoutImporterMatch.push(entry.cmsSlug);
  }

  for (const entry of published) {
    if (!entry.parentCmsSlug) continue;
    const child = bySlug.get(slugMap.get(entry.cmsSlug) ?? entry.cmsSlug);
    const parentSlug = slugMap.get(entry.parentCmsSlug);
    if (child && parentSlug) child.parentSlug = parentSlug;
  }

  used('series', published.length);

  // --- works -------------------------------------------------------------
  const worksBySlugAndKey = new Map<string, Work>();
  for (const work of site.works) worksBySlugAndKey.set(workKey(work.contract, work.tokenId), work);
  const matchedWorkKeys = new Set<string>();

  // A work whose CMS collection names a different contract still belongs
  // somewhere: on a marketplace's shared contract, most often.
  const seriesByContract = new Map<string, string>();
  for (const series of site.series) if (series.contract) seriesByContract.set(series.contract.toLowerCase(), series.slug);

  if (!options.skip.has('works')) {
    let page = 1;
    let pages = 1;
    let readCount = 0;
    let added = 0;
    while (page <= pages) {
      const url = proxyUrl(`artworks?limit=${WORKS_PAGE_SIZE}&depth=1&page=${page}`);
      process.stdout.write(`  works page ${page} ... `);
      const { status, body } = await getJson(url);
      const docs = arr(pick(body, 'docs')).filter(isObject);
      pages = num(pick(body, 'totalPages')) ?? 1;
      console.log(`${status} (${docs.length})`);
      if (page === 1)
        report.sources.push({
          id: 'works',
          url,
          status,
          records: num(pick(body, 'totalDocs')) ?? docs.length,
          used: 0,
          note: null,
        });
      if (!docs.length) break;

      for (const doc of docs) {
        readCount += 1;
        const result = readWorkDoc(doc);
        if (result.skip || !result.work || !result.patch) {
          skipWork(result.key, result.skip ?? 'unreadable');
          continue;
        }
        const existingWork = worksBySlugAndKey.get(result.key);
        if (existingWork) {
          if (matchedWorkKeys.has(result.key)) {
            skipWork(result.key, 'a second CMS record for the same token');
            continue;
          }
          matchedWorkKeys.add(result.key);
          applyWorkPatch(existingWork, result.patch);
          patchWorkMedia(existingWork, result.work.media);
          continue;
        }
        if (result.seriesCmsSlug && draftSlugs.has(result.seriesCmsSlug)) {
          skipWork(result.key, `its collection "${result.seriesCmsSlug}" is still a draft`);
          continue;
        }
        const seriesSlug =
          (result.seriesCmsSlug ? slugMap.get(result.seriesCmsSlug) : undefined) ??
          (result.contract ? seriesByContract.get(result.contract.toLowerCase()) : undefined);
        if (!seriesSlug) {
          skipWork(
            result.key,
            result.seriesCmsSlug
              ? `its collection "${result.seriesCmsSlug}" is not in the catalogue`
              : 'neither its collection nor its contract is in the catalogue',
          );
          continue;
        }
        const work: Work = { ...result.work, seriesSlug };
        applyWorkPatch(work, result.patch);
        site.works.push(work);
        worksBySlugAndKey.set(result.key, work);
        matchedWorkKeys.add(result.key);
        added += 1;
        if (options.maxWorks && added >= options.maxWorks) break;
      }
      if (options.maxWorks && added >= options.maxWorks) {
        note(`works: stopped at --max-works=${options.maxWorks}`);
        break;
      }
      page += 1;
    }
    used('works', readCount);
    report.importerWorksWithoutCmsMatch = site.works.filter(
      work => !matchedWorkKeys.has(workKey(work.contract, work.tokenId)),
    ).length;
  }

  // Work counts follow the catalogue when the fixture holds more than the contract claimed.
  const perSeries = new Map<string, number>();
  for (const work of site.works) perSeries.set(work.seriesSlug, (perSeries.get(work.seriesSlug) ?? 0) + 1);
  for (const series of site.series) {
    const held = perSeries.get(series.slug) ?? 0;
    if (held > series.workCount) series.workCount = held;
  }

  // --- records -----------------------------------------------------------
  const installationDocs = await getDocs('installations', 'installations?limit=100&depth=2');
  site.installations = installationDocs.map(mapInstallation).filter((entry): entry is Installation => entry !== null);
  used('installations', site.installations.length);

  const immersiveDocs = await getDocs('immersives', 'immersives?limit=100&depth=2');
  site.immersives = immersiveDocs.map(mapImmersive).filter((entry): entry is Immersive => entry !== null);
  used('immersives', site.immersives.length);

  const physicalDocs = await getDocs('physicalWorks', 'physicalartworks?limit=100&depth=2');
  site.physicalWorks = physicalDocs.map(doc => mapPhysicalWork(doc, slugMap)).filter((entry): entry is PhysicalWork => entry !== null);
  used('physicalWorks', site.physicalWorks.length);

  const collaborationDocs = await getDocs('collaborations', 'collaborations?limit=100&depth=2');
  site.collaborations = collaborationDocs.map(mapCollaboration).filter((entry): entry is Collaboration => entry !== null);
  used('collaborations', site.collaborations.length);

  const exhibitionDocs = await getDocs('exhibitions', 'exhibitions?limit=100&depth=2');
  const exhibitions = dedupeExhibitions(
    exhibitionDocs.map(mapExhibition).filter((entry): entry is Exhibition => entry !== null),
  );
  if (exhibitions.length) site.exhibitions = exhibitions.sort((a, b) => b.year - a.year);
  used('exhibitions', exhibitions.length);

  const awardDocs = await getDocs('awards', 'awards?limit=100&depth=2');
  const awards = awardDocs.map(mapAward).filter((entry): entry is Award => entry !== null);
  if (awards.length) site.awards = awards.sort((a, b) => b.year - a.year);
  used('awards', awards.length);

  const writingDocs = await getDocs('writings', 'publications?limit=100&depth=2&where[status][equals]=published');
  site.writings = writingDocs.map(mapWriting).filter((entry): entry is Writing => entry !== null);
  used('writings', site.writings.length);
  if (!site.writings.length) note('writings: no published publication today, the section ships empty');

  const pressDocs = await getDocs('press', 'pressandmedia?limit=100&depth=2&where[status][equals]=published&sort=-publishDate');
  const press = pressDocs.map(mapPress).filter((entry): entry is PressItem => entry !== null);
  if (press.length) site.press = press;
  used('press', press.length);

  // A drop is an announced series, so it comes from the collections already
  // read rather than from a second request the CMS may not answer.
  const dropDocs = seriesDocs.filter(doc => str(doc.status) === 'upcoming');
  site.drops = dropDocs
    .map(doc => mapDrop(doc, slugMap.get(str(doc.slug) ?? '') ?? null))
    .filter((entry): entry is Drop => entry !== null);
  report.sources.push({
    id: 'drops',
    url: `${proxyUrl('nftcollections?limit=100&depth=2')} (status "upcoming")`,
    status: options.skip.has('series') ? 'skipped' : 200,
    records: dropDocs.length,
    used: site.drops.length,
    note: dropDocs.length ? null : 'no collection is marked upcoming, no drop page ships',
  });
  if (!dropDocs.length) note('drops: no collection is marked upcoming, no drop page ships');

  // --- the artist and the pages ------------------------------------------
  const about = await getGlobal('about', 'globals/about?depth=2');
  const cvGlobal = await getGlobal('cv', 'globals/cv?depth=1');
  const landingGlobal = await getGlobal('landing', 'globals/landing-page?depth=2');
  const commissionsGlobal = await getGlobal('commissions', 'globals/collabs-page?depth=2');
  const settingsGlobal = await getGlobal('settings', 'globals/settings?depth=0');
  const pageDocs = await getDocs('pages', 'metapages?limit=100&depth=1');

  site.artist = mapArtist(site.artist, about, cvGlobal, landingGlobal);
  site.cv = mapCv(cvGlobal) ?? site.cv;
  site.commissions = mapCommissions(commissionsGlobal) ?? site.commissions;
  site.settings = mapSettings(settingsGlobal, site.settings);
  site.settings.modules = {
    ...site.settings.modules,
    commissions: site.commissions !== null,
    writings: site.writings.length > 0,
    drops: site.drops.length > 0,
  };
  // This install runs its interactive works: most of the catalogue is live HTML.
  site.settings.liveHtml = site.works.some(work => work.media.kind === 'html');
  site.settings.showOwners = false;
  // A per-wallet holdings page is opt in. See SiteSettings for why it is a
  // separate switch from showOwners.
  site.settings.publicCollectorProfiles = false;
  site.settings.allowAiCrawlers = true;
  /**
   * Old URLs. Two kinds: the public aliases people and crawlers already try,
   * and the routes this theme renamed. A visitor arriving from a five-year-old
   * link, a press article or a search result should land on the record, not on
   * a 404, so the renames are written down here rather than being left to the
   * artist to notice one report at a time.
   *
   * They are data (settings.redirects, applied by next.config.ts), so an
   * install that kept its own route names simply has fewer of them.
   */
  site.settings.redirects = [
    // Public aliases.
    { from: '/contact', to: '/commissions', permanent: true },
    { from: '/contact-us', to: '/commissions', permanent: true },
    { from: '/commission', to: '/commissions', permanent: true },
    { from: '/hire', to: '/commissions', permanent: true },
    { from: '/collabs', to: '/commissions', permanent: true },
    // Routes this theme renamed.
    { from: '/catalog', to: '/works', permanent: true },
    { from: '/work', to: '/works', permanent: true },
    { from: '/catalog/collections', to: '/works', permanent: true },
    { from: '/catalog/one-of-ones', to: '/works', permanent: true },
    { from: '/catalog/exhibitions', to: '/exhibitions', permanent: true },
    { from: '/catalog/collaborations', to: '/collaborations', permanent: true },
    { from: '/catalog/installations', to: '/installations', permanent: true },
    { from: '/catalog/physicals', to: '/physical-works', permanent: true },
    { from: '/privacy-policy', to: '/privacy', permanent: true },
    { from: '/terms-of-service', to: '/terms', permanent: true },
  ];

  const clients = site.commissions?.clients ?? [];
  const cityFromCv = str(pick(cvGlobal, 'location'));
  site.landing = mapLanding(landingGlobal, clients, site.settings.timezone, cityFromCv) ?? site.landing;
  site.pages = { ...site.pages, ...mapPages(pageDocs) };
  used('pages', Object.keys(site.pages).length);

  // --- references ---------------------------------------------------------
  // A reference carries the CMS's slug, which is not always the slug the
  // theme ended up with, and it can point at a record this run skipped. Both
  // are fixed here, once, so no page renders a link that goes nowhere.
  const resolvable = new Map<RecordType, Set<string>>([
    ['series', new Set(site.series.map(entry => entry.slug))],
    ['work', new Set(site.works.map(entry => entry.id))],
    ['installation', new Set(site.installations.map(entry => entry.slug))],
    ['immersive', new Set(site.immersives.map(entry => entry.slug))],
    ['physical-work', new Set(site.physicalWorks.map(entry => entry.slug))],
    ['exhibition', new Set(site.exhibitions.map(entry => entry.slug).filter((slug): slug is string => Boolean(slug)))],
    ['collaboration', new Set(site.collaborations.map(entry => entry.slug))],
    ['award', new Set(site.awards.map(entry => entry.slug).filter((slug): slug is string => Boolean(slug)))],
    ['writing', new Set(site.writings.map(entry => entry.slug))],
    ['press', new Set(site.press.map(entry => entry.id))],
    ['drop', new Set(site.drops.map(entry => entry.slug))],
  ]);

  let droppedRefs = 0;

  function isRef(value: unknown): value is RecordRef {
    if (!isObject(value)) return false;
    const keys = Object.keys(value);
    return keys.length === 2 && keys.includes('type') && keys.includes('key') && typeof value.key === 'string';
  }

  /** Null when the reference cannot be made to point at a record in this fixture. */
  function resolveRef(ref: RecordRef): RecordRef | null {
    const key = ref.type === 'series' ? (slugMap.get(ref.key) ?? ref.key) : ref.key;
    if (!resolvable.get(ref.type)?.has(key)) {
      droppedRefs += 1;
      return null;
    }
    return key === ref.key ? ref : { ...ref, key };
  }

  function resolveRefsIn(value: unknown): void {
    if (Array.isArray(value)) {
      for (let index = value.length - 1; index >= 0; index -= 1) {
        const entry: unknown = value[index];
        if (isRef(entry)) {
          const resolved = resolveRef(entry);
          if (resolved) value[index] = resolved;
          else value.splice(index, 1);
        } else resolveRefsIn(entry);
      }
      return;
    }
    if (!isObject(value)) return;
    for (const [key, entry] of Object.entries(value)) {
      if (isRef(entry)) {
        const resolved = resolveRef(entry);
        Reflect.set(value, key, resolved);
      } else resolveRefsIn(entry);
    }
  }

  resolveRefsIn(site);

  const workIds = resolvable.get('work') ?? new Set<string>();
  for (const physical of site.physicalWorks) {
    const kept = physical.workIds.filter(id => workIds.has(id));
    droppedRefs += physical.workIds.length - kept.length;
    physical.workIds = kept;
  }
  if (droppedRefs) note(`${droppedRefs} reference pointed at a record this run did not write, left out`);

  // --- the guild and the store -------------------------------------------
  // Read last, and written to their own files, so a failure here cannot
  // cost a run of the catalogue. Nothing personal is requested: no
  // collectors, no customers, no orders, no commissions, no scores.
  const tierDocs = await getDocs('tiers', 'tiers?limit=100&depth=1&sort=scorePercentileMin');
  const badgeDocs = await getDocs('badges', 'badges?limit=200&depth=1');
  const badgeCategoryDocs = await getDocs('badgecategories', 'badgecategories?limit=100&depth=0');
  const guildMain = await getGlobal('guildmain', 'globals/guildmain?depth=1');

  const tiers = tierDocs.map(mapTier).filter((entry): entry is Tier => entry !== null);
  const badges = badgeDocs.map(mapBadge).filter((entry): entry is Badge => entry !== null);
  const badgeCategories = badgeCategoryDocs.map(mapBadgeCategory).filter((entry): entry is BadgeCategory => entry !== null);
  used('tiers', tiers.length);
  used('badges', badges.length);
  used('badgecategories', badgeCategories.length);

  const guild = mapGuild(guildMain, tiers, badges, badgeCategories);

  const productDocs = await getDocs('products', 'products?limit=200&depth=2');
  const phygitalDocs = await getDocs('phygitalproducts', 'phygitalproducts?limit=100&depth=2');
  const categoryDocs = await getDocs('productcategories', 'productcategories?limit=100&depth=1');
  const storeCollectionDocs = await getDocs('storecollections', 'storecollections?limit=100&depth=1');
  const shippingDocs = await getDocs('shippingmethods', 'shippingmethods?limit=100&depth=0');
  const podDocs = await getDocs('podproviders', 'podproviders?limit=50&depth=0');

  const products = productDocs.map(doc => mapProduct(doc, STORE_CURRENCY)).filter((entry): entry is Product => entry !== null);
  const phygitals = phygitalDocs.map(doc => mapPhygital(doc, STORE_CURRENCY)).filter((entry): entry is PhygitalProduct => entry !== null);
  const productCategories = categoryDocs.map(mapProductCategory).filter((entry): entry is ProductCategory => entry !== null);
  const storeCollections = storeCollectionDocs.map(mapStoreCollection).filter((entry): entry is StoreCollection => entry !== null);
  const shippingMethods = shippingDocs
    .map(doc => mapShippingMethod(doc, STORE_CURRENCY))
    .filter((entry): entry is ShippingMethod => entry !== null);
  used('products', products.length);
  used('phygitalproducts', phygitals.length);
  used('productcategories', productCategories.length);
  used('storecollections', storeCollections.length);
  used('shippingmethods', shippingMethods.length);

  const store: StoreData | null = products.length || phygitals.length
    ? {
        currency: STORE_CURRENCY,
        products,
        phygitals,
        categories: productCategories,
        collections: storeCollections,
        shippingMethods,
        // Names only. Every key a provider needs is an environment variable.
        podProviders: podDocs
          .map(doc => {
            const name = str(doc.name) ?? title(doc);
            return name
              ? {
                  id: looseSlug(str(doc.slug) ?? name),
                  name,
                  apiBaseUrl: str(doc.apiBaseUrl),
                  priority: num(doc.priority),
                  enabled: false,
                  capabilities: [],
                }
              : null;
          })
          .filter((entry): entry is NonNullable<typeof entry> => entry !== null),
        page: null,
        commissionForm: null,
      }
    : null;
  if (store) used('podproviders', store.podProviders.length);

  if (store) {
    note(`store: prices read as ${STORE_CURRENCY}. Set RAISONNE_STORE_CURRENCY if that is wrong, and check them before selling anything.`);
    note('store: no customer, order or commission record was read. Those are personal data and live in the order store, not in a fixture.');
  }
  if (guild) {
    note('guild: tiers and badges copied, collector scores were not. A score this install cannot recompute from the chain is a number it cannot explain.');
  }

  // --- write -------------------------------------------------------------
  report.counts = {
    series: site.series.length,
    works: site.works.length,
    installations: site.installations.length,
    immersives: site.immersives.length,
    physicalWorks: site.physicalWorks.length,
    collaborations: site.collaborations.length,
    exhibitions: site.exhibitions.length,
    awards: site.awards.length,
    writings: site.writings.length,
    press: site.press.length,
    drops: site.drops.length,
    pages: Object.keys(site.pages).length,
    landingFeatured: site.landing?.featured.length ?? 0,
    announcements: site.landing?.announcements.length ?? 0,
    events: site.landing?.events.length ?? 0,
    partners: site.landing?.partners.length ?? 0,
    cvExperience: site.cv?.experience.length ?? 0,
    cvEducation: site.cv?.education.length ?? 0,
    cvSkills: site.cv?.skills.length ?? 0,
    storyBlocks:
      site.series.reduce((total, entry) => total + (entry.story?.length ?? 0), 0) +
      [...site.installations, ...site.immersives, ...site.collaborations, ...site.physicalWorks].reduce(
        (total, entry) => total + entry.story.length,
        0,
      ) +
      site.exhibitions.reduce((total, entry) => total + (entry.story?.length ?? 0), 0) +
      site.awards.reduce((total, entry) => total + (entry.story?.length ?? 0), 0),
  };
  if (report.droppedContact) note(`${report.droppedContact} contact link left out: set INCLUDE_CONTACT in this script to keep them`);
  if (report.duplicateExhibitions) note(`${report.duplicateExhibitions} exhibition entered twice, folded into one`);
  if (!site.commissions?.cta && site.commissions) {
    note('the commissions page has no call to action: the theme falls back to artist.email, which is also unset');
  }
  if (site.landing?.ticker && !site.landing.ticker.timezone) {
    note('no studio timezone: the home page shows the city without a clock');
  }

  report.counts.tiers = tiers.length;
  report.counts.badges = badges.length;
  report.counts.products = products.length + phygitals.length;
  report.counts.shippingMethods = shippingMethods.length;

  report.finishedAt = new Date().toISOString();
  writeLocal(SITE_FILE, site);
  if (guild) writeLocal(GUILD_FILE, guild);
  if (store) writeLocal(STORE_FILE, store);
  writeLocal(REPORT_FILE, report);

  const written = ['site.json', guild ? 'guild.json' : null, store ? 'store.json' : null, 'snapshot-report.json'].filter(Boolean);
  console.log(`\nWrote ${written.join(', ')} in src/fixtures/local`);
  for (const [key, value] of Object.entries(report.counts)) console.log(`  ${key}: ${value}`);
}

await run();
