/**
 * Builds src/fixtures/local/chain.json: who holds the artist's work, what
 * happened to it, and the leaderboard and insights computed from both.
 *
 *   ALCHEMY_API_KEY=... pnpm snapshot:chain
 *   pnpm snapshot:chain -- --max-events=2000     a fast run while developing
 *   pnpm snapshot:chain -- --series=paste-grounds  one contract only
 *   pnpm snapshot:chain -- --skip-events         holders only, no history
 *   pnpm snapshot:chain -- --ens=50              look up names for the top 50
 *   pnpm snapshot:chain -- --dry-run             print the counts, write nothing
 *
 * What it reads: public chain data through Alchemy. Holders of each of the
 * artist's contracts, the tokens each one holds, and the ERC-721 and
 * ERC-1155 transfers of those contracts. That is the same data any block
 * explorer shows.
 *
 * What it never reads or writes:
 *
 *  - No personal data. No email, no name, no address book, no CMS collector
 *    record. A wallet address is public; everything attached to one in a CMS
 *    is not, and none of it is copied here.
 *  - Nothing outside src/fixtures/local, which is gitignored, so a snapshot
 *    cannot reach the public repository by accident.
 *  - No key is written into the file. ALCHEMY_API_KEY is read from the
 *    environment and stays there.
 *
 * The numbers are computed by src/lib/chain/derive.ts, the same module the
 * running app uses, so a snapshot and a live read can never disagree.
 *
 * The event cap: a contract with a long history is expensive to walk, so
 * --max-events (10,000 by default) stops the walk and the contract is
 * recorded with `truncated: true`. Every page that reads a truncated
 * snapshot is expected to say so rather than print a total that is not one.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import {
  buildInsights,
  buildLeaderboard,
  contractIndex,
  datedHoldings,
  dedupeEvents,
  sortEventsNewestFirst,
  toActivityEvent,
  toHolding,
  type HolderLike,
  type RawTransferLike,
} from '../src/lib/chain/derive.ts';
import type { ActivityEvent, Chain, ChainSnapshot, Holding, SiteData, TokenStandard } from '@/lib/types';

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

const ROOT = process.cwd();
const LOCAL_DIR = path.join(ROOT, 'src', 'fixtures', 'local');
const SITE_FILE = path.join(LOCAL_DIR, 'site.json');
const DEMO_FILE = path.join(ROOT, 'src', 'fixtures', 'demo.json');
const CHAIN_FILE = path.join(LOCAL_DIR, 'chain.json');
const REPORT_FILE = path.join(LOCAL_DIR, 'chain-report.json');

/** Chains this script can read, and what Alchemy calls each one. */
const NETWORKS: Partial<Record<Chain, string>> = {
  ethereum: 'eth-mainnet',
  base: 'base-mainnet',
};

const DEFAULT_MAX_EVENTS = 10_000;
const TRANSFERS_PAGE_SIZE = 1000;
const REQUEST_TIMEOUT_MS = 60_000;
const REQUEST_RETRIES = 2;
/** Pause between calls, so a free-tier key is not rate limited into failing. */
const THROTTLE_MS = 120;

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

interface Options {
  maxEvents: number;
  series: Set<string>;
  skipEvents: boolean;
  ens: number;
  dryRun: boolean;
}

function parseOptions(argv: string[]): Options {
  const options: Options = { maxEvents: DEFAULT_MAX_EVENTS, series: new Set(), skipEvents: false, ens: 0, dryRun: false };
  for (const argument of argv) {
    const [name, value = ''] = argument.replace(/^--/, '').split('=');
    if (name === 'max-events') {
      options.maxEvents = Math.max(1, Number(value) || DEFAULT_MAX_EVENTS);
    } else if (name === 'series') {
      for (const slug of value.split(',')) if (slug.trim()) options.series.add(slug.trim());
    } else if (name === 'skip-events') {
      options.skipEvents = true;
    } else if (name === 'ens') {
      options.ens = Math.max(0, Number(value) || 50);
    } else if (name === 'dry-run') {
      options.dryRun = true;
    }
  }
  return options;
}

const options = parseOptions(process.argv.slice(2));

// ---------------------------------------------------------------------------
// The report
// ---------------------------------------------------------------------------

interface Report {
  startedAt: string;
  finishedAt: string | null;
  source: 'local' | 'demo';
  contracts: { chain: string; address: string; seriesSlug: string; holders: number; events: number; truncated: boolean; error?: string }[];
  notes: string[];
  counts: Record<string, number>;
}

const report: Report = {
  startedAt: new Date().toISOString(),
  finishedAt: null,
  source: 'local',
  contracts: [],
  notes: [],
  counts: {},
};

function note(text: string): void {
  report.notes.push(text);
  console.log(`  ${text}`);
}

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

const KEY = process.env.ALCHEMY_API_KEY?.trim() ?? '';

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  for (let attempt = 0; attempt <= REQUEST_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: { accept: 'application/json', ...(init?.body ? { 'content-type': 'application/json' } : {}), ...init?.headers },
      });
      if (response.status === 429) {
        await sleep(1500 * (attempt + 1));
        continue;
      }
      if (!response.ok) throw new Error(`Alchemy answered ${response.status}`);
      return (await response.json()) as T;
    } catch (error) {
      if (attempt === REQUEST_RETRIES) throw error;
      await sleep(600 * (attempt + 1));
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error('Alchemy could not be reached');
}

function nftUrl(network: string, method: string, params: URLSearchParams): string {
  return `https://${network}.g.alchemy.com/nft/v3/${KEY}/${method}?${params.toString()}`;
}

function rpcUrl(network: string): string {
  return `https://${network}.g.alchemy.com/v2/${KEY}`;
}

// ---------------------------------------------------------------------------
// Reading unknown JSON safely
// ---------------------------------------------------------------------------

function normalizeAddress(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const address = value.trim().toLowerCase();
  return /^0x[0-9a-f]{40}$/.test(address) ? address : null;
}

function normalizeTokenId(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return String(Math.trunc(value));
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return raw.replace(/^0+(?=\d)/, '');
  if (/^0x[0-9a-fA-F]+$/.test(raw)) {
    try {
      return BigInt(raw).toString();
    } catch {
      return null;
    }
  }
  return raw;
}

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = value.startsWith('0x') ? Number(BigInt(value)) : Number(value);
      if (Number.isFinite(parsed)) return parsed;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

/** Alchemy reports native value as a float of ether; this is it back in wei. */
function weiFromEther(value: unknown): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  const [whole = '0', fraction = ''] = value.toFixed(18).split('.');
  return (BigInt(whole) * 10n ** 18n + BigInt(fraction.padEnd(18, '0').slice(0, 18))).toString();
}

// ---------------------------------------------------------------------------
// The two calls this script makes
// ---------------------------------------------------------------------------

interface OwnersResponse {
  owners?: (string | { ownerAddress?: string; tokenBalances?: { tokenId?: string; balance?: string | number }[] })[];
  pageKey?: string;
}

async function readHolders(network: string, contract: string): Promise<Map<string, { tokenId: string; balance: number }[]>> {
  const holders = new Map<string, { tokenId: string; balance: number }[]>();
  let pageKey: string | undefined;

  do {
    const params = new URLSearchParams({ contractAddress: contract, withTokenBalances: 'true' });
    if (pageKey) params.set('pageKey', pageKey);
    const data = await request<OwnersResponse>(nftUrl(network, 'getOwnersForContract', params));

    for (const owner of data.owners ?? []) {
      const address = normalizeAddress(typeof owner === 'string' ? owner : owner.ownerAddress);
      if (!address) continue;
      const tokens = holders.get(address) ?? [];
      if (typeof owner !== 'string') {
        for (const balance of owner.tokenBalances ?? []) {
          const tokenId = normalizeTokenId(balance.tokenId);
          if (tokenId) tokens.push({ tokenId, balance: Math.max(1, toNumber(balance.balance, 1)) });
        }
      }
      holders.set(address, tokens);
    }

    pageKey = data.pageKey;
    if (pageKey) await sleep(THROTTLE_MS);
  } while (pageKey);

  return holders;
}

interface TransfersResponse {
  result?: {
    transfers?: {
      from?: string;
      to?: string;
      tokenId?: string;
      erc1155Metadata?: { tokenId?: string; value?: string }[];
      value?: number | null;
      blockNum?: string;
      hash?: string;
      uniqueId?: string;
      metadata?: { blockTimestamp?: string };
    }[];
    pageKey?: string;
  };
  error?: { message?: string };
}

async function readTransfers(
  network: string,
  chain: Chain,
  contract: string,
  maxEvents: number,
): Promise<{ transfers: RawTransferLike[]; truncated: boolean; toBlock: number | null }> {
  const transfers: RawTransferLike[] = [];
  let pageKey: string | undefined;
  let truncated = false;
  let toBlock: number | null = null;

  do {
    const body = {
      id: 1,
      jsonrpc: '2.0',
      method: 'alchemy_getAssetTransfers',
      params: [
        {
          fromBlock: '0x0',
          toBlock: 'latest',
          contractAddresses: [contract],
          category: ['erc721', 'erc1155'],
          withMetadata: true,
          excludeZeroValue: false,
          order: 'asc',
          maxCount: `0x${TRANSFERS_PAGE_SIZE.toString(16)}`,
          ...(pageKey ? { pageKey } : {}),
        },
      ],
    };

    const data = await request<TransfersResponse>(rpcUrl(network), { method: 'POST', body: JSON.stringify(body) });
    if (data.error) throw new Error(data.error.message ?? 'Alchemy refused the transfers request');

    for (const transfer of data.result?.transfers ?? []) {
      const txHash = typeof transfer.hash === 'string' ? transfer.hash : null;
      if (!txHash) continue;
      const logIndex = Number(transfer.uniqueId?.split(':').pop() ?? 0) || 0;
      const blockNumber = transfer.blockNum ? toNumber(transfer.blockNum, 0) : null;
      if (blockNumber !== null) toBlock = Math.max(toBlock ?? 0, blockNumber);

      const shared = {
        chain,
        contract,
        from: normalizeAddress(transfer.from),
        to: normalizeAddress(transfer.to),
        blockNumber,
        txHash,
        logIndex,
        at: typeof transfer.metadata?.blockTimestamp === 'string' ? transfer.metadata.blockTimestamp : null,
        valueWei: weiFromEther(transfer.value),
      };

      const editions = transfer.erc1155Metadata ?? [];
      if (editions.length) {
        for (const edition of editions) {
          const tokenId = normalizeTokenId(edition.tokenId);
          if (tokenId) transfers.push({ ...shared, tokenId, quantity: Math.max(1, toNumber(edition.value, 1)) });
        }
      } else {
        const tokenId = normalizeTokenId(transfer.tokenId);
        if (tokenId) transfers.push({ ...shared, tokenId, quantity: 1 });
      }
    }

    if (transfers.length >= maxEvents) {
      transfers.length = maxEvents;
      truncated = true;
      break;
    }

    pageKey = data.result?.pageKey;
    if (pageKey) await sleep(THROTTLE_MS);
  } while (pageKey);

  return { transfers, truncated, toBlock };
}

// ---------------------------------------------------------------------------
// ENS, which is public and optional
// ---------------------------------------------------------------------------

/**
 * Reverse ENS names for the busiest wallets. A name somebody published on
 * chain is public, so it is fair to show; it costs one call each, so it is
 * off unless --ens asks for it, and it is capped.
 */
async function readEnsNames(addresses: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  if (!addresses.length) return names;

  const { createPublicClient, http } = await import('viem');
  const { mainnet } = await import('viem/chains');
  const client = createPublicClient({ chain: mainnet, transport: http(rpcUrl('eth-mainnet')) });

  for (const address of addresses) {
    try {
      const name = await client.getEnsName({ address: address as `0x${string}` });
      if (name) names.set(address, name);
    } catch {
      // A wallet with no name, or a lookup that failed, simply has none.
    }
    await sleep(THROTTLE_MS);
  }
  return names;
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

function readSite(): SiteData {
  for (const [file, source] of [
    [SITE_FILE, 'local'],
    [DEMO_FILE, 'demo'],
  ] as const) {
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8')) as SiteData;
      report.source = source;
      if (source === 'demo') note('no src/fixtures/local/site.json: reading the contracts out of the demo fixture');
      return data;
    } catch {
      continue;
    }
  }
  throw new Error('No fixture to read contracts from. Run pnpm snapshot first.');
}

function writeLocal(file: string, value: unknown): void {
  fs.mkdirSync(LOCAL_DIR, { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

async function run(): Promise<void> {
  if (!KEY) {
    console.error('ALCHEMY_API_KEY is not set. This script reads public chain data through Alchemy and cannot run without a key.');
    console.error('A free key covers an artist-sized catalogue: https://dashboard.alchemy.com');
    process.exitCode = 1;
    return;
  }

  const site = readSite();
  const index = contractIndex(site.series);
  const knownWorkIds = new Set(site.works.map(work => work.id));
  /** The catalogue already knows each token's standard; the holders call does not report it. */
  const standardByWorkId = new Map(site.works.map(work => [work.id, work.standard] as const));
  const standardOf = (chain: Chain, contract: string, tokenId: string): TokenStandard =>
    standardByWorkId.get(`${chain}:${contract}:${tokenId}`) ??
    (site.series.find(series => series.contract?.toLowerCase() === contract)?.standard ?? 'OTHER');

  const contracts = site.series
    .filter(series => series.contract && (!options.series.size || options.series.has(series.slug)))
    .map(series => ({ chain: series.chain, address: series.contract!.toLowerCase(), seriesSlug: series.slug }))
    .filter((entry, position, all) => all.findIndex(other => other.chain === entry.chain && other.address === entry.address) === position);

  console.log(`Reading ${contracts.length} contract${contracts.length === 1 ? '' : 's'} from ${report.source === 'demo' ? 'the demo fixture' : 'local/site.json'}`);

  const holdingsByOwner = new Map<string, Holding[]>();
  const events: ActivityEvent[] = [];
  const snapshotContracts: ChainSnapshot['contracts'] = [];

  for (const entry of contracts) {
    const network = NETWORKS[entry.chain];
    if (!network) {
      note(`${entry.seriesSlug}: ${entry.chain} is not read by this script, so it has no holders or events here`);
      report.contracts.push({ chain: entry.chain, address: entry.address, seriesSlug: entry.seriesSlug, holders: 0, events: 0, truncated: false, error: 'unsupported chain' });
      continue;
    }

    try {
      const holders = await readHolders(network, entry.address);
      for (const [address, tokens] of holders) {
        const list = holdingsByOwner.get(address) ?? [];
        for (const token of tokens) {
          list.push(
            toHolding(
              {
                chain: entry.chain,
                contract: entry.address,
                tokenId: token.tokenId,
                balance: token.balance,
                standard: standardOf(entry.chain, entry.address, token.tokenId),
              },
              index,
              knownWorkIds,
            ),
          );
        }
        holdingsByOwner.set(address, list);
      }

      let truncated = false;
      let toBlock: number | null = null;
      let eventCount = 0;

      if (!options.skipEvents) {
        await sleep(THROTTLE_MS);
        const read = await readTransfers(network, entry.chain, entry.address, options.maxEvents);
        truncated = read.truncated;
        toBlock = read.toBlock;
        for (const transfer of read.transfers) events.push(toActivityEvent(transfer, index, knownWorkIds));
        eventCount = read.transfers.length;
        if (truncated) note(`${entry.seriesSlug}: stopped at ${options.maxEvents} events, the history is longer`);
      }

      snapshotContracts.push({ chain: entry.chain, address: entry.address, seriesSlug: entry.seriesSlug, toBlock, truncated });
      report.contracts.push({
        chain: entry.chain,
        address: entry.address,
        seriesSlug: entry.seriesSlug,
        holders: holders.size,
        events: eventCount,
        truncated,
      });
      console.log(`  ${entry.seriesSlug}: ${holders.size} holders, ${eventCount} events`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown error';
      note(`${entry.seriesSlug}: could not be read (${detail}). It is left out of the snapshot rather than counted as empty.`);
      report.contracts.push({ chain: entry.chain, address: entry.address, seriesSlug: entry.seriesSlug, holders: 0, events: 0, truncated: false, error: detail });
    }
    await sleep(THROTTLE_MS);
  }

  const orderedEvents = sortEventsNewestFirst(dedupeEvents(events));

  // The artist's own wallets hold work without collecting it, so they are
  // holders in the data and not rows on the leaderboard.
  const artistWallets = site.artist.wallets.map(wallet => wallet.address.toLowerCase());

  let holders: HolderLike[] = [...holdingsByOwner.entries()]
    .filter(([address]) => address !== '0x0000000000000000000000000000000000000000')
    .map(([address, holdings]) => ({ address, holdings: datedHoldings(holdings, orderedEvents, address), ens: null }));

  if (options.ens > 0) {
    const busiest = [...holders].sort((a, b) => b.holdings.length - a.holdings.length).slice(0, options.ens);
    const names = await readEnsNames(busiest.map(holder => holder.address));
    holders = holders.map(holder => ({ ...holder, ens: names.get(holder.address) ?? null }));
    note(`${names.size} of ${busiest.length} wallets published an ENS name`);
  }

  const leaderboard = buildLeaderboard(holders, { events: orderedEvents, exclude: artistWallets });

  const gaps: string[] = [];
  if (options.skipEvents) gaps.push('This snapshot was taken with --skip-events, so it holds no history and no volume.');
  if (snapshotContracts.some(contract => contract.truncated)) {
    gaps.push(`One or more contracts hit the ${options.maxEvents} event cap, so the totals cover recent history only.`);
  }
  if (report.contracts.some(contract => contract.error)) {
    gaps.push('One or more contracts could not be read on this run and are missing from these numbers.');
  }
  gaps.push('A sale settled in WETH or through a marketplace contract carries no value in the transaction itself, so it is counted as a transfer, not a sale.');

  const insights = buildInsights(
    orderedEvents,
    holders,
    contracts.map(entry => entry.seriesSlug),
    { gaps },
  );

  const snapshot: ChainSnapshot = {
    computedAt: new Date().toISOString(),
    contracts: snapshotContracts,
    holders: holders.map(holder => ({ address: holder.address, ens: holder.ens ?? null, holdings: [...holder.holdings] })),
    events: orderedEvents,
    leaderboard,
    insights,
  };

  report.counts = {
    contracts: snapshotContracts.length,
    holders: holders.length,
    events: orderedEvents.length,
    sales: insights.sales,
    mints: insights.mints,
    transfers: insights.transfers,
    leaderboard: leaderboard.length,
  };
  report.finishedAt = new Date().toISOString();

  if (options.dryRun) {
    console.log('\nDry run, nothing written.');
    for (const [key, value] of Object.entries(report.counts)) console.log(`  ${key}: ${value}`);
    return;
  }

  writeLocal(CHAIN_FILE, snapshot);
  writeLocal(REPORT_FILE, report);

  console.log('\nWrote src/fixtures/local/chain.json and chain-report.json');
  for (const [key, value] of Object.entries(report.counts)) console.log(`  ${key}: ${value}`);
}

await run();
