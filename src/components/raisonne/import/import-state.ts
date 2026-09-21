import type {
  DiscoveredSeries,
  DiscoveredWork,
  DiscoveryStep,
  ImportChain,
  ImportEvent,
  ImportScore,
  ImportSignal,
} from '@/lib/import-events';

import { CHAIN_LABELS as ALL_CHAIN_LABELS } from '../works/lib';

/**
 * What the import page shows, built only from the ImportEvent stream.
 *
 * A pure reducer with no clock of its own, so the same events always produce
 * the same screen: a live run, a recorded replay and a design-system snapshot
 * all go through it. Durations come from the events (`ms`, the importer's
 * clock); the browser clock (`at`) is only used for the live timers.
 */

export const IMPORT_CHAINS: readonly ImportChain[] = ['ethereum', 'base'];

/** The same words the rest of the site uses, for the chains an import covers. */
export const CHAIN_LABELS: Record<ImportChain, string> = {
  ethereum: ALL_CHAIN_LABELS.ethereum,
  base: ALL_CHAIN_LABELS.base,
};

/** What each chain is scanned for, shown next to its checkbox. */
export const CHAIN_NOTES: Record<ImportChain, string> = {
  ethereum: 'All six passes.',
  base: 'Held contracts, owner() and works. Deploy and ownership-log scans are not available on Base yet.',
};

/** Wallets per import: an artist mints from a handful, more is a paste accident. */
export const MAX_IMPORT_WALLETS = 10;

/** The six discovery passes, in the order the progress table lists them. */
export const DISCOVERY_STEPS: readonly { step: DiscoveryStep; label: string; description: string }[] = [
  {
    step: 'deployed',
    label: 'Deployed contracts',
    description: 'Contracts a wallet deployed itself.',
  },
  {
    step: 'ownership-logs',
    label: 'Ownership logs',
    description: 'Contracts that ever made a wallet their owner, which catches factory deploys.',
  },
  {
    step: 'held',
    label: 'Held contracts',
    description: 'Contracts a wallet holds tokens in, with who deployed them.',
  },
  {
    step: 'owner-check',
    label: 'Owner check',
    description: 'Asks every candidate contract who owns it today.',
  },
  {
    step: 'shared-mints',
    label: 'Shared-contract mints',
    description: 'Works a wallet created on marketplace contracts shared by many artists.',
  },
  {
    step: 'enumerate',
    label: 'Works and media',
    description: 'Tokens and stills for every series found.',
  },
];

export type StepStatus = 'pending' | 'running' | 'done' | 'skipped' | 'error';

export interface StepState {
  status: StepStatus;
  count: number | null;
  message: string | null;
  /** Importer clock (ms since the run began) when the pass started and settled. */
  startedMs: number | null;
  endedMs: number | null;
  /** Browser clock when the running event arrived, for the live per-pass timer. */
  startedAt: number | null;
}

export type ImportPhase = 'idle' | 'running' | 'done' | 'failed' | 'aborted';

export interface ImportState {
  phase: ImportPhase;
  wallets: string[];
  chains: ImportChain[];
  /** Browser clock when the run started and settled. Null for a snapshot. */
  startedAt: number | null;
  endedAt: number | null;
  /** The latest importer time any event carried. */
  lastMs: number;
  /** Keyed by stepKey(); the chain part is 'all' for a pass run once across chains. */
  steps: Record<string, StepState>;
  /** Keyed by seriesKey(). A later event for the same contract replaces the earlier one. */
  series: Record<string, DiscoveredSeries>;
  /** Series keys in the order they first arrived, so rows never jump around. */
  seriesOrder: string[];
  works: Record<string, DiscoveredWork[]>;
  /** Series keys in the order their first works arrived. */
  worksOrder: string[];
  score: ImportScore | null;
  firstSeriesMs: number | null;
  totalMs: number | null;
  errors: string[];
  malformedLines: number;
}

export type ImportAction =
  | { kind: 'start'; wallets: string[]; chains: ImportChain[]; at: number | null }
  | { kind: 'event'; event: ImportEvent; at: number | null }
  | { kind: 'malformed' }
  | { kind: 'ended'; at: number | null }
  | { kind: 'failed'; message: string; at: number | null }
  | { kind: 'aborted'; at: number | null }
  | { kind: 'reset' };

export const initialImportState: ImportState = {
  phase: 'idle',
  wallets: [],
  chains: [],
  startedAt: null,
  endedAt: null,
  lastMs: 0,
  steps: {},
  series: {},
  seriesOrder: [],
  works: {},
  worksOrder: [],
  score: null,
  firstSeriesMs: null,
  totalMs: null,
  errors: [],
  malformedLines: 0,
};

export const seriesKey = (chain: ImportChain, contract: string): string => `${chain}:${contract.toLowerCase()}`;

export const stepKey = (chain: ImportChain | 'all', step: DiscoveryStep): string => `${chain}:${step}`;

/** The importer time an event carries; `start` and `score` carry none. */
export function eventMs(event: ImportEvent): number | null {
  return 'ms' in event && typeof event.ms === 'number' && Number.isFinite(event.ms) ? event.ms : null;
}

/**
 * Messages are rendered as text, but a provider key in a URL should never
 * reach the page, so anything that looks like one is blanked first.
 */
export function redactSecrets(text: string): string {
  return text
    .replace(/(alchemy\.com\/(?:nft\/v\d+\/|v\d+\/))[^/\s?#"'<>]+/gi, '$1[redacted]')
    .replace(/([?&](?:apikey|api_key|key|token)=)[^&\s"'<>]+/gi, '$1[redacted]');
}

const PENDING_STEP: StepState = {
  status: 'pending',
  count: null,
  message: null,
  startedMs: null,
  endedMs: null,
  startedAt: null,
};

/**
 * The fields each event is read through. A line that parses but lacks them
 * would throw inside the reducer and take the page down, so it is dropped.
 */
function isWellFormed(event: ImportEvent): boolean {
  const e = event as unknown as Record<string, unknown>;
  const isString = (value: unknown) => typeof value === 'string';
  switch (event.type) {
    case 'start':
      return Array.isArray(e.wallets) && Array.isArray(e.chains);
    case 'step':
      return isString(e.step) && isString(e.chain) && isString(e.status) && (e.message == null || isString(e.message));
    case 'series': {
      const series = e.series as Record<string, unknown> | null | undefined;
      return (
        typeof series === 'object' &&
        series !== null &&
        isString(series.chain) &&
        isString(series.contract) &&
        Array.isArray(series.evidence)
      );
    }
    case 'works':
      return isString(e.chain) && isString(e.contract) && Array.isArray(e.works);
    case 'error':
      return isString(e.message);
    default:
      return true;
  }
}

function applyEvent(state: ImportState, event: ImportEvent, at: number | null): ImportState {
  if (!isWellFormed(event)) return state;
  const ms = eventMs(event);
  const next = ms !== null && ms > state.lastMs ? { ...state, lastMs: ms } : state;

  switch (event.type) {
    case 'start':
      return { ...next, wallets: event.wallets, chains: event.chains };

    case 'step': {
      const key = stepKey(event.chain, event.step);
      const prev = next.steps[key] ?? PENDING_STEP;
      const message = event.message ? redactSecrets(event.message) : prev.message;
      const step: StepState =
        event.status === 'running'
          ? { ...prev, status: 'running', count: event.count ?? prev.count, message, startedMs: event.ms, startedAt: at }
          : { ...prev, status: event.status, count: event.count ?? prev.count, message, endedMs: event.ms };
      return { ...next, steps: { ...next.steps, [key]: step } };
    }

    case 'series': {
      const key = seriesKey(event.series.chain, event.series.contract);
      const isNew = !(key in next.series);
      return {
        ...next,
        series: { ...next.series, [key]: event.series },
        seriesOrder: isNew ? [...next.seriesOrder, key] : next.seriesOrder,
        firstSeriesMs: next.firstSeriesMs ?? event.ms,
      };
    }

    case 'works': {
      // Works may come in pages; keep the first copy of each token so a
      // repeated page cannot double a series.
      const key = seriesKey(event.chain, event.contract);
      const existing = next.works[key] ?? [];
      const seen = new Set(existing.map(work => work.tokenId));
      const added = event.works.filter(work => {
        if (typeof work !== 'object' || work === null || typeof work.tokenId !== 'string') return false;
        if (seen.has(work.tokenId)) return false;
        seen.add(work.tokenId);
        return true;
      });
      if (!added.length) return next;
      return {
        ...next,
        works: { ...next.works, [key]: [...existing, ...added] },
        worksOrder: existing.length ? next.worksOrder : [...next.worksOrder, key],
      };
    }

    case 'score':
      return { ...next, score: event.score };

    case 'done':
      return {
        ...next,
        phase: next.phase === 'running' ? 'done' : next.phase,
        totalMs: event.ms,
        endedAt: next.endedAt ?? at,
      };

    case 'error':
      // Not fatal on its own: the importer may carry on with the other chain.
      // A stream that then closes without `done` is what fails the run.
      return { ...next, errors: [...next.errors, redactSecrets(event.message)] };

    default:
      return next;
  }
}

export function importReducer(state: ImportState, action: ImportAction): ImportState {
  switch (action.kind) {
    case 'start':
      return {
        ...initialImportState,
        phase: 'running',
        wallets: action.wallets,
        chains: action.chains,
        startedAt: action.at,
      };

    case 'event':
      // Nothing that arrives after a stop should repaint the screen.
      if (state.phase !== 'running' && state.phase !== 'done') return state;
      return applyEvent(state, action.event, action.at);

    case 'malformed':
      return { ...state, malformedLines: state.malformedLines + 1 };

    case 'ended':
      if (state.phase !== 'running') return state;
      return {
        ...state,
        phase: 'failed',
        endedAt: action.at,
        errors: [...state.errors, 'The import stopped before it finished.'],
      };

    case 'failed':
      if (state.phase !== 'running') return state;
      return { ...state, phase: 'failed', endedAt: action.at, errors: [...state.errors, redactSecrets(action.message)] };

    case 'aborted':
      if (state.phase !== 'running') return state;
      return { ...state, phase: 'aborted', endedAt: action.at };

    case 'reset':
      return initialImportState;

    default:
      return state;
  }
}

/**
 * The state a recorded stream reaches by `untilMs` on the importer's clock,
 * without a browser clock: what the design system shows as a frozen moment.
 * Pass `settle` to close a stream that has no `done` the way a live run would.
 */
export function replayState(
  events: readonly ImportEvent[],
  { untilMs = Number.POSITIVE_INFINITY, settle = false }: { untilMs?: number; settle?: boolean } = {}
): ImportState {
  const start = events.find(event => event.type === 'start');
  let state = importReducer(initialImportState, {
    kind: 'start',
    wallets: start?.type === 'start' ? start.wallets : [],
    chains: start?.type === 'start' ? start.chains : [],
    at: null,
  });
  for (const event of events) {
    const ms = eventMs(event);
    if (ms !== null && ms > untilMs) break;
    state = importReducer(state, { kind: 'event', event, at: null });
  }
  if (settle) state = importReducer(state, { kind: 'ended', at: null });
  return state;
}

/** The cell for one pass on one chain, falling back to a pass run once for every chain. */
export function stepFor(state: ImportState, chain: ImportChain, step: DiscoveryStep): StepState | null {
  return state.steps[stepKey(chain, step)] ?? state.steps[stepKey('all', step)] ?? null;
}

/** True when a pass reported only once, for all chains together. */
export function stepIsShared(state: ImportState, chains: readonly ImportChain[], step: DiscoveryStep): boolean {
  return Boolean(state.steps[stepKey('all', step)]) && chains.every(chain => !state.steps[stepKey(chain, step)]);
}

/**
 * Where an include switch starts: confirmed series on; suggested series off;
 * co-authored series off even when confirmed, because the wallets control the
 * contract but the works are not all theirs, so a person decides.
 */
export function defaultIncluded(series: DiscoveredSeries): boolean {
  return series.confidence === 'confirmed' && series.reviewFlag !== 'co-authored';
}

/** Toggles someone has touched, by series key. Everything else follows defaultIncluded. */
export type IncludeOverrides = Record<string, boolean>;

export function isIncluded(state: ImportState, overrides: IncludeOverrides, key: string): boolean {
  if (key in overrides) return overrides[key];
  const series = state.series[key];
  return series ? defaultIncluded(series) : false;
}

/** Series keys split for review: confirmed first, suggested apart; arrival order within each. */
export function partitionSeries(state: ImportState): { confirmed: string[]; suggested: string[] } {
  const confirmed: string[] = [];
  const suggested: string[] = [];
  for (const key of state.seriesOrder) {
    const series = state.series[key];
    if (!series) continue;
    (series.confidence === 'confirmed' ? confirmed : suggested).push(key);
  }
  return { confirmed, suggested };
}

export function includedKeys(state: ImportState, overrides: IncludeOverrides): string[] {
  return state.seriesOrder.filter(key => isIncluded(state, overrides, key));
}

export function loadedWorkCount(state: ImportState): number {
  return Object.values(state.works).reduce((sum, works) => sum + works.length, 0);
}

/** Works in a series: the importer's count when it has one, otherwise what has loaded. */
export function seriesWorkCount(state: ImportState, key: string): number | null {
  const count = state.series[key]?.workCount;
  if (typeof count === 'number') return count;
  const loaded = state.works[key]?.length ?? 0;
  return loaded > 0 ? loaded : null;
}

const CONTROL_SIGNALS: readonly ImportSignal[] = ['owner', 'ownership-log'];
const AUTHORSHIP_SIGNALS: readonly ImportSignal[] = ['deployer', 'token-creator', 'storefront-decode'];

/** Why a suggested series is probably not the artist's, in one sentence. */
export function suggestionReason(series: DiscoveredSeries): string {
  const signals = new Set(series.evidence.map(item => item.signal));
  const controls = CONTROL_SIGNALS.some(signal => signals.has(signal));
  const authored = AUTHORSHIP_SIGNALS.some(signal => signals.has(signal));
  if (controls && !authored) {
    return signals.has('minted-to')
      ? 'Your wallet controls this contract and received mints from it, but another address deployed it.'
      : 'Your wallet controls this contract, but another address deployed it.';
  }
  if (signals.has('minted-to')) {
    return 'Tokens were minted to your wallet on a contract someone else controls, as with an airdrop or a purchase.';
  }
  return 'Only weak evidence links this contract to your wallets.';
}

/** Series keys whose works have loaded, one pass per series at a time, so no series crowds out the rest. */
export function interleavedWorks(
  state: ImportState,
  keys: readonly string[],
  limit: number
): { key: string; work: DiscoveredWork }[] {
  const wanted = new Set(keys);
  const queues = state.worksOrder
    .filter(key => wanted.has(key))
    .map(key => ({ key, works: (state.works[key] ?? []).filter(work => work.thumbnail) }))
    .filter(queue => queue.works.length > 0);
  const out: { key: string; work: DiscoveredWork }[] = [];
  for (let round = 0; out.length < limit; round += 1) {
    let added = false;
    for (const queue of queues) {
      const work = queue.works[round];
      if (!work) continue;
      out.push({ key: queue.key, work });
      added = true;
      if (out.length >= limit) break;
    }
    if (!added) break;
  }
  return out;
}
