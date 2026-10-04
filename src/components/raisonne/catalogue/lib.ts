import { GRID_CLASS, GRID_SIZES, formatCount } from '@/components/raisonne/works/lib';

import { ONE_OF_ONE_TYPE, type CatalogueEntry, type CatalogueTypeFilter } from './entry';

/**
 * The rules behind every list: what the URL holds, how it filters, how it
 * sorts, and what the facets offer.
 *
 * All of it is pure and runs on the server, so a list page renders only the
 * rows it shows. A catalogue of 4,031 works never reaches the browser: the
 * whole state is in the URL, the controls are links and a GET form, and one
 * page of 24 cards comes back.
 */

export const PAGE_SIZE = 24;

/**
 * The furthest a URL may ask for. A list is paged rather than grown, so one
 * request costs one page whatever anybody types in the address bar: a
 * catalogue of 4,000 works can never be asked for in a single response.
 */
export const MAX_PAGE = 1000;

/** How many pages a list of this length has. Always at least one. */
export function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / PAGE_SIZE));
}

/** The page a state asks for, never past the end of the list. */
export function clampPage(page: number, total: number): number {
  return Math.min(Math.max(1, page), pageCount(total));
}

/**
 * Where a visitor's chosen view is remembered. It is a cookie rather than
 * local storage so the server can render their view first time, with no
 * flash of the default one.
 */
export const VIEW_COOKIE = 'raisonne-view';

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------

export type ViewId = 'grid' | 'dense' | 'sheet' | 'table' | 'wall';

export interface ViewDefinition {
  id: ViewId;
  label: string;
  /** For the toggle's accessible name. */
  description: string;
}

export const VIEWS: Record<ViewId, ViewDefinition> = {
  grid: { id: 'grid', label: 'Grid', description: 'Cards with captions' },
  dense: { id: 'dense', label: 'Dense', description: 'Smaller cards, more of them' },
  sheet: { id: 'sheet', label: 'Contact sheet', description: 'Images only' },
  table: { id: 'table', label: 'Table', description: 'A row of facts per record' },
  wall: { id: 'wall', label: 'Wall', description: 'One work at a time, sideways' },
};

export const ALL_VIEWS: ViewId[] = ['grid', 'dense', 'sheet', 'table', 'wall'];

/** A list of records rather than artworks: a wall of covers says nothing. */
export const RECORD_VIEWS: ViewId[] = ['grid', 'table'];

/**
 * The grid each view draws. Every one follows the house rule (2 columns on
 * phones, more as the screen widens) and only steps the density; the classes
 * are written out because Tailwind never sees a class built from a variable.
 */
export const VIEW_GRID_CLASS: Record<'grid' | 'dense' | 'sheet', string> = {
  grid: GRID_CLASS,
  dense: 'grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-4 xl:grid-cols-6 3xl:grid-cols-7 4xl:grid-cols-8',
  sheet: 'grid grid-cols-3 gap-2 md:grid-cols-5 xl:grid-cols-8 3xl:grid-cols-10 4xl:grid-cols-12',
};

/** next/image sizes to match each grid, so no tile downloads more than it shows. */
export const VIEW_GRID_SIZES: Record<'grid' | 'dense' | 'sheet', string> = {
  grid: GRID_SIZES,
  dense:
    '(min-width: 2560px) 12vw, (min-width: 1920px) 14vw, (min-width: 1280px) 16vw, (min-width: 768px) 25vw, 50vw',
  sheet: '(min-width: 2560px) 8vw, (min-width: 1920px) 10vw, (min-width: 1280px) 12vw, (min-width: 768px) 20vw, 33vw',
};

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

export type SortId = 'featured' | 'newest' | 'oldest' | 'a-z' | 'z-a' | 'random';

export const SORTS: { id: SortId; label: string }[] = [
  { id: 'featured', label: 'Featured first' },
  { id: 'newest', label: 'Newest' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'a-z', label: 'A to Z' },
  { id: 'z-a', label: 'Z to A' },
  { id: 'random', label: 'Random' },
];

const SORT_IDS = SORTS.map(sort => sort.id);

/**
 * A stable shuffle. Random has to survive paging: a visitor who asks for 24
 * more must not see the first 24 again, so the order comes from the entry's
 * key and a seed that only changes by the day, never from Math.random.
 */
function shuffleRank(key: string, seed: string): number {
  let hash = 2166136261;
  const value = `${seed}:${key}`;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Today, in UTC: the seed the random order uses. */
export function dailySeed(now: number = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

function timeOf(entry: CatalogueEntry): number {
  if (entry.date) {
    const parsed = Date.parse(entry.date);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return entry.year !== null ? Date.UTC(entry.year, 0, 1) : -Infinity;
}

const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

/**
 * Sorts a filtered list. Featured records lead every order, because the
 * artist put them first on purpose; inside each group the chosen order
 * applies, and the original order breaks any tie so a list never jitters.
 *
 * In the default order, a record with no picture also follows one that has
 * one. Half the shows in an archive have no photograph, and a page that
 * opens on two full rows of empty frames says nothing about the work; asked
 * for by date or by title, every record keeps its real place.
 */
export function sortEntries(entries: CatalogueEntry[], sort: SortId, seed: string): CatalogueEntry[] {
  const indexed = entries.map((entry, index) => ({ entry, index }));
  const pictured = (entry: CatalogueEntry) => Boolean(entry.media?.still);

  indexed.sort((a, b) => {
    if (a.entry.featured !== b.entry.featured) return a.entry.featured ? -1 : 1;
    if (sort === 'featured' && pictured(a.entry) !== pictured(b.entry)) return pictured(a.entry) ? -1 : 1;
    switch (sort) {
      case 'newest':
        return timeOf(b.entry) - timeOf(a.entry) || a.index - b.index;
      case 'oldest':
        return timeOf(a.entry) - timeOf(b.entry) || a.index - b.index;
      case 'a-z':
        return collator.compare(a.entry.title, b.entry.title) || a.index - b.index;
      case 'z-a':
        return collator.compare(b.entry.title, a.entry.title) || a.index - b.index;
      case 'random':
        return shuffleRank(a.entry.key, seed) - shuffleRank(b.entry.key, seed) || a.index - b.index;
      default:
        return a.index - b.index;
    }
  });

  return indexed.map(item => item.entry);
}

// ---------------------------------------------------------------------------
// Facets
// ---------------------------------------------------------------------------

export type FacetId = 'type' | 'kind' | 'medium' | 'year' | 'chain' | 'platform';

export const FACET_LABELS: Record<FacetId, string> = {
  type: 'Type',
  kind: 'Kind',
  medium: 'Medium',
  year: 'Year',
  chain: 'Chain',
  platform: 'Platform',
};

export interface FacetValue {
  value: string;
  label: string;
  count: number;
  selected: boolean;
}

export interface Facet {
  id: FacetId;
  label: string;
  /** Type picks one section at a time; the rest add up. */
  multiple: boolean;
  values: FacetValue[];
  /** How many of its values are chosen right now. */
  activeCount: number;
}

/** The values one entry offers a facet. Type is handled on its own. */
function facetValues(entry: CatalogueEntry, facet: FacetId): string[] {
  switch (facet) {
    case 'kind':
      return entry.kind ? [entry.kind] : [];
    case 'medium':
      return entry.medium;
    case 'year':
      return entry.year !== null ? [String(entry.year)] : [];
    case 'chain':
      return entry.chain ? [entry.chain] : [];
    case 'platform':
      return entry.platform ? [entry.platform] : [];
    default:
      return [];
  }
}

const CHAIN_FACET_LABELS: Record<string, string> = {
  ethereum: 'Ethereum',
  base: 'Base',
  tezos: 'Tezos',
  bitcoin: 'Bitcoin',
  solana: 'Solana',
};

function facetLabel(facet: FacetId, value: string): string {
  return facet === 'chain' ? (CHAIN_FACET_LABELS[value] ?? value) : value;
}

// ---------------------------------------------------------------------------
// The state a list keeps in its URL
// ---------------------------------------------------------------------------

export interface CatalogueState {
  q: string;
  /** Which section of the index: one at a time, null for everything. */
  type: CatalogueTypeFilter | null;
  kind: string[];
  chain: string[];
  year: string[];
  medium: string[];
  platform: string[];
  sort: SortId;
  view: ViewId;
  /** Which page of PAGE_SIZE rows, counting from 1. */
  page: number;
  /**
   * The last page shown, when a list grows instead of turning: rows run from
   * the start of `page` to the end of this one. Absent means one page. Only a
   * design that loads more as the visitor scrolls ever asks for it.
   */
  through?: number;
}

export interface CatalogueConfig {
  /** The route the list lives on, e.g. /works. */
  basePath: string;
  /** Which of the five views this list offers. */
  views: ViewId[];
  defaultView: ViewId;
  defaultSort: SortId;
  /** Names the section, e.g. "Search exhibitions". */
  searchPlaceholder: string;
  /** Which facets this list shows, in order. */
  facets: FacetId[];
  /** Singular noun for the counter, e.g. "work". */
  noun: string;
  nounPlural: string;
  /** What this list would hold, said plainly, for the state where it holds nothing. */
  empty: { title: string; description: string };
  /** The sections the type facet offers, when the list has one. */
  typeOptions?: { value: CatalogueTypeFilter | ''; label: string; count: number }[];
  /** Group the first, unsearched page into sections by this field. */
  groupBy?: 'type' | 'kind' | null;
  /**
   * Mark the records the artist leads with inside the grid itself. A list
   * that does this needs no separate "featured" band above it, and so shows
   * each record once.
   */
  markFeatured?: boolean;
}

export type RawSearchParams = Record<string, string | string[] | undefined>;

function firstParam(params: RawSearchParams, key: string): string {
  const value = params[key];
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === 'string' ? raw.trim() : '';
}

/** A facet holds several values in one parameter: ?medium=AI,Textile. */
function listParam(params: RawSearchParams, key: string): string[] {
  const raw = firstParam(params, key);
  if (!raw) return [];
  const values: string[] = [];
  for (const part of raw.split(',')) {
    const value = part.trim();
    if (value && !values.includes(value)) values.push(value);
  }
  return values;
}

const TYPE_VALUES: CatalogueTypeFilter[] = [
  'series',
  'work',
  ONE_OF_ONE_TYPE,
  'installation',
  'immersive',
  'physical-work',
  'exhibition',
  'collaboration',
  'award',
  'writing',
  'press',
  'drop',
];

/** The type section a URL asks for, or null when it asks for everything. */
export function parseType(value: string): CatalogueTypeFilter | null {
  return TYPE_VALUES.find(type => type === value) ?? null;
}

/**
 * Reads the whole state out of the URL. Anything unknown falls back to the
 * list's own default, so a hand-edited or stale link still renders.
 * `storedView` is the visitor's remembered choice (a cookie), used only when
 * the URL does not name one.
 */
export function parseState(
  params: RawSearchParams,
  config: CatalogueConfig,
  storedView?: string | null,
): CatalogueState {
  const requestedView = firstParam(params, 'view');
  const view =
    config.views.find(id => id === requestedView) ??
    config.views.find(id => id === storedView) ??
    config.defaultView;
  const sort = SORT_IDS.find(id => id === firstParam(params, 'sort')) ?? config.defaultSort;
  const page = Number.parseInt(firstParam(params, 'page'), 10);
  const through = Number.parseInt(firstParam(params, 'through'), 10);
  const first = Number.isFinite(page) && page > 1 ? Math.min(page, MAX_PAGE) : 1;

  return {
    q: firstParam(params, 'q'),
    type: parseType(firstParam(params, 'type')),
    kind: listParam(params, 'kind'),
    chain: listParam(params, 'chain'),
    year: listParam(params, 'year'),
    medium: listParam(params, 'medium'),
    platform: listParam(params, 'platform'),
    sort,
    view,
    page: first,
    ...(Number.isFinite(through) && through > first ? { through: Math.min(through, MAX_PAGE) } : {}),
  };
}

/** The facet parameters, so one loop can read and clear them all. */
const FACET_PARAMS: Exclude<FacetId, 'type'>[] = ['kind', 'chain', 'year', 'medium', 'platform'];

export type StateChange = Partial<{
  q: string;
  type: CatalogueTypeFilter | null;
  kind: string[];
  chain: string[];
  year: string[];
  medium: string[];
  platform: string[];
  sort: SortId;
  view: ViewId;
  page: number;
  through: number;
}>;

/**
 * The URL for a changed state. Defaults are left out, so the plain route is
 * the unfiltered list and a shared link carries only what was chosen.
 * Changing anything but `page` starts the list again at page one.
 */
export function catalogueHref(config: CatalogueConfig, state: CatalogueState, change: StateChange = {}): string {
  const next: CatalogueState = { ...state, ...change };
  if (!('page' in change)) next.page = 1;
  // A grown list starts again with whatever else changes.
  if (!('through' in change)) next.through = undefined;

  const params = new URLSearchParams();
  if (next.q) params.set('q', next.q);
  if (next.type) params.set('type', next.type);
  for (const key of FACET_PARAMS) {
    const values = next[key];
    if (values.length > 0) params.set(key, values.join(','));
  }
  if (next.sort !== config.defaultSort) params.set('sort', next.sort);
  if (next.view !== config.defaultView) params.set('view', next.view);
  if (next.page > 1) params.set('page', String(next.page));
  if (next.through && next.through > next.page) params.set('through', String(next.through));

  const query = params.toString();
  return query ? `${config.basePath}?${query}` : config.basePath;
}

/** Adds or removes one value of a facet, keeping the rest. */
export function toggleFacetValue(state: CatalogueState, facet: FacetId, value: string): StateChange {
  if (facet === 'type') return { type: state.type === value ? null : (value as CatalogueTypeFilter) };
  const current = state[facet];
  const next = current.includes(value) ? current.filter(item => item !== value) : [...current, value];
  switch (facet) {
    case 'kind':
      return { kind: next };
    case 'chain':
      return { chain: next };
    case 'year':
      return { year: next };
    case 'medium':
      return { medium: next };
    case 'platform':
      return { platform: next };
    default:
      return {};
  }
}

/** True when anything at all is narrowing the list. */
export function isFiltered(state: CatalogueState): boolean {
  return Boolean(state.q) || state.type !== null || FACET_PARAMS.some(key => state[key].length > 0);
}

/** Clears the search and every facet, keeping the view and the sort. */
export function clearedState(): StateChange {
  return { q: '', type: null, kind: [], chain: [], year: [], medium: [], platform: [] };
}

/** Every filter in force, as chips a visitor can take off one at a time. */
export function activeFilters(
  state: CatalogueState,
  config: CatalogueConfig,
): { id: string; label: string; value: string; href: string }[] {
  const chips: { id: string; label: string; value: string; href: string }[] = [];

  if (state.q) {
    chips.push({ id: 'q', label: 'Search', value: state.q, href: catalogueHref(config, state, { q: '' }) });
  }
  if (state.type) {
    const option = config.typeOptions?.find(entry => entry.value === state.type);
    chips.push({
      id: 'type',
      label: FACET_LABELS.type,
      value: option?.label ?? state.type,
      href: catalogueHref(config, state, { type: null }),
    });
  }
  for (const facet of FACET_PARAMS) {
    for (const value of state[facet]) {
      chips.push({
        id: `${facet}:${value}`,
        label: FACET_LABELS[facet],
        value: facetLabel(facet, value),
        href: catalogueHref(config, state, toggleFacetValue(state, facet, value)),
      });
    }
  }
  return chips;
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

/** Every word has to match somewhere, so two words narrow rather than widen. */
function matchesQuery(entry: CatalogueEntry, terms: string[]): boolean {
  return terms.every(term => entry.search.includes(term));
}

export function queryTerms(q: string): string[] {
  return q
    .toLowerCase()
    .split(/\s+/)
    .map(term => term.trim())
    .filter(Boolean);
}

function matchesFacet(entry: CatalogueEntry, facet: Exclude<FacetId, 'type'>, chosen: string[]): boolean {
  if (chosen.length === 0) return true;
  const values = facetValues(entry, facet);
  return chosen.some(value => values.includes(value));
}

/**
 * The entries a state leaves, optionally ignoring one facet so that facet
 * can count what picking it would leave (the count beside every option).
 */
export function filterEntries(
  entries: CatalogueEntry[],
  state: CatalogueState,
  except?: FacetId,
): CatalogueEntry[] {
  const terms = queryTerms(state.q);
  return entries.filter(entry => {
    if (terms.length > 0 && !matchesQuery(entry, terms)) return false;
    for (const facet of FACET_PARAMS) {
      if (facet === except) continue;
      if (!matchesFacet(entry, facet, state[facet])) return false;
    }
    return true;
  });
}

/**
 * The facets for a list, each value counted against the other filters, so a
 * number beside an option is what choosing it would really leave. Values
 * with no entries at all are dropped, and a facet with only one value is
 * dropped too: a filter that cannot narrow anything is furniture.
 */
export function buildFacets(entries: CatalogueEntry[], state: CatalogueState, config: CatalogueConfig): Facet[] {
  const facets: Facet[] = [];

  for (const id of config.facets) {
    if (id === 'type') {
      const options = config.typeOptions ?? [];
      const values: FacetValue[] = options
        .filter(option => option.value !== '')
        .map(option => ({
          value: String(option.value),
          label: option.label,
          count: option.count,
          selected: state.type === option.value,
        }));
      if (values.length > 1) {
        facets.push({ id, label: FACET_LABELS[id], multiple: false, values, activeCount: state.type ? 1 : 0 });
      }
      continue;
    }

    const pool = filterEntries(entries, state, id);
    const counts = new Map<string, number>();
    for (const entry of pool) {
      for (const value of facetValues(entry, id)) counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    // A chosen value stays visible even when the other filters count it at zero.
    for (const value of state[id]) if (!counts.has(value)) counts.set(value, 0);

    const values: FacetValue[] = [...counts.entries()]
      .map(([value, count]) => ({ value, label: facetLabel(id, value), count, selected: state[id].includes(value) }))
      .sort((a, b) => (id === 'year' ? b.value.localeCompare(a.value) : b.count - a.count || a.label.localeCompare(b.label)));

    if (values.length > 1) {
      facets.push({
        id,
        label: FACET_LABELS[id],
        multiple: true,
        values,
        activeCount: state[id].length,
      });
    }
  }

  return facets;
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

export interface CatalogueGroup {
  id: string;
  label: string;
  entries: CatalogueEntry[];
  /** The group holds more than one kind of record, so each card says what it is. */
  mixed: boolean;
}

/** Fewer than this in a section and it is an orphan row, not a section. */
const MIN_GROUP = 3;

/**
 * The first page of an unsearched list reads better in sections: series,
 * then shows, then awards. A search or a different sort flattens it, because
 * then the order itself is the answer.
 *
 * A section with one or two records in it is not a section. A heading called
 * "Work 1" over a six-column row with five empty cells reads as a bug, so
 * the stragglers are gathered into one last group and each card names its
 * own type there.
 */
export function groupEntries(entries: CatalogueEntry[], by: 'type' | 'kind'): CatalogueGroup[] {
  const groups = new Map<string, CatalogueGroup>();
  for (const entry of entries) {
    const label = by === 'type' ? entry.typeLabel : (entry.kind ?? 'Other');
    const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const group = groups.get(id) ?? { id, label, entries: [], mixed: false };
    group.entries.push(entry);
    groups.set(id, group);
  }

  const kept = [...groups.values()].filter(group => group.entries.length >= MIN_GROUP);
  const rest = [...groups.values()].filter(group => group.entries.length < MIN_GROUP);
  if (rest.length === 0) return kept;

  const gathered = rest.flatMap(group => group.entries);
  // Nothing reached a section's worth: one plain grid beats a page of one-row headings.
  if (kept.length === 0) return [{ id: 'all', label: 'In the catalogue', entries: gathered, mixed: true }];
  return [...kept, { id: 'also', label: 'Also in the catalogue', entries: gathered, mixed: true }];
}

/**
 * "3,915 works, page 2 of 164": what the list holds and where in it the
 * visitor is. Pages are numbered rather than grown, so the position is a
 * fact a scholar can cite rather than a scroll depth.
 */
export function countLabel(total: number, page: number, config: CatalogueConfig): string {
  const noun = total === 1 ? config.noun : config.nounPlural;
  const pages = pageCount(total);
  const count = `${formatCount(total)} ${noun}`;
  return pages > 1 ? `${count}, page ${formatCount(page)} of ${formatCount(pages)}` : count;
}
