/**
 * The importer's wire format: a run streams newline-delimited JSON, one
 * ImportEvent per line, in the order things happen. The import page reduces
 * these events into what it shows, so a recorded run (see getImportReplay in
 * src/fixtures) replays exactly like a live one.
 *
 * These are importer shapes, not site shapes: an import finds candidates and
 * the evidence for each; the artist decides which become Series and Works.
 */

export type ImportChain = 'ethereum' | 'base';

/**
 * The discovery passes, in the order the page lists them.
 *  - deployed:        contracts a wallet deployed directly
 *  - ownership-logs:  contracts that ever made a wallet their owner (catches factory deploys)
 *  - held:            contracts a wallet holds tokens in, with their deployer
 *  - owner-check:     owner() on every candidate contract
 *  - shared-mints:    tokens a wallet created on marketplace-shared contracts
 *  - enumerate:       tokens and media for each attributed series
 */
export type DiscoveryStep = 'deployed' | 'ownership-logs' | 'held' | 'owner-check' | 'shared-mints' | 'enumerate';

export type ImportSignal = 'deployer' | 'ownership-log' | 'owner' | 'token-creator' | 'storefront-decode' | 'minted-to';

/**
 * confirmed: a deployer, ownership, owner() or token-level creator signal
 *            points at one of the wallets.
 * suggested: only a mint to the wallet, or control of a contract someone
 *            else deployed. Shown for review, never added by default.
 */
export type ImportConfidence = 'confirmed' | 'suggested';

/** The wallets control the contract but the works are not solely theirs. */
export type ImportReviewFlag = 'co-authored';

export interface ImportEvidence {
  signal: ImportSignal;
  /** Lowercased wallet the signal points at. */
  wallet: string;
  detail?: string;
  txHash?: string;
}

export interface DiscoveredSeries {
  chain: ImportChain;
  /** Lowercased contract address. */
  contract: string;
  name: string | null;
  tokenType: 'ERC721' | 'ERC1155' | 'UNKNOWN';
  confidence: ImportConfidence;
  evidence: ImportEvidence[];
  /** A marketplace contract shared by many artists: only token-level evidence counts. */
  shared: boolean;
  reviewFlag: ImportReviewFlag | null;
  /** Works attributed to the wallets in this series, or null until known. */
  workCount: number | null;
}

export type DiscoveredMediaType = 'image' | 'video' | 'html' | 'unknown';

export interface DiscoveredWork {
  chain: ImportChain;
  contract: string;
  tokenId: string;
  title: string | null;
  description: string | null;
  /** A light still for grid cards (about 1000 px). */
  thumbnail: string | null;
  /** The largest still available. */
  image: string | null;
  /** Video or HTML original. */
  animationUrl: string | null;
  mediaType: DiscoveredMediaType;
  width: number | null;
  height: number | null;
  explorerUrl: string;
  evidence: ImportEvidence;
}

export interface ScoreRow {
  chain: ImportChain;
  contract: string;
  name: string;
  expected: number;
  /** Works the importer attributed, or null when the series was not found. */
  found: number | null;
  confidence: ImportConfidence | null;
  signals: ImportSignal[];
  reviewFlag: ImportReviewFlag | null;
}

/** How a run compares with a known list of the artist's contracts. */
export interface ImportScore {
  fixtureTotal: number;
  confirmed: ScoreRow[];
  suggested: ScoreRow[];
  missed: ScoreRow[];
  /** Series found that the known list does not have. Not automatically wrong. */
  extra: {
    chain: ImportChain;
    contract: string;
    name: string | null;
    confidence: ImportConfidence;
    signals: ImportSignal[];
  }[];
  timeToFirstSeriesMs: number | null;
  totalMs: number;
  outOfScope: { label: string; works: number }[];
}

/**
 * A 'series' event can arrive more than once for the same chain + contract:
 * the latest one replaces the earlier ones. 'works' for a contract always
 * follow its first 'series' event. `ms` is time since the run started.
 */
export type ImportEvent =
  | { type: 'start'; wallets: string[]; chains: ImportChain[] }
  | {
      type: 'step';
      step: DiscoveryStep;
      chain: ImportChain | 'all';
      status: 'running' | 'done' | 'skipped' | 'error';
      count?: number;
      message?: string;
      ms: number;
    }
  | { type: 'series'; series: DiscoveredSeries; ms: number }
  | { type: 'works'; chain: ImportChain; contract: string; works: DiscoveredWork[]; ms: number }
  | { type: 'score'; score: ImportScore }
  | { type: 'done'; ms: number }
  | { type: 'error'; message: string; ms: number };

export const IMPORT_EVENT_TYPES: ReadonlySet<ImportEvent['type']> = new Set([
  'start',
  'step',
  'series',
  'works',
  'score',
  'done',
  'error',
]);

/** A parsed stream line the page knows: a record whose `type` is an ImportEvent type. */
export function isImportEvent(value: unknown): value is ImportEvent {
  if (typeof value !== 'object' || value === null) return false;
  const type = (value as { type?: unknown }).type;
  return typeof type === 'string' && IMPORT_EVENT_TYPES.has(type as ImportEvent['type']);
}
