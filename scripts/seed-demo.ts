/**
 * Rebuilds the chain block of src/fixtures/demo.json from one source of
 * truth, and seeds a handful of demo orders and commissions.
 *
 *   pnpm seed:demo              rebuild the demo chain block
 *   pnpm seed:demo -- --orders  also write demo orders into the order store
 *   pnpm seed:demo -- --check   assert only, write nothing
 *
 * Why this exists
 * ---------------
 * The demo snapshot used to carry a list of holders and a list of events
 * that disagreed. Six of its fourteen holdings had a last event sending the
 * token to somebody else, and six carried no acquisition date, so
 * /collector/0x...c001 printed "Works held 4" over an activity list with two
 * rows. A page that looks like it has lost half its data is the wrong first
 * impression for the one fixture an evaluator will actually see.
 *
 * So the events are the source of truth and everything else is derived from
 * them: who holds what, when they got it, the leaderboard and the insights.
 * The assertion at the end makes that structural rather than careful. If a
 * holding ever has no last event naming its holder, this refuses to write.
 *
 * It is also where the demo is made rich enough to exercise the guild: a
 * wallet across three series and two chains, and a wallet holding a whole
 * short series, so the badges have something to fire on.
 *
 * Nothing here touches src/fixtures/local, the real catalogue, or any remote
 * service. demo.json is the neutral fixture that ships with the repository.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { buildInsights, buildLeaderboard, datedHoldings, sortEventsNewestFirst, type HolderLike } from '../src/lib/chain/derive.ts';
import type { ActivityEvent, ActivityEventType, Chain, Commission, Holding, LeaderboardRow, Order } from '@/lib/types';

const ROOT = process.cwd();
const DEMO_FILE = path.join(ROOT, 'src', 'fixtures', 'demo.json');

/** The date the demo snapshot claims to have been taken. */
const COMPUTED_AT = '2026-09-01T00:00:00.000Z';

const ZERO = '0x0000000000000000000000000000000000000000';

/** Short names for the demo wallets, so the event script reads as a story. */
const WALLET: Record<string, string> = {
  c001: '0x000000000000000000000000000000000000c001',
  c002: '0x000000000000000000000000000000000000c002',
  c003: '0x000000000000000000000000000000000000c003',
  c004: '0x000000000000000000000000000000000000c004',
  c005: '0x000000000000000000000000000000000000c005',
  c006: '0x000000000000000000000000000000000000c006',
  c007: '0x000000000000000000000000000000000000c007',
  c008: '0x000000000000000000000000000000000000c008',
  zero: ZERO,
};

const ENS: Record<string, string | null> = {
  c001: 'grainstore.eth',
  c002: 'paperfold.eth',
  c003: null,
  c004: 'nine.lattice.eth',
  c005: null,
  c006: 'quiet.eth',
  c007: null,
  c008: 'marbled.eth',
};

interface SeriesSpec {
  slug: string;
  chain: Chain;
  contract: string;
}

const SERIES: Record<string, SeriesSpec> = {
  pg: { slug: 'paste-grounds', chain: 'ethereum', contract: '0x00000000000000000000000000000000de000001' },
  lf: { slug: 'loose-fields', chain: 'base', contract: '0x00000000000000000000000000000000de000002' },
  lat: { slug: 'lattice', chain: 'ethereum', contract: '0x00000000000000000000000000000000de00c0de' },
  pgs: { slug: 'paste-grounds-studies', chain: 'ethereum', contract: '0x00000000000000000000000000000000de000003' },
};

/** One line of the history: when, what moved, from whom to whom, for how much. */
interface Beat {
  at: string;
  type: ActivityEventType;
  series: keyof typeof SERIES;
  tokenId: string;
  from: keyof typeof WALLET;
  to: keyof typeof WALLET;
  /** ETH, as a decimal string. Absent means the transaction carried no value. */
  eth?: string;
}

/**
 * The whole demo history, oldest first.
 *
 * Read down the `to` column and you have the holders; that is the point. A
 * price appears only where the transaction itself carried value, which is
 * the same rule the real reader follows, so the demo's own "not recorded"
 * states are reachable.
 */
const HISTORY: Beat[] = [
  // Lattice opened first, in 2023. Long enough ago for "Long standing".
  { at: '2023-09-04T12:00:00.000Z', type: 'mint', series: 'lat', tokenId: '40100', from: 'zero', to: 'c004', eth: '0.2' },
  { at: '2023-09-11T12:00:00.000Z', type: 'mint', series: 'lat', tokenId: '40107', from: 'zero', to: 'c008' },
  { at: '2023-09-11T12:00:00.000Z', type: 'mint', series: 'lat', tokenId: '40114', from: 'zero', to: 'c001' },

  // Loose Fields, on Base, in the summer of 2024.
  { at: '2024-06-12T12:00:00.000Z', type: 'mint', series: 'lf', tokenId: '1', from: 'zero', to: 'c002', eth: '0.2' },
  { at: '2024-06-12T12:00:00.000Z', type: 'mint', series: 'lf', tokenId: '2', from: 'zero', to: 'c005' },
  { at: '2024-06-19T12:00:00.000Z', type: 'mint', series: 'lf', tokenId: '3', from: 'zero', to: 'c001', eth: '0.2' },
  { at: '2024-06-19T12:00:00.000Z', type: 'mint', series: 'lf', tokenId: '4', from: 'zero', to: 'c004' },
  { at: '2024-06-26T12:00:00.000Z', type: 'mint', series: 'lf', tokenId: '5', from: 'zero', to: 'c002' },
  { at: '2024-06-26T12:00:00.000Z', type: 'mint', series: 'lf', tokenId: '6', from: 'zero', to: 'c002' },

  // Paste Grounds, the series the catalogue is named around, in 2025.
  { at: '2025-03-02T12:00:00.000Z', type: 'mint', series: 'pg', tokenId: '1', from: 'zero', to: 'c001', eth: '0.2' },
  { at: '2025-03-02T12:00:00.000Z', type: 'mint', series: 'pg', tokenId: '2', from: 'zero', to: 'c001' },
  { at: '2025-03-09T12:00:00.000Z', type: 'mint', series: 'pg', tokenId: '3', from: 'zero', to: 'c007', eth: '0.2' },
  { at: '2025-03-09T12:00:00.000Z', type: 'mint', series: 'pg', tokenId: '4', from: 'zero', to: 'c002' },
  { at: '2025-03-16T12:00:00.000Z', type: 'mint', series: 'pg', tokenId: '5', from: 'zero', to: 'c001' },
  { at: '2025-03-16T12:00:00.000Z', type: 'mint', series: 'pg', tokenId: '6', from: 'zero', to: 'c008' },

  { at: '2025-06-10T12:00:00.000Z', type: 'mint', series: 'lat', tokenId: '40121', from: 'zero', to: 'c003' },
  { at: '2025-08-14T15:20:00.000Z', type: 'sale', series: 'pg', tokenId: '3', from: 'c007', to: 'c002', eth: '0.44' },
  { at: '2025-11-03T15:20:00.000Z', type: 'sale', series: 'pg', tokenId: '6', from: 'c008', to: 'c004', eth: '0.61' },

  // A short series, minted whole into one wallet, so "Full set" has
  // something to fire on.
  { at: '2025-11-20T12:00:00.000Z', type: 'mint', series: 'pgs', tokenId: '1', from: 'zero', to: 'c003', eth: '0.05' },
  { at: '2025-11-20T12:00:00.000Z', type: 'mint', series: 'pgs', tokenId: '2', from: 'zero', to: 'c003' },
  { at: '2025-11-20T12:00:00.000Z', type: 'mint', series: 'pgs', tokenId: '3', from: 'zero', to: 'c003' },
  { at: '2025-11-20T12:00:00.000Z', type: 'mint', series: 'pgs', tokenId: '4', from: 'zero', to: 'c003' },

  { at: '2026-01-19T15:20:00.000Z', type: 'sale', series: 'lf', tokenId: '4', from: 'c004', to: 'c006', eth: '0.28' },
  // A transfer, not a sale: the transaction carried no value this install
  // could read, and inventing one would be the whole problem.
  { at: '2026-02-11T09:05:00.000Z', type: 'transfer', series: 'pg', tokenId: '4', from: 'c002', to: 'c003' },
  { at: '2026-04-08T15:20:00.000Z', type: 'sale', series: 'lat', tokenId: '40121', from: 'c003', to: 'c008', eth: '1.15' },
  { at: '2026-06-22T15:20:00.000Z', type: 'sale', series: 'lf', tokenId: '6', from: 'c002', to: 'c007', eth: '0.33' },
];

// ---------------------------------------------------------------------------
// Turning the history into a snapshot
// ---------------------------------------------------------------------------

function tokenKey(chain: Chain, contract: string, tokenId: string): string {
  return `${chain}:${contract.toLowerCase()}:${tokenId}`;
}

function wei(eth: string): string {
  const [whole, fraction = ''] = eth.split('.');
  return `${BigInt(whole) * 10n ** 18n + BigInt(fraction.padEnd(18, '0').slice(0, 18))}`;
}

function hash(index: number): string {
  return `0x${(index + 1601).toString(16).padStart(64, '0')}`;
}

function buildEvents(): ActivityEvent[] {
  const ordered = [...HISTORY].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  return ordered.map((beat, index) => {
    const series = SERIES[beat.series];
    const txHash = hash(index);
    return {
      id: `${txHash}:0:${beat.tokenId}`,
      type: beat.type,
      chain: series.chain,
      contract: series.contract,
      tokenId: beat.tokenId,
      workId: tokenKey(series.chain, series.contract, beat.tokenId),
      seriesSlug: series.slug,
      from: WALLET[beat.from],
      to: WALLET[beat.to],
      quantity: 1,
      at: beat.at,
      blockNumber: 18_900_000 + index * 4_300,
      txHash,
      price: beat.eth ? { raw: wei(beat.eth), decimals: 18, symbol: 'ETH' } : null,
    } satisfies ActivityEvent;
  });
}

/**
 * Who holds what, from the final state of the event log and nothing else.
 *
 * This is the whole point of the file. A holder list written by hand beside
 * an event list written by hand will disagree the first time either is
 * edited, and the pages that read them will show a wallet holding a work its
 * own history says it sold.
 */
function holdersFromEvents(events: readonly ActivityEvent[]): HolderLike[] {
  const owner = new Map<string, { to: string; series: string; chain: Chain; contract: string; tokenId: string }>();
  for (const event of [...events].sort((a, b) => Date.parse(a.at) - Date.parse(b.at))) {
    if (!event.workId || !event.to) continue;
    owner.set(event.workId, {
      to: event.to.toLowerCase(),
      series: event.seriesSlug ?? '',
      chain: event.chain,
      contract: event.contract,
      tokenId: event.tokenId,
    });
  }

  const byAddress = new Map<string, Holding[]>();
  for (const [workId, held] of owner) {
    if (held.to === ZERO) continue;
    const list = byAddress.get(held.to) ?? [];
    list.push({
      workId,
      chain: held.chain,
      contract: held.contract,
      tokenId: held.tokenId,
      standard: 'ERC721',
      balance: 1,
      seriesSlug: held.series || null,
      unlisted: false,
    });
    byAddress.set(held.to, list);
  }

  return [...byAddress.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([address, holdings]) => ({
      address,
      ens: ENS[shortName(address)] ?? null,
      holdings: datedHoldings(
        holdings.sort((a, b) => a.workId.localeCompare(b.workId)),
        events,
        address,
      ),
    }));
}

function shortName(address: string): string {
  return `c${address.slice(-3)}`;
}

/** Every holding must have a last event that names its holder. Nothing else will do. */
function assertConsistent(holders: readonly HolderLike[], events: readonly ActivityEvent[]): void {
  const last = new Map<string, ActivityEvent>();
  for (const event of events) {
    if (!event.workId) continue;
    const seen = last.get(event.workId);
    if (!seen || Date.parse(event.at) > Date.parse(seen.at)) last.set(event.workId, event);
  }

  const problems: string[] = [];
  for (const holder of holders) {
    for (const holding of holder.holdings) {
      const event = last.get(holding.workId);
      if (!event) {
        problems.push(`${holding.workId} is held by ${holder.address} and has no event at all`);
      } else if (event.to?.toLowerCase() !== holder.address.toLowerCase()) {
        problems.push(`${holding.workId} is held by ${holder.address} but its last event sends it to ${event.to}`);
      }
      if (!holding.acquiredAt) problems.push(`${holding.workId} has no acquisition date`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`The demo snapshot is not internally consistent:\n  ${problems.join('\n  ')}`);
  }
}

// ---------------------------------------------------------------------------
// Demo orders and commissions
// ---------------------------------------------------------------------------

/**
 * A handful of orders covering the whole status machine.
 *
 * Every page under /orders was built and none of them could be seen without
 * Stripe keys and a real checkout run, which is not a step anyone looking at
 * the project is going to take. These are obviously demo records: the
 * addresses are a made-up street in a real city and the emails are on
 * example.com, which cannot receive mail.
 *
 * They are written into the order store rather than into demo.json on
 * purpose. An order carries a name, a postal address and an email, and none
 * of that belongs in a fixture that is read by the public catalogue.
 */
function demoOrders(): Order[] {
  const money = (amount: number) => ({ amount, currency: 'USD' });
  const base = {
    shippingMethodId: 'standard',
    payment: { provider: 'demo', reference: null, status: 'paid' as const, paidAt: '2026-07-02T10:15:00.000Z' },
  };

  return [
    {
      ...base,
      id: 'demo-order-shipped',
      number: 'R-2026-1A0C',
      status: 'shipped',
      createdAt: '2026-07-02T10:12:00.000Z',
      updatedAt: '2026-07-06T09:00:00.000Z',
      lines: [
        {
          productSlug: 'ground-i-print',
          variantId: 'ground-i-50x70-oak',
          title: 'Ground I (Plum), print',
          variantName: '50 x 70 cm, oak frame',
          quantity: 1,
          unitPrice: money(39000),
          lineTotal: money(39000),
        },
      ],
      subtotal: money(39000),
      shipping: money(0),
      total: money(39000),
      shippingAddress: {
        name: 'Ada Sorel',
        line1: '14 Rua das Gaivotas',
        line2: null,
        city: 'Lisbon',
        region: null,
        postalCode: '1200-123',
        country: 'PT',
      },
      email: 'ada@example.com',
      address: WALLET.c001,
      fulfilment: {
        provider: null,
        providerOrderId: null,
        carrier: 'CTT',
        trackingNumber: 'DEMO000000PT',
        trackingUrl: 'https://example.com/tracking/DEMO000000PT',
        shippedAt: '2026-07-06T09:00:00.000Z',
        deliveredAt: null,
      },
      note: null,
      internalNote: null,
    },
    {
      ...base,
      id: 'demo-order-delivered',
      number: 'R-2026-2B4E',
      status: 'delivered',
      createdAt: '2026-05-18T16:40:00.000Z',
      updatedAt: '2026-05-27T11:20:00.000Z',
      payment: { provider: 'demo', reference: null, status: 'paid', paidAt: '2026-05-18T16:42:00.000Z' },
      lines: [
        {
          productSlug: 'paste-grounds-book',
          variantId: 'book-standard',
          title: 'Paste Grounds, the book',
          variantName: 'Standard',
          quantity: 2,
          unitPrice: money(4500),
          lineTotal: money(9000),
        },
      ],
      subtotal: money(9000),
      shipping: money(1500),
      total: money(10500),
      shippingAddress: {
        name: 'Ada Sorel',
        line1: '14 Rua das Gaivotas',
        line2: null,
        city: 'Lisbon',
        region: null,
        postalCode: '1200-123',
        country: 'PT',
      },
      email: 'ada@example.com',
      address: null,
      fulfilment: {
        provider: null,
        providerOrderId: null,
        carrier: 'CTT',
        trackingNumber: 'DEMO000001PT',
        trackingUrl: 'https://example.com/tracking/DEMO000001PT',
        shippedAt: '2026-05-21T10:00:00.000Z',
        deliveredAt: '2026-05-27T11:20:00.000Z',
      },
      note: 'No rush.',
      internalNote: null,
    },
    {
      ...base,
      id: 'demo-order-production',
      number: 'R-2026-3C71',
      status: 'in_production',
      createdAt: '2026-08-21T08:05:00.000Z',
      updatedAt: '2026-08-21T08:06:00.000Z',
      payment: { provider: 'demo', reference: null, status: 'paid', paidAt: '2026-08-21T08:06:00.000Z' },
      shippingMethodId: 'express',
      lines: [
        {
          productSlug: 'field-04-print',
          variantId: 'field-04-a2',
          title: 'Field 04 (Marbled), print',
          variantName: '42 x 59 cm',
          quantity: 1,
          unitPrice: money(18000),
          lineTotal: money(18000),
        },
      ],
      subtotal: money(18000),
      shipping: money(4500),
      total: money(22500),
      shippingAddress: {
        name: 'Bo Ferreira',
        line1: '3 Travessa do Forno',
        line2: 'Apartment 2',
        city: 'Porto',
        region: null,
        postalCode: '4050-456',
        country: 'PT',
      },
      email: 'bo@example.com',
      address: WALLET.c003,
      fulfilment: null,
      note: null,
      internalNote: 'Print on the heavier stock.',
    },
    {
      ...base,
      id: 'demo-order-pending',
      number: 'R-2026-4D18',
      status: 'pending',
      createdAt: '2026-08-30T19:44:00.000Z',
      updatedAt: '2026-08-30T19:44:00.000Z',
      payment: { provider: 'demo', reference: null, status: 'unpaid', paidAt: null },
      lines: [
        {
          productSlug: 'ground-i-print',
          variantId: 'ground-i-50x70',
          title: 'Ground I (Plum), print',
          variantName: '50 x 70 cm, unframed',
          quantity: 1,
          unitPrice: money(24000),
          lineTotal: money(24000),
        },
      ],
      subtotal: money(24000),
      shipping: money(0),
      total: money(24000),
      shippingAddress: {
        name: 'Ines Duarte',
        line1: '77 Calcada do Sol',
        line2: null,
        city: 'Lisbon',
        region: null,
        postalCode: '1100-789',
        country: 'PT',
      },
      email: 'ines@example.com',
      address: null,
      fulfilment: null,
      note: null,
      internalNote: null,
    },
    {
      ...base,
      id: 'demo-order-cancelled',
      number: 'R-2026-5E93',
      status: 'cancelled',
      createdAt: '2026-06-11T12:00:00.000Z',
      updatedAt: '2026-06-12T09:30:00.000Z',
      payment: { provider: 'demo', reference: null, status: 'unpaid', paidAt: null },
      lines: [
        {
          productSlug: 'paste-grounds-book',
          variantId: 'book-signed',
          title: 'Paste Grounds, the book',
          variantName: 'Signed',
          quantity: 1,
          unitPrice: money(6500),
          lineTotal: money(6500),
        },
      ],
      subtotal: money(6500),
      shipping: money(1500),
      total: money(8000),
      shippingAddress: {
        name: 'Ada Sorel',
        line1: '14 Rua das Gaivotas',
        line2: null,
        city: 'Lisbon',
        region: null,
        postalCode: '1200-123',
        country: 'PT',
      },
      email: 'ada@example.com',
      address: WALLET.c001,
      fulfilment: null,
      note: null,
      internalNote: 'Buyer asked to cancel before it went to print.',
    },
  ] as Order[];
}

function demoCommissions(): Commission[] {
  return [
    {
      id: 'demo-commission-new',
      number: 'C-2026-7A21',
      status: 'new',
      createdAt: '2026-08-28T14:02:00.000Z',
      updatedAt: '2026-08-28T14:02:00.000Z',
      kind: 'digital',
      artefact: 'Generative print',
      brief:
        'A long horizontal piece for a hallway, in the language of Paste Grounds but quieter. Happy to leave the palette to the studio.',
      specs: {},
      references: [],
      workIds: [],
      budget: { amount: 250000, currency: 'USD' },
      deadline: '2026-12-01',
      email: 'bo@example.com',
      address: WALLET.c003,
      shippingAddress: null,
      quote: null,
      internalNote: null,
      workIdsChecked: null,
    },
    {
      id: 'demo-commission-quoted',
      number: 'C-2026-8B47',
      status: 'quoted',
      createdAt: '2026-07-14T09:31:00.000Z',
      updatedAt: '2026-07-19T11:05:00.000Z',
      kind: 'phygital',
      artefact: 'Framed print of an owned work',
      brief: 'I would like the Lattice piece I hold made as a large framed print, if that is something the studio does.',
      specs: {},
      references: [],
      workIds: ['ethereum:0x00000000000000000000000000000000de00c0de:40114'],
      budget: null,
      deadline: null,
      email: 'ada@example.com',
      address: WALLET.c001,
      shippingAddress: {
        name: 'Ada Sorel',
        line1: '14 Rua das Gaivotas',
        line2: null,
        city: 'Lisbon',
        region: null,
        postalCode: '1200-123',
        country: 'PT',
      },
      quote: { amount: 140000, currency: 'USD' },
      internalNote: null,
      // The wallet that sent this really does hold that token in the demo
      // snapshot, which is what the flag is for.
      workIdsChecked: 'verified',
    },
  ] as Commission[];
}

// ---------------------------------------------------------------------------
// Running it
// ---------------------------------------------------------------------------

function writeOrders(): void {
  const dir = process.env.RAISONNE_ORDERS_DIR ?? path.join(ROOT, '.data', 'orders');
  fs.mkdirSync(path.join(dir, 'orders'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'commissions'), { recursive: true });

  for (const order of demoOrders()) {
    fs.writeFileSync(path.join(dir, 'orders', `${order.id}.json`), `${JSON.stringify(order, null, 2)}\n`);
  }
  for (const commission of demoCommissions()) {
    fs.writeFileSync(path.join(dir, 'commissions', `${commission.id}.json`), `${JSON.stringify(commission, null, 2)}\n`);
  }
  console.log(`wrote ${demoOrders().length} orders and ${demoCommissions().length} commissions into ${dir}`);
}

function main(): void {
  const args = new Set(process.argv.slice(2));
  const check = args.has('--check');

  const events = sortEventsNewestFirst(buildEvents());
  const holders = holdersFromEvents(events);
  assertConsistent(holders, events);

  const demo = JSON.parse(fs.readFileSync(DEMO_FILE, 'utf8')) as Record<string, unknown>;
  const previous = (demo.chain ?? {}) as { leaderboard?: LeaderboardRow[]; insights?: { gaps?: string[] } };

  // The artist's own wallets hold work without collecting it. The demo has
  // none in these contracts, but the exclusion is kept so the demo and a
  // real snapshot are built the same way.
  const artistWallets = ((demo.artist as { wallets?: { address: string }[] })?.wallets ?? []).map(wallet =>
    wallet.address.toLowerCase(),
  );

  // Tiers are worked out from the rank at render time, so only the badges the
  // artist gave by hand are carried over. Everything else is recomputed.
  const given = new Map((previous.leaderboard ?? []).map(row => [row.address.toLowerCase(), row.badgeIds ?? []]));
  const leaderboard = buildLeaderboard(holders, { events, exclude: artistWallets }).map(row => ({
    ...row,
    badgeIds: given.get(row.address.toLowerCase()) ?? [],
  }));

  const insights = buildInsights(events, holders, Object.values(SERIES).map(series => series.slug), {
    gaps: previous.insights?.gaps ?? [],
    computedAt: COMPUTED_AT,
  });

  const chain = {
    computedAt: COMPUTED_AT,
    contracts: Object.values(SERIES).map(series => ({
      chain: series.chain,
      address: series.contract,
      seriesSlug: series.slug,
      toBlock: 18_900_000 + HISTORY.length * 4_300,
      truncated: false,
    })),
    holders: holders.map(holder => ({ address: holder.address, ens: holder.ens ?? null, holdings: [...holder.holdings] })),
    events,
    leaderboard,
    insights,
  };

  console.log(`${holders.length} holders, ${events.length} events, ${leaderboard.length} ranked`);
  for (const row of leaderboard) {
    console.log(`  #${row.rank} ${row.ens ?? row.address.slice(-6)}  ${row.worksOwned} works, ${row.seriesCount} series`);
  }

  if (check) {
    console.log('check only: nothing written');
    return;
  }

  demo.chain = chain;
  fs.writeFileSync(DEMO_FILE, `${JSON.stringify(demo, null, 2)}\n`);
  console.log(`wrote ${path.relative(ROOT, DEMO_FILE)}`);

  if (args.has('--orders')) writeOrders();
}

main();
