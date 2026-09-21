import type {
  DiscoveredSeries,
  DiscoveredWork,
  DiscoveryStep,
  ImportChain,
  ImportEvent,
  ImportEvidence,
} from '@/lib/import-events';

/**
 * Short recorded-style import streams for the design system, so every import
 * component can be shown in each of its states whatever data this install
 * has. The artist is the fictional demo artist: its wallets and contracts are
 * placeholder hex, and the stills are The Met's Open Access (CC0) decorated
 * papers that the demo fixture uses.
 */

const W1 = '0x000000000000000000000000000000000000de01';
const W2 = '0x000000000000000000000000000000000000de02';

const PASTE = '0x00000000000000000000000000000000de000001';
const FIELDS = '0x00000000000000000000000000000000de000002';
const COMMONS = '0x00000000000000000000000000000000de000003';
const MARKET = '0x00000000000000000000000000000000de00c0de';
const BADGE = '0x00000000000000000000000000000000de00a1d0';
const KEYS = '0x00000000000000000000000000000000de00beef';

const EXPLORER: Record<ImportChain, string> = { ethereum: 'https://etherscan.io', base: 'https://basescan.org' };

const met = (id: string) => `https://images.metmuseum.org/CRDImages/dp/web-large/${id}.jpg`;

function ev(signal: ImportEvidence['signal'], wallet: string, detail: string): ImportEvidence {
  return { signal, wallet, detail };
}

function series(
  chain: ImportChain,
  contract: string,
  name: string,
  patch: Partial<DiscoveredSeries> & Pick<DiscoveredSeries, 'evidence'>
): DiscoveredSeries {
  return {
    chain,
    contract,
    name,
    tokenType: 'ERC721',
    confidence: 'confirmed',
    shared: false,
    reviewFlag: null,
    workCount: null,
    ...patch,
  };
}

function works(
  chain: ImportChain,
  contract: string,
  evidence: ImportEvidence,
  items: [tokenId: string, title: string, still: string, width: number, height: number][]
): DiscoveredWork[] {
  return items.map(([tokenId, title, still, width, height]) => ({
    chain,
    contract,
    tokenId,
    title,
    description: null,
    thumbnail: met(still),
    image: null,
    animationUrl: null,
    mediaType: 'image',
    width,
    height,
    explorerUrl: `${EXPLORER[chain]}/nft/${contract}/${tokenId}`,
    evidence,
  }));
}

type StepStatus = Extract<ImportEvent, { type: 'step' }>['status'];

function step(
  chain: ImportChain,
  name: DiscoveryStep,
  status: StepStatus,
  ms: number,
  extra: { count?: number; message?: string } = {}
): ImportEvent {
  return { type: 'step', step: name, chain, status, ms, ...extra };
}

const deployed1 = ev('deployer', W1, 'deployed by 0x0000…de01');
const owner1 = ev('owner', W1, 'owner() = 0x0000…de01');
const log1 = ev('ownership-log', W1, 'OwnershipTransferred to 0x0000…de01');
const deployed2 = ev('deployer', W2, 'deployed by 0x0000…de02');
const owner2 = ev('owner', W2, 'owner() = 0x0000…de02');
const creator1 = ev('token-creator', W1, 'tokenCreator(id) = 0x0000…de01 on 2 tokens');

const pasteGrounds = (evidence: ImportEvidence[], workCount: number | null) =>
  series('ethereum', PASTE, 'Paste Grounds', { evidence, workCount });
const looseFields = (workCount: number | null) =>
  series('base', FIELDS, 'Loose Fields', { tokenType: 'ERC1155', evidence: [deployed2, owner2], workCount });
const commons = series('base', COMMONS, 'Paper Exchange', {
  evidence: [deployed2, owner2],
  reviewFlag: 'co-authored',
  workCount: 64,
});
const market = (workCount: number | null) =>
  series('ethereum', MARKET, 'Example Marketplace (shared contract)', { evidence: [creator1], shared: true, workCount });
const badge = series('ethereum', BADGE, 'Sample Airdrop Badge', {
  tokenType: 'ERC1155',
  confidence: 'suggested',
  evidence: [ev('minted-to', W1, '1 token minted to 0x0000…de01; the contract is not controlled by these wallets')],
  workCount: 1,
});
const borrowedKeys = series('ethereum', KEYS, 'Borrowed Keys', {
  confidence: 'suggested',
  evidence: [
    ev('owner', W1, 'owner() = 0x0000…de01; deployed by 0x51ab…07c2, not by these wallets'),
    ev('ownership-log', W1, 'OwnershipTransferred to 0x0000…de01'),
  ],
  workCount: 3,
});

const START: ImportEvent = { type: 'start', wallets: [W1, W2], chains: ['ethereum', 'base'] };

/** The opening passes every sample shares: Ethereum runs all six, Base skips the two Etherscan scans. */
const OPENING: ImportEvent[] = [
  START,
  step('ethereum', 'deployed', 'running', 10),
  step('ethereum', 'ownership-logs', 'running', 12),
  step('ethereum', 'held', 'running', 14),
  step('ethereum', 'shared-mints', 'running', 16),
  step('base', 'deployed', 'skipped', 18, {
    message: 'Direct deploys are not scanned on Base; held contracts, mints and owner() stand in',
  }),
  step('base', 'ownership-logs', 'skipped', 18, { message: 'Ownership logs are not scanned on Base; owner() stands in' }),
  step('base', 'held', 'running', 20),
  step('base', 'shared-mints', 'running', 22),
];

/** A complete run of about six seconds: confirmed, co-authored, shared-contract and suggested series. */
export const SAMPLE_IMPORT: ImportEvent[] = [
  ...OPENING,
  step('ethereum', 'deployed', 'done', 1180, { count: 1, message: '1 contract deployed directly, an NFT series with tokens' }),
  { type: 'series', series: pasteGrounds([deployed1], null), ms: 1184 },
  step('ethereum', 'ownership-logs', 'done', 1630, { count: 2, message: '2 contracts made a wallet their owner' }),
  step('ethereum', 'held', 'done', 2210, { count: 5, message: '5 contracts held after hiding 2 flagged as spam' }),
  step('ethereum', 'owner-check', 'running', 2220),
  step('base', 'held', 'done', 2480, { count: 4, message: '4 contracts held, 2 deployed by these wallets' }),
  step('base', 'owner-check', 'running', 2490),
  step('base', 'owner-check', 'done', 3120, { count: 2, message: 'owner() on 4 candidates: 2 owned by these wallets' }),
  { type: 'series', series: looseFields(null), ms: 3125 },
  { type: 'series', series: commons, ms: 3126 },
  step('base', 'shared-mints', 'done', 3300, { count: 0, message: 'No marketplace-shared contracts are checked on Base' }),
  step('base', 'enumerate', 'running', 3310),
  step('ethereum', 'owner-check', 'done', 3710, { count: 2, message: 'owner() on 7 candidates: 2 owned by these wallets' }),
  { type: 'series', series: pasteGrounds([deployed1, owner1, log1], null), ms: 3712 },
  { type: 'series', series: borrowedKeys, ms: 3714 },
  {
    type: 'works',
    chain: 'base',
    contract: FIELDS,
    works: works('base', FIELDS, deployed2, [
      ['1', 'Field 01', 'DP886622', 2186, 2917],
      ['2', 'Field 02', 'DP886621', 1297, 1610],
      ['3', 'Field 03', 'DP886625', 2637, 1534],
      ['4', 'Field 04 (Marbled)', 'DP886478', 1881, 3137],
    ]),
    ms: 3920,
  },
  { type: 'series', series: looseFields(6), ms: 3925 },
  {
    type: 'works',
    chain: 'base',
    contract: COMMONS,
    works: works('base', COMMONS, deployed2, [
      ['7', 'Exchange (Serpent)', 'DP886573', 1027, 1520],
      ['12', 'Exchange (Hem)', 'DP886648', 3536, 2356],
    ]),
    ms: 3960,
  },
  step('base', 'enumerate', 'done', 3970, { count: 2, message: '2 series, 6 preview works' }),
  step('ethereum', 'shared-mints', 'done', 4380, {
    count: 2,
    message: '2 tokens created on a shared marketplace contract; 1 minted-to suggestion',
  }),
  { type: 'series', series: market(null), ms: 4385 },
  { type: 'series', series: badge, ms: 4390 },
  step('ethereum', 'enumerate', 'running', 4400),
  {
    type: 'works',
    chain: 'ethereum',
    contract: PASTE,
    works: works('ethereum', PASTE, deployed1, [
      ['1', 'Ground I (Plum)', 'DP887095', 3468, 2310],
      ['2', 'Ground II (Ochre)', 'DP887096', 1151, 1726],
      ['3', 'Ground III (Cobalt)', 'DP887086', 3629, 2705],
      ['4', 'Ground IV (Ash)', 'DP887100', 2952, 2080],
    ]),
    ms: 5210,
  },
  { type: 'series', series: pasteGrounds([deployed1, owner1, log1], 24), ms: 5215 },
  {
    type: 'works',
    chain: 'ethereum',
    contract: MARKET,
    works: works('ethereum', MARKET, creator1, [
      ['40100', 'Lattice (Rose)', 'DP886578', 2300, 2800],
      ['40107', 'Lattice (Dice)', 'DP886436', 1285, 2056],
    ]),
    ms: 5640,
  },
  { type: 'series', series: market(2), ms: 5645 },
  step('ethereum', 'enumerate', 'done', 5710, { count: 3, message: '3 series, 6 preview works' }),
  { type: 'done', ms: 5720 },
];

/** A run that breaks: Base is rate limited and the stream closes without `done`. */
export const FAILED_IMPORT: ImportEvent[] = [
  ...OPENING,
  step('ethereum', 'deployed', 'done', 1180, { count: 1, message: '1 contract deployed directly, an NFT series with tokens' }),
  { type: 'series', series: pasteGrounds([deployed1], null), ms: 1184 },
  step('ethereum', 'ownership-logs', 'done', 1630, { count: 2, message: '2 contracts made a wallet their owner' }),
  step('base', 'held', 'error', 2400, { message: 'The provider answered 429 Too Many Requests for the held-contracts list' }),
  {
    type: 'error',
    message: 'Base: the held-contracts scan was rate limited, so owner() and works were not checked there.',
    ms: 2401,
  },
];

/** A finished run that found nothing: every pass comes back empty. */
export const EMPTY_IMPORT: ImportEvent[] = [
  ...OPENING,
  step('ethereum', 'deployed', 'done', 820, { count: 0, message: 'No contracts deployed directly' }),
  step('ethereum', 'ownership-logs', 'done', 1140, { count: 0, message: 'No contract made a wallet its owner' }),
  step('ethereum', 'held', 'done', 1360, { count: 0, message: 'No contracts held' }),
  step('base', 'held', 'done', 1410, { count: 0, message: 'No contracts held' }),
  step('ethereum', 'owner-check', 'done', 1420, { count: 0, message: 'No candidates to check' }),
  step('base', 'owner-check', 'done', 1430, { count: 0, message: 'No candidates to check' }),
  step('ethereum', 'shared-mints', 'done', 1900, { count: 0, message: 'No tokens created on shared marketplace contracts' }),
  step('base', 'shared-mints', 'done', 1910, { count: 0, message: 'No marketplace-shared contracts are checked on Base' }),
  step('ethereum', 'enumerate', 'done', 1920, { count: 0, message: 'Nothing to list' }),
  step('base', 'enumerate', 'done', 1920, { count: 0, message: 'Nothing to list' }),
  { type: 'done', ms: 1930 },
];

export const SAMPLE_WALLETS = [W1, W2];
