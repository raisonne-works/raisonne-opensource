/**
 * Tiers: the artist's ladder, filled in by percentile.
 *
 * A tier is writing, not data. The install does not invent one, does not
 * rename one and does not decide what a tier is worth: it takes the tiers the
 * artist wrote down, reads the percentile band on each, and says which band a
 * rank falls in. An install with no tiers has no tier column, which is the
 * right answer rather than a missing one.
 *
 * Percentiles are of the ranked list itself. Rank 1 of 40 sits at the 100th
 * percentile, the last rank sits just above zero, and `tierForRank` in
 * src/lib/chain/derive.ts does that arithmetic for the leaderboard and for
 * the snapshot alike, so a tier on a collector page and a tier on this page
 * cannot disagree.
 *
 * Pure and client safe.
 */

import { tierForRank } from '@/lib/chain/derive';
import type { LeaderboardRow, Tier } from '@/lib/types';

/** Highest tier first, which is how a ladder is read. */
export function tiersHighestFirst(tiers: readonly Tier[]): Tier[] {
  return [...tiers].sort((a, b) => {
    const order = (b.order ?? 0) - (a.order ?? 0);
    if (order !== 0) return order;
    return (b.minPercentile ?? -1) - (a.minPercentile ?? -1);
  });
}

export function tierById(tiers: readonly Tier[], id: string | null | undefined): Tier | null {
  if (!id) return null;
  return tiers.find(tier => tier.id === id) ?? null;
}

/** True when a tier carries a band, which is to say the install can assign it. */
export function isAutomatic(tier: Tier): boolean {
  return typeof tier.minPercentile === 'number';
}

/**
 * The band in plain words, counted from the top, because "the top fifth" is
 * how a reader thinks about a leaderboard and "the 80th percentile" is not.
 */
export function tierBand(tier: Tier): string | null {
  if (!isAutomatic(tier)) return null;
  const min = Math.max(0, Math.min(100, tier.minPercentile ?? 0));
  const max = Math.max(min, Math.min(100, tier.maxPercentile ?? 100));
  const fromTop = Math.round(100 - min);
  const toTop = Math.round(100 - max);
  if (max >= 99.5) return `The top ${fromTop} percent of ranked holders`;
  if (min <= 0.5) return `Everyone below the top ${toTop} percent`;
  return `Between the top ${toTop} and the top ${fromTop} percent`;
}

/**
 * Which tier a row is in.
 *
 * A tier written into the snapshot wins, because the artist may have set it
 * by hand. Otherwise the band decides, from the rank and the size of the
 * ranked list.
 */
export function assignTier(row: LeaderboardRow, total: number, tiers: readonly Tier[]): Tier | null {
  const recorded = tierById(tiers, row.tierId);
  if (recorded) return recorded;
  if (tiers.length === 0) return null;
  return tierById(tiers, tierForRank(row.rank, total, tiers));
}

export interface TierCount {
  tier: Tier;
  wallets: number;
  /** Share of the ranked list, as a percentage. */
  share: number;
}

/** How many wallets are in each tier right now, highest tier first. */
export function tierDistribution(
  assigned: readonly { tier: Tier | null }[],
  tiers: readonly Tier[],
): TierCount[] {
  const total = assigned.length;
  const counts = new Map<string, number>();
  for (const entry of assigned) {
    if (!entry.tier) continue;
    counts.set(entry.tier.id, (counts.get(entry.tier.id) ?? 0) + 1);
  }
  return tiersHighestFirst(tiers).map(tier => {
    const wallets = counts.get(tier.id) ?? 0;
    return { tier, wallets, share: total > 0 ? (wallets / total) * 100 : 0 };
  });
}

/**
 * The colour token a tier names, checked against the tokens the theme
 * actually has. A tier that names anything else gets the neutral treatment
 * rather than a class Tailwind never generated.
 */
const TIER_TOKENS = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'] as const;

export type TierToken = (typeof TIER_TOKENS)[number];

export function tierToken(tier: Tier | null | undefined): TierToken | null {
  const value = tier?.color?.trim();
  return TIER_TOKENS.find(token => token === value) ?? null;
}
