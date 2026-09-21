import 'server-only';

import { alchemyKey, chainNetworks } from '@/lib/config';
import type { Chain, TokenStandard } from '@/lib/types';

import { normalizeAddress, normalizeTokenId } from './address';

/**
 * The only thing in this install that talks to a chain indexer.
 *
 * It reads and never writes, it sends no key to the browser (every call is
 * server side), and it asks for public data only: who holds which token, and
 * which transfers happened. No personal data, no private endpoints.
 *
 * Alchemy is the first adapter because it is the one most artists already
 * have a free key for. Everything above this file works from the shapes
 * below, so a second reader (a self-hosted indexer, a subgraph) is a new
 * file, not a rewrite.
 *
 * With no ALCHEMY_API_KEY every function here refuses with a ChainError of
 * code 'not-configured'. Callers turn that into the designed panel that
 * names the variable; nothing invents a number.
 */

// ---------------------------------------------------------------------------
// Networks
// ---------------------------------------------------------------------------

/** Chains this reader can serve, and the Alchemy network each one is. */
const NETWORKS: Partial<Record<Chain, string>> = {
  ethereum: 'eth-mainnet',
  base: 'base-mainnet',
};

/**
 * Tezos, Bitcoin Ordinals and Solana are not read here. Their holdings and
 * events come from the snapshot (scripts/snapshot-chain.ts writes what it
 * can) or from nowhere, and the page says which.
 */
export function alchemyNetwork(chain: Chain): string | null {
  const network = NETWORKS[chain];
  if (!network) return null;
  const pinned = chainNetworks();
  if (pinned.length && !pinned.includes(network)) return null;
  return network;
}

export function alchemySupports(chain: Chain): boolean {
  return alchemyNetwork(chain) !== null;
}

/** True when a key is present. Which chains it can read is a separate question. */
export function alchemyConfigured(): boolean {
  return alchemyKey() !== null;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type ChainErrorCode = 'not-configured' | 'unsupported-chain' | 'rate-limited' | 'upstream' | 'timeout';

/** What went wrong, in a form a page can render without leaking a key or a URL. */
export class ChainError extends Error {
  readonly code: ChainErrorCode;

  constructor(code: ChainErrorCode, message: string) {
    super(message);
    this.name = 'ChainError';
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

const REQUEST_TIMEOUT_MS = 20_000;
const RETRIES = 2;

/** How many pages one call will walk before it stops and says it was truncated. */
export const MAX_PAGES = 20;

/** Alchemy's own maximum for a transfers page. */
export const TRANSFERS_PAGE_SIZE = 1000;

function keyOrThrow(): string {
  const key = alchemyKey();
  if (!key) throw new ChainError('not-configured', 'ALCHEMY_API_KEY is not set');
  return key;
}

function networkOrThrow(chain: Chain): string {
  const network = alchemyNetwork(chain);
  if (!network) throw new ChainError('unsupported-chain', `This reader does not cover ${chain}`);
  return network;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        // These are public reads of slow-moving data, and the TTL cache above
        // this file is what actually stops repeat calls.
        cache: 'no-store',
        headers: { accept: 'application/json', ...(init?.body ? { 'content-type': 'application/json' } : {}), ...init?.headers },
      });
      if (response.status === 429) throw new ChainError('rate-limited', 'The chain indexer is rate limiting this install');
      if (!response.ok) throw new ChainError('upstream', `The chain indexer answered ${response.status}`);
      return (await response.json()) as T;
    } catch (error) {
      lastError = error;
      if (error instanceof ChainError && error.code === 'not-configured') throw error;
      const isLast = attempt === RETRIES;
      if (isLast) break;
      await new Promise(resolve => setTimeout(resolve, 400 * (attempt + 1)));
    } finally {
      clearTimeout(timer);
    }
  }
  if (lastError instanceof ChainError) throw lastError;
  if (lastError instanceof Error && lastError.name === 'AbortError') {
    throw new ChainError('timeout', 'The chain indexer did not answer in time');
  }
  throw new ChainError('upstream', 'The chain indexer could not be reached');
}

function nftUrl(network: string, path: string, params: URLSearchParams): string {
  return `https://${network}.g.alchemy.com/nft/v3/${keyOrThrow()}/${path}?${params.toString()}`;
}

function rpcUrl(network: string): string {
  return `https://${network}.g.alchemy.com/v2/${keyOrThrow()}`;
}

// ---------------------------------------------------------------------------
// What the reader returns
// ---------------------------------------------------------------------------

/** One token an address holds, as the indexer reports it. */
export interface RawHolding {
  chain: Chain;
  contract: string;
  tokenId: string;
  balance: number;
  standard: TokenStandard;
}

/** One holder of a contract, with how much of each token they hold. */
export interface RawHolder {
  address: string;
  tokens: { tokenId: string; balance: number }[];
}

/** One transfer. A price is present only when the transaction itself carried value. */
export interface RawTransfer {
  chain: Chain;
  contract: string;
  tokenId: string;
  from: string | null;
  to: string | null;
  quantity: number;
  blockNumber: number | null;
  txHash: string;
  /** Alchemy's log index inside the transaction, so the id is stable. */
  logIndex: number;
  /** ISO date-time from the block, when the call asked for metadata. */
  at: string | null;
  /** Native currency moved with the transaction, as a decimal string in wei. */
  valueWei: string | null;
}

function toStandard(value: unknown): TokenStandard {
  const text = typeof value === 'string' ? value.toUpperCase() : '';
  if (text === 'ERC721') return 'ERC721';
  if (text === 'ERC1155') return 'ERC1155';
  return 'OTHER';
}

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = value.startsWith('0x') ? Number(BigInt(value)) : Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// Holdings for one address
// ---------------------------------------------------------------------------

interface NftsForOwnerResponse {
  ownedNfts?: {
    contract?: { address?: string; tokenType?: string };
    tokenId?: string;
    balance?: string;
    tokenType?: string;
  }[];
  pageKey?: string;
}

/**
 * Which of the artist's tokens this address holds.
 *
 * The contract list is passed in rather than discovered: a collector's whole
 * wallet is none of this install's business, and asking only about the
 * artist's own contracts keeps the answer small and the question narrow.
 * Alchemy takes at most 45 contracts per call, so longer lists are chunked.
 */
export async function getHoldingsForOwner(chain: Chain, owner: string, contracts: readonly string[]): Promise<RawHolding[]> {
  const network = networkOrThrow(chain);
  const address = normalizeAddress(owner);
  if (!address) return [];
  const list = [...new Set(contracts.map(contract => contract.toLowerCase()))].filter(Boolean);
  if (!list.length) return [];

  const holdings: RawHolding[] = [];
  for (let start = 0; start < list.length; start += 45) {
    const chunk = list.slice(start, start + 45);
    let pageKey: string | undefined;
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const params = new URLSearchParams({ owner: address, withMetadata: 'false', pageSize: '100' });
      for (const contract of chunk) params.append('contractAddresses[]', contract);
      if (pageKey) params.set('pageKey', pageKey);

      const data = await request<NftsForOwnerResponse>(nftUrl(network, 'getNFTsForOwner', params));
      for (const nft of data.ownedNfts ?? []) {
        const contract = normalizeAddress(nft.contract?.address);
        const tokenId = normalizeTokenId(nft.tokenId);
        if (!contract || !tokenId) continue;
        holdings.push({
          chain,
          contract,
          tokenId,
          balance: Math.max(1, toNumber(nft.balance, 1)),
          standard: toStandard(nft.tokenType ?? nft.contract?.tokenType),
        });
      }
      pageKey = data.pageKey;
      if (!pageKey) break;
    }
  }
  return holdings;
}

// ---------------------------------------------------------------------------
// Holders of one contract
// ---------------------------------------------------------------------------

interface OwnersForContractResponse {
  owners?: (string | { ownerAddress?: string; tokenBalances?: { tokenId?: string; balance?: string | number }[] })[];
  pageKey?: string;
}

/**
 * Everyone holding a token of this contract, with which tokens. This is what
 * the leaderboard and the holder counts are computed from, and it is public:
 * the same list any block explorer prints.
 */
export async function getHoldersForContract(chain: Chain, contract: string): Promise<RawHolder[]> {
  const network = networkOrThrow(chain);
  const address = normalizeAddress(contract);
  if (!address) return [];

  const byAddress = new Map<string, RawHolder>();
  let pageKey: string | undefined;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const params = new URLSearchParams({ contractAddress: address, withTokenBalances: 'true' });
    if (pageKey) params.set('pageKey', pageKey);

    const data = await request<OwnersForContractResponse>(nftUrl(network, 'getOwnersForContract', params));
    for (const owner of data.owners ?? []) {
      const ownerAddress = normalizeAddress(typeof owner === 'string' ? owner : owner.ownerAddress);
      if (!ownerAddress) continue;
      const entry = byAddress.get(ownerAddress) ?? { address: ownerAddress, tokens: [] };
      if (typeof owner !== 'string') {
        for (const balance of owner.tokenBalances ?? []) {
          const tokenId = normalizeTokenId(balance.tokenId);
          if (!tokenId) continue;
          entry.tokens.push({ tokenId, balance: Math.max(1, toNumber(balance.balance, 1)) });
        }
      }
      byAddress.set(ownerAddress, entry);
    }
    pageKey = data.pageKey;
    if (!pageKey) break;
  }

  return [...byAddress.values()];
}

// ---------------------------------------------------------------------------
// Transfers
// ---------------------------------------------------------------------------

interface AssetTransfersResponse {
  result?: {
    transfers?: {
      from?: string;
      to?: string;
      tokenId?: string;
      erc1155Metadata?: { tokenId?: string; value?: string }[];
      value?: number | null;
      rawContract?: { address?: string; value?: string };
      blockNum?: string;
      hash?: string;
      uniqueId?: string;
      metadata?: { blockTimestamp?: string };
    }[];
    pageKey?: string;
  };
  error?: { message?: string };
}

export interface TransfersOptions {
  /** Block to start at, as a hex string or "0x0". */
  fromBlock?: string;
  /** Block to stop at. "latest" by default. */
  toBlock?: string;
  /** Stop after this many, so one contract cannot run a snapshot for an hour. */
  maxEvents?: number;
}

/**
 * Every ERC-721 and ERC-1155 transfer of one contract, oldest first.
 *
 * A mint is a transfer from the zero address and a burn is one to it, so
 * nothing else has to be asked for. The native value moved with the
 * transaction comes back where the indexer has it, which is how a sale is
 * told from a gift; a marketplace sale settled in WETH carries no native
 * value, so it stays a transfer rather than becoming a sale with a wrong
 * price.
 */
export async function getTransfersForContract(
  chain: Chain,
  contract: string,
  { fromBlock = '0x0', toBlock = 'latest', maxEvents = 10_000 }: TransfersOptions = {},
): Promise<{ transfers: RawTransfer[]; truncated: boolean }> {
  const network = networkOrThrow(chain);
  const address = normalizeAddress(contract);
  if (!address) return { transfers: [], truncated: false };

  const transfers: RawTransfer[] = [];
  let pageKey: string | undefined;
  let truncated = false;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const body = {
      id: 1,
      jsonrpc: '2.0',
      method: 'alchemy_getAssetTransfers',
      params: [
        {
          fromBlock,
          toBlock,
          contractAddresses: [address],
          category: ['erc721', 'erc1155'],
          withMetadata: true,
          excludeZeroValue: false,
          order: 'asc',
          maxCount: `0x${TRANSFERS_PAGE_SIZE.toString(16)}`,
          ...(pageKey ? { pageKey } : {}),
        },
      ],
    };

    const data = await request<AssetTransfersResponse>(rpcUrl(network), { method: 'POST', body: JSON.stringify(body) });
    if (data.error) throw new ChainError('upstream', data.error.message ?? 'The chain indexer refused the request');

    for (const transfer of data.result?.transfers ?? []) {
      const txHash = typeof transfer.hash === 'string' ? transfer.hash : null;
      if (!txHash) continue;
      // uniqueId is "hash:log:index"; the last part is what keeps two
      // transfers in one transaction apart.
      const logIndex = Number(transfer.uniqueId?.split(':').pop() ?? 0) || 0;
      const from = normalizeAddress(transfer.from);
      const to = normalizeAddress(transfer.to);
      const at = typeof transfer.metadata?.blockTimestamp === 'string' ? transfer.metadata.blockTimestamp : null;
      const blockNumber = transfer.blockNum ? toNumber(transfer.blockNum, 0) : null;
      const valueWei = weiFromEther(transfer.value);

      const editions = transfer.erc1155Metadata ?? [];
      if (editions.length) {
        for (const edition of editions) {
          const tokenId = normalizeTokenId(edition.tokenId);
          if (!tokenId) continue;
          transfers.push({
            chain,
            contract: address,
            tokenId,
            from,
            to,
            quantity: Math.max(1, toNumber(edition.value, 1)),
            blockNumber,
            txHash,
            logIndex,
            at,
            valueWei,
          });
        }
        continue;
      }

      const tokenId = normalizeTokenId(transfer.tokenId);
      if (!tokenId) continue;
      transfers.push({
        chain,
        contract: address,
        tokenId,
        from,
        to,
        quantity: 1,
        blockNumber,
        txHash,
        logIndex,
        at,
        valueWei,
      });
    }

    if (transfers.length >= maxEvents) {
      truncated = true;
      transfers.length = maxEvents;
      break;
    }

    pageKey = data.result?.pageKey;
    if (!pageKey) break;
    if (page === MAX_PAGES - 1) truncated = true;
  }

  return { transfers, truncated };
}

/**
 * Alchemy reports native value as a float of ether, which is lossy. It is
 * turned back into wei as a string here, with the rounding that implies
 * written down rather than hidden: a price is shown to four decimals
 * everywhere, so the last wei of a float was never going to be printed.
 */
function weiFromEther(value: number | null | undefined): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  const [whole = '0', fraction = ''] = value.toFixed(18).split('.');
  return (BigInt(whole) * 10n ** 18n + BigInt(fraction.padEnd(18, '0').slice(0, 18))).toString();
}
