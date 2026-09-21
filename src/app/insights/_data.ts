import 'server-only';

import { GUILD_PATH, LEADERBOARD_PATH } from '@/components/raisonne/guild/lib';
import type { InsightsNavExtra } from '@/components/raisonne/insights/insights-nav';
import { newestFirst, type ActivityRowData } from '@/components/raisonne/insights/lib';
import type { MostTradedRow } from '@/components/raisonne/insights/most-traded-table';
import type { MissingVar } from '@/components/raisonne/insights/no-chain-data';
import type { SnapshotMeta } from '@/components/raisonne/insights/snapshot-note';
import { seriesHref, seriesTitle, workHref, workTitle } from '@/components/raisonne/works/lib';
import { getChainSnapshot, getGuild, getSiteData, getWorkById } from '@/fixtures';
import { ENV_DOCS, featureStatus } from '@/lib/config';
import { getLeaderboard } from '@/lib/chain';
import type { ActivityEvent, Chain, InsightsSummary } from '@/lib/types';

/**
 * What the three insights pages read.
 *
 * The components under src/components/raisonne never touch the fixtures, so
 * every read is here, once, and each page hands its components plain data.
 *
 * Nothing in here invents a fallback. With no snapshot the meta says so, the
 * maps come back empty, and the pages render their designed panel instead of
 * a grid of zeros.
 */

/** Series slug to the catalogue's own title and URL, for every table on these pages. */
export function seriesIndex(): Map<string, { title: string; href: string }> {
  const index = new Map<string, { title: string; href: string }>();
  for (const series of getSiteData().series) {
    index.set(series.slug, { title: seriesTitle(series), href: seriesHref(series) });
  }
  return index;
}

/** A token id resolved against the catalogue, or null when this install does not carry it. */
export function resolveWork(workId: string | null | undefined): { title: string; href: string } | null {
  if (!workId) return null;
  const work = getWorkById(workId);
  if (!work || work.hidden) return null;
  return { title: workTitle(work), href: workHref(work) };
}

/** Where the numbers came from, and what the snapshot admits it could not see. */
export function snapshotMeta(): SnapshotMeta {
  const snapshot = getChainSnapshot();
  const contracts = snapshot?.contracts ?? [];
  return {
    computedAt: snapshot?.computedAt ?? null,
    live: featureStatus('chain').configured,
    gaps: snapshot?.insights?.gaps ?? [],
    contracts: contracts.length,
    truncated: contracts.filter(entry => entry.truncated).length,
  };
}

/** The chains the snapshot actually read, in the order the contracts list them. */
export function snapshotChains(): Chain[] {
  return [...new Set((getChainSnapshot()?.contracts ?? []).map(entry => entry.chain))];
}

/**
 * Every event in the snapshot, newest first.
 *
 * Sorted here rather than in each page, because a snapshot writes its events
 * one contract at a time and the file's own order is grouped, not
 * chronological. Three pages say "newest first" and all three mean it.
 */
export function snapshotEvents(): ActivityEvent[] {
  return newestFirst(getChainSnapshot()?.events ?? []);
}

export function snapshotInsights(): InsightsSummary | null {
  return getChainSnapshot()?.insights ?? null;
}

/** The variables the artist has to set before a snapshot can be taken. */
export function missingChainVars(): MissingVar[] {
  return featureStatus('chain').missing.map(name => ({ name, detail: ENV_DOCS[name] ?? '' }));
}

/**
 * The other pages under the insights heading, added only when this install
 * has the data behind them, so the row of links can never lead to an empty
 * page. The leaderboard and the guild belong to their own package; the paths
 * come from there rather than being written out again here.
 */
export function insightsExtraNav(): InsightsNavExtra[] {
  const extra: InsightsNavExtra[] = [];
  if (getLeaderboard(1).length > 0) extra.push({ href: LEADERBOARD_PATH, label: 'Leaderboard' });
  const guild = getGuild();
  if (guild && (guild.tiers.length > 0 || guild.badges.length > 0)) extra.push({ href: GUILD_PATH, label: 'Guild' });
  return extra;
}

/** An event turned into the row the feed renders, with the catalogue's own titles attached. */
export function activityRow(event: ActivityEvent, series: Map<string, { title: string; href: string }>): ActivityRowData {
  return {
    id: event.id,
    type: event.type,
    at: event.at,
    chain: event.chain,
    contract: event.contract,
    tokenId: event.tokenId,
    quantity: event.quantity,
    from: event.from,
    to: event.to,
    price: event.price ?? null,
    txHash: event.txHash,
    work: resolveWork(event.workId),
    seriesTitle: event.seriesSlug ? (series.get(event.seriesSlug)?.title ?? null) : null,
  };
}

/** The most traded works, resolved against the catalogue. */
export function mostTradedRows(
  insights: InsightsSummary | null,
  series: Map<string, { title: string; href: string }>,
  limit: number,
): MostTradedRow[] {
  return (insights?.mostTraded ?? []).slice(0, limit).map(entry => {
    const known = entry.seriesSlug ? series.get(entry.seriesSlug) : undefined;
    return {
      workId: entry.workId,
      tokenId: entry.tokenId,
      events: entry.events,
      sales: entry.sales,
      work: resolveWork(entry.workId),
      seriesTitle: known?.title ?? null,
      seriesHref: known?.href ?? null,
    };
  });
}
