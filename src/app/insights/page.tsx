import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { MonthlyActivityChart } from '@/components/raisonne/insights/activity-chart';
import { ActivityFeed } from '@/components/raisonne/insights/activity-feed';
import { HoldingDistributionChart } from '@/components/raisonne/insights/distribution-chart';
import { InsightsNav } from '@/components/raisonne/insights/insights-nav';
import { monthlyRows, overviewMetrics, seriesRows, sourceLabel } from '@/components/raisonne/insights/lib';
import { MetricSummary, NotComputedCard } from '@/components/raisonne/insights/metric-grid';
import { MostTradedTable } from '@/components/raisonne/insights/most-traded-table';
import { NoChainData } from '@/components/raisonne/insights/no-chain-data';
import { SeriesTable } from '@/components/raisonne/insights/series-table';
import { SnapshotNote } from '@/components/raisonne/insights/snapshot-note';
import { Container, PageHeader, Section } from '@/components/raisonne/shell/page';
import { Button } from '@/components/ui/button';
import { getCounts, getSettings, getSiteData } from '@/fixtures';
import { surfaceState } from '@/lib/config';
import { NO_INDEX, pageMetadata } from '@/lib/seo/metadata';

import {
  activityRow,
  insightsExtraNav,
  missingChainVars,
  mostTradedRows,
  seriesIndex,
  snapshotChains,
  snapshotEvents,
  snapshotInsights,
  snapshotMeta,
} from './_data';
import { slot } from '@/lib/theme';

/**
 * What the public record says about this body of work: how much of it there
 * is, who holds it, and what has happened to it on chain.
 *
 * Three rules hold this page together.
 *
 * Every figure is labelled with where it came from, because the page mixes
 * what the catalogue holds with what a contract reported and with what was
 * worked out from the second. A reader checking a claim has to know which.
 *
 * Every on-chain figure is dated with the snapshot's own date, not today's.
 * A dashboard that looks live while showing month-old numbers is worse than
 * one that says how old it is.
 *
 * Anything this install cannot compute is absent. There is no floor price,
 * no market cap and no listing count here, because none of the three can be
 * worked out from public chain data alone, and a zero in their place would
 * read as a fact. The page names them instead.
 */

export function generateMetadata(): Metadata {
  const settings = getSettings();
  if (surfaceState(settings, 'insights') === 'off') return { title: 'Not found', robots: NO_INDEX };
  const { artist } = getSiteData();
  return pageMetadata('insights', {
    title: 'Insights',
    description: `Public on-chain figures for the work of ${artist.name}: holders, mints, transfers and the sales whose price is visible on the chain.`,
    path: '/insights',
  });
}

/**
 * The figures that lead the page, in this order.
 *
 * What a reader opens /insights for: how big the catalogue is, how many
 * people hold it, how much of it has changed hands and for how much. The
 * other nine are still on the page underneath, as a list, with their sources.
 */
const LEAD_METRICS = ['works', 'collectors', 'sales', 'volume'];

const SERIES_SHOWN = 6;
const WORKS_SHOWN = 10;
const EVENTS_SHOWN = 8;

export default function InsightsPage() {
  slot('insights');
  const settings = getSettings();
  if (surfaceState(settings, 'insights') === 'off') notFound();

  const insights = snapshotInsights();
  const events = snapshotEvents();
  const counts = getCounts();
  const meta = snapshotMeta();
  const series = seriesIndex();

  const metrics = overviewMetrics({
    insights,
    catalogue: { works: counts.works, series: counts.series, tokensOnChain: counts.tokensOnChain },
    computedAt: meta.computedAt,
    contracts: meta.contracts,
    chains: snapshotChains(),
  });
  // With no snapshot the on-chain tiles would all read "not recorded", which
  // is thirteen ways of saying one thing. The panel says it once instead.
  const available = insights ? metrics : metrics.filter(metric => metric.sourceId === 'catalogue');
  const shown = [
    ...LEAD_METRICS.map(id => available.find(metric => metric.id === id)).filter(metric => metric !== undefined),
    ...available.filter(metric => !LEAD_METRICS.includes(metric.id)),
  ];

  const months = monthlyRows(insights);
  const rows = seriesRows(insights?.bySeries ?? [], series, events);
  const traded = mostTradedRows(insights, series, WORKS_SHOWN);
  const recent = events.slice(0, EVENTS_SHOWN).map(event => activityRow(event, series));

  return (
    <Container size="editorial" className="pb-16 md:pb-24">
      <PageHeader
        title="Insights"
        description="What the chain says about this catalogue: who holds the work, how it has moved, and what it traded for where the price is public."
      />

      <InsightsNav current="overview" extra={insightsExtraNav()} />

      <div className="pt-8">
        <SnapshotNote meta={meta} />
      </div>

      <Section title="The numbers" description={`Each figure carries its source. ${sourceLabel('catalogue', null)} figures come from this install's own records; the rest were read from the chain.`}>
        <MetricSummary metrics={shown} />
        {!insights ? <NoChainData missing={missingChainVars()} className="mt-4" /> : null}
      </Section>

      {insights ? (
        <>
          <Section id="not-shown">
            <NotComputedCard />
          </Section>

          {months.length > 0 ? (
            <Section
              id="over-time"
              title="Mints, sales and transfers over time"
              description="Every event the snapshot reaches, by the month of its block."
            >
              <MonthlyActivityChart rows={months} />
            </Section>
          ) : null}

          {(insights.holdingDistribution?.length ?? 0) > 0 ? (
            <Section
              id="distribution"
              title="How the work is spread"
              description="Wallets by how many works of this catalogue they hold."
            >
              <HoldingDistributionChart rows={insights.holdingDistribution ?? []} />
            </Section>
          ) : null}

          {rows.length > 0 ? (
            <Section
              id="series"
              title="Series at a glance"
              description="Holders, tokens and what the chain recorded, for the busiest series."
              action={
                <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/insights/collections" />}>
                  Every series
                </Button>
              }
            >
              <SeriesTable rows={rows.slice(0, SERIES_SHOWN)} />
            </Section>
          ) : null}

          {traded.length > 0 ? (
            <Section
              id="most-traded"
              title="Most traded works"
              description="Ranked by how many times a token moved, which is what a public chain records for every one of them."
            >
              <MostTradedTable rows={traded} />
            </Section>
          ) : null}

          {recent.length > 0 ? (
            <Section
              id="recent"
              title="Recent activity"
              description="The latest events in the snapshot, newest first."
              action={
                <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/insights/activity" />}>
                  The full feed
                </Button>
              }
            >
              <ActivityFeed rows={recent} />
            </Section>
          ) : null}
        </>
      ) : null}
    </Container>
  );
}
