/**
 * The badge model: what a wallet can be shown to have done, and the exact
 * sentence that says how it earned it.
 *
 * Every rule below is a fact this install can check in its own chain
 * snapshot. There is no rule for loyalty, for taste, for panic selling or for
 * portfolio value, because none of those can be read off a chain: a sale
 * settled in WETH or through a marketplace contract carries no value in the
 * transaction, so the install cannot even see most prices, let alone judge
 * them. An artist who wants a badge for something the chain does not record
 * still gets one, awarded by hand, and the page says it was given rather than
 * computed.
 *
 * How the artist's own writing fits in. A Badge record in the catalogue data
 * carries a `key`; when that key matches a rule, the artist's name, wording,
 * icon and colour are used for it and the rule decides who gets it. A badge
 * whose key matches nothing here can only be given by hand, and the guild
 * page says so instead of quietly never awarding it.
 *
 * Pure and client safe.
 */

import type { Badge as BadgeRecord } from '@/lib/types';

import { OPENING_WINDOW_DAYS, daysBetween, type GuildFacts, type HolderFacts } from './facts';

// ---------------------------------------------------------------------------
// The thresholds, in one place
// ---------------------------------------------------------------------------

/** Held for at least this long, measured to the moment the snapshot was taken. */
export const LONG_HOLD_DAYS = 365;

/** First seen in the artist's history at least this long ago. */
export const LONGEVITY_DAYS = 730;

/** Series held before a wallet counts as collecting across the catalogue. */
export const BREADTH_SERIES = 3;

/** Share of one series, as a percentage, before a wallet counts as concentrated in it. */
export const SERIES_SHARE_PERCENT = 10;

/**
 * How many tokens a series needs before a share of it means anything. Without
 * this, every holder of a five token series holds a fifth of it and the badge
 * says nothing about anybody.
 */
export const SERIES_SHARE_MINIMUM = 10;

/** A set is only a set worth naming from this many tokens up. */
export const FULL_SET_MINIMUM = 3;

// ---------------------------------------------------------------------------
// The rules
// ---------------------------------------------------------------------------

/** The kinds of thing a badge can be about. Used when the artist named no categories. */
export type RuleCategory = 'timing' | 'breadth' | 'commitment' | 'scale';

export const RULE_CATEGORY_LABELS: Record<RuleCategory, string> = {
  timing: 'Timing',
  breadth: 'Breadth',
  commitment: 'Commitment',
  scale: 'Scale',
};

export interface BadgeRule {
  /** What an artist writes in a badge record's `key` to take this rule over. */
  key: string;
  /** The name used when the artist has not named one. */
  name: string;
  /** One line on what it means. */
  description: string;
  /** Exactly what earns it. This sentence is printed wherever the badge is explained. */
  earnedBy: string;
  category: RuleCategory;
  /**
   * True when the rule can only be trusted on a complete history. A snapshot
   * that stopped at the event cap holds recent transfers only, which can make
   * a wallet look like it never sold or like it missed an opening, so these
   * rules stand down instead of guessing.
   */
  needsHistory: boolean;
  test(facts: HolderFacts, guild: GuildFacts): boolean;
}

/** Every badge this install can work out on its own, in reading order. */
export const BADGE_RULES: readonly BadgeRule[] = [
  {
    key: 'early-supporter',
    name: 'Opening week',
    description: 'Was there when a series opened.',
    earnedBy: `Received a work within ${OPENING_WINDOW_DAYS} days of the first mint of one of the series, as dated by the snapshot's own event history.`,
    category: 'timing',
    needsHistory: true,
    test: facts => facts.openedWith.length > 0,
  },
  {
    key: 'first-holder',
    name: 'First holder',
    description: 'The first wallet the history shows holding a series.',
    earnedBy: 'Is the first wallet, other than the zero address, that this history shows receiving a work from one of the series.',
    category: 'timing',
    needsHistory: true,
    test: facts => facts.firstHolderOf.length > 0,
  },
  {
    key: 'minted-direct',
    name: 'Minted it',
    description: 'Took a work from the contract itself, rather than buying it on.',
    earnedBy: 'At least one work arrived in the wallet straight from the zero address, which is a mint.',
    category: 'timing',
    needsHistory: false,
    test: facts => facts.mintedIn > 0,
  },
  {
    key: 'holding-duration',
    name: 'Held a year',
    description: 'Still holds something bought a long time ago.',
    earnedBy: `Still holds a work that the snapshot dates to at least ${LONG_HOLD_DAYS} days before the snapshot was taken.`,
    category: 'commitment',
    needsHistory: false,
    test: (facts, guild) => {
      const held = daysBetween(facts.earliestHoldingAt, guild.computedAt);
      return held !== null && held >= LONG_HOLD_DAYS;
    },
  },
  {
    key: 'collector-longevity',
    name: 'Long standing',
    description: 'Has been in this history for years.',
    earnedBy: `The first event this history shows for the wallet is at least ${LONGEVITY_DAYS} days before the snapshot, and it still holds a work.`,
    category: 'commitment',
    needsHistory: true,
    test: (facts, guild) => {
      const since = daysBetween(facts.firstEventAt, guild.computedAt);
      return facts.worksOwned > 0 && since !== null && since >= LONGEVITY_DAYS;
    },
  },
  {
    key: 'never-sold',
    name: 'Never sold',
    description: 'Everything that came in is still there.',
    earnedBy: 'Received at least one work and sent none out again, in the whole history this snapshot holds.',
    category: 'commitment',
    needsHistory: true,
    test: facts => facts.received > 0 && facts.sentOut === 0,
  },
  {
    key: 'collection-breadth',
    name: 'Across series',
    description: 'Collects the work rather than one series of it.',
    earnedBy: `Holds work from ${BREADTH_SERIES} or more of the series in this catalogue.`,
    category: 'breadth',
    needsHistory: false,
    test: facts => facts.seriesSlugs.length >= BREADTH_SERIES,
  },
  {
    key: 'multi-chain',
    name: 'Across chains',
    description: 'Holds the work on more than one chain.',
    earnedBy: 'Holds work on two or more of the chains this catalogue is minted on.',
    category: 'breadth',
    needsHistory: false,
    test: facts => facts.chains.length > 1,
  },
  {
    key: 'full-set',
    name: 'Full set',
    description: 'Holds a whole series.',
    earnedBy: `Holds every token of one series that the snapshot found in a wallet, where that series has at least ${FULL_SET_MINIMUM} of them.`,
    category: 'scale',
    needsHistory: false,
    test: facts =>
      facts.bySeries.some(series => series.ofTokens >= FULL_SET_MINIMUM && series.works >= series.ofTokens),
  },
  {
    key: 'collection-dominance',
    name: 'Deep in one series',
    description: 'Holds a large part of a single series.',
    earnedBy: `Holds ${SERIES_SHARE_PERCENT} percent or more of the tokens of one series that the snapshot found in wallets, counting only series with at least ${SERIES_SHARE_MINIMUM} of them.`,
    category: 'scale',
    needsHistory: false,
    test: facts =>
      facts.bySeries.some(series => series.ofTokens >= SERIES_SHARE_MINIMUM && (series.share ?? 0) >= SERIES_SHARE_PERCENT),
  },
];

export function ruleFor(key: string | null | undefined): BadgeRule | null {
  if (!key) return null;
  return BADGE_RULES.find(rule => rule.key === key) ?? null;
}

// ---------------------------------------------------------------------------
// What a page prints
// ---------------------------------------------------------------------------

/**
 * A badge as it is shown: the artist's wording when there is some, the rule's
 * wording otherwise, and always the sentence that says what earns it.
 */
export interface AwardedBadge {
  /** The artist's badge id when one matches, otherwise the rule's key. */
  id: string;
  /** The rule behind it, or null for a badge that is only ever given by hand. */
  key: string | null;
  name: string;
  description: string | null;
  /** Exactly what earns it. Never empty. */
  earnedBy: string;
  categoryId: string | null;
  categoryLabel: string;
  icon: string | null;
  color: string | null;
  positive: boolean;
  /**
   * `computed`: this install worked it out from the snapshot.
   * `given`: the artist awarded it, and the install cannot check it.
   */
  source: 'computed' | 'given';
}

function presentation(rule: BadgeRule, record: BadgeRecord | null): AwardedBadge {
  return {
    id: record?.id ?? rule.key,
    key: rule.key,
    name: record?.name ?? rule.name,
    description: record?.description ?? rule.description,
    // The rule is what actually awards the badge, so the rule's sentence is
    // the truthful one. The artist's own note is shown beside it, never
    // instead of it.
    earnedBy: rule.earnedBy,
    categoryId: record?.categoryId ?? null,
    categoryLabel: RULE_CATEGORY_LABELS[rule.category],
    icon: record?.icon ?? null,
    color: record?.color ?? null,
    positive: record?.positive ?? true,
    source: 'computed',
  };
}

function givenBadge(record: BadgeRecord): AwardedBadge {
  return {
    id: record.id,
    key: record.key ?? null,
    name: record.name,
    description: record.description,
    earnedBy: record.howItWorks ?? 'Given by the artist. This install cannot work this one out from the chain, so it is never awarded automatically.',
    categoryId: record.categoryId ?? null,
    categoryLabel: 'Given by the artist',
    icon: record.icon ?? null,
    color: record.color ?? null,
    positive: record.positive ?? true,
    source: 'given',
  };
}

/** The artist's badge records, indexed by the rule key each one claims. */
export function badgesByKey(records: readonly BadgeRecord[]): Map<string, BadgeRecord> {
  const index = new Map<string, BadgeRecord>();
  for (const record of records) {
    if (record.key && !index.has(record.key)) index.set(record.key, record);
  }
  return index;
}

/**
 * The badges one wallet has, worked out from the snapshot.
 *
 * `given` carries badge ids the snapshot itself recorded, which is how an
 * artist hands out a badge no rule covers. Anything in it that a rule already
 * awarded is left alone rather than shown twice.
 */
export function awardBadges(
  facts: HolderFacts,
  guild: GuildFacts,
  {
    records = [],
    given = [],
  }: {
    records?: readonly BadgeRecord[];
    given?: readonly string[];
  } = {},
): AwardedBadge[] {
  const byKey = badgesByKey(records);
  const earned: AwardedBadge[] = [];

  for (const rule of BADGE_RULES) {
    if (rule.needsHistory && !guild.historyComplete) continue;
    if (!rule.test(facts, guild)) continue;
    earned.push(presentation(rule, byKey.get(rule.key) ?? null));
  }

  const alreadyShown = new Set(earned.map(badge => badge.id));
  for (const id of given) {
    if (alreadyShown.has(id)) continue;
    const record = records.find(entry => entry.id === id);
    if (!record) continue;
    // A recorded badge whose key is a rule was either already awarded above or
    // is not earned by this wallet today; the artist's own list wins, because
    // they may have awarded it against an older snapshot.
    earned.push(givenBadge(record));
    alreadyShown.add(id);
  }

  return earned;
}

/**
 * Every badge this install could award, whether anyone holds it or not, for
 * the page that explains the model. Rules first, then the artist's own badges
 * that no rule can award.
 */
export function badgeCatalogue(records: readonly BadgeRecord[]): AwardedBadge[] {
  const byKey = badgesByKey(records);
  const fromRules = BADGE_RULES.map(rule => presentation(rule, byKey.get(rule.key) ?? null));
  const claimed = new Set(fromRules.map(badge => badge.id));
  const byHand = records.filter(record => !claimed.has(record.id)).map(givenBadge);
  return [...fromRules, ...byHand];
}

/** The rules that stood down because the snapshot's history is incomplete. */
export function suspendedRules(guild: GuildFacts): BadgeRule[] {
  return guild.historyComplete ? [] : BADGE_RULES.filter(rule => rule.needsHistory);
}
