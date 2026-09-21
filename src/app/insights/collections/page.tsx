import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { InsightsNav } from '@/components/raisonne/insights/insights-nav';
import { periodBounds, priceDistribution, seriesPeriodRows, seriesRows } from '@/components/raisonne/insights/lib';
import { NoChainData } from '@/components/raisonne/insights/no-chain-data';
import { PriceDistributionChart } from '@/components/raisonne/insights/price-chart';
import { SeriesTable } from '@/components/raisonne/insights/series-table';
import { SeriesVolumeChart } from '@/components/raisonne/insights/series-volume-chart';
import { SnapshotNote } from '@/components/raisonne/insights/snapshot-note';
import { TopSeries, type TopSeriesRow } from '@/components/raisonne/insights/top-series';
import { CardHeading } from '@/components/raisonne/shell/card-heading';
import { Container, PageHeader, Section } from '@/components/raisonne/shell/page';
import { EMPTY_BLOCK_CLASS } from '@/components/raisonne/shell/measure';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { getSettings, getSiteData } from '@/fixtures';
import { surfaceState } from '@/lib/config';
import { NO_INDEX, pageMetadata } from '@/lib/seo/metadata';
import { cn } from '@/lib/utils';

import { missingChainVars, seriesIndex, snapshotEvents, snapshotInsights, snapshotMeta, insightsExtraNav } from '../_data';

/**
 * Every series, side by side: who holds it, how much of it there is, and
 * what the chain recorded about its movement.
 *
 * Two things a market page usually shows are missing on purpose. There is no
 * floor price, because a floor is the lowest open listing and listings live
 * in a marketplace's order book rather than on the chain; the last sale whose
 * price was visible in the transaction stands in its place, dated, so a
 * reader can see how old it is. There is no currency selector, because
 * converting an amount needs a rate for the day of each sale and this install
 * stores no price feed it could name. Amounts are shown in whatever each sale
 * settled in.
 */

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export function generateMetadata(): Metadata {
  const settings = getSettings();
  if (surfaceState(settings, 'insights') === 'off') return { title: 'Not found', robots: NO_INDEX };
  const { artist } = getSiteData();
  return pageMetadata('insights-collections', {
    title: 'Collections',
    description: `Per-series figures for the work of ${artist.name}: holders, supply, mints, transfers and the sales whose price is on the chain.`,
    path: '/insights/collections',
  });
}

/** How long a "this period against the last" window is. */
const PERIOD_DAYS = 90;

export default async function InsightsCollectionsPage({ searchParams }: { searchParams: SearchParams }) {
  const settings = getSettings();
  if (surfaceState(settings, 'insights') === 'off') notFound();

  const params = await searchParams;
  const insights = snapshotInsights();
  const events = snapshotEvents();
  const meta = snapshotMeta();
  const index = seriesIndex();

  const rows = seriesRows(insights?.bySeries ?? [], index, events);

  const wanted = Array.isArray(params.series) ? params.series[0] : params.series;
  const selected = rows.find(row => row.seriesSlug === wanted) ?? null;

  const bounds = periodBounds(meta.computedAt, PERIOD_DAYS);
  const movers: TopSeriesRow[] = seriesPeriodRows(events, bounds).map(row => ({
    ...row,
    title: index.get(row.slug)?.title ?? row.slug,
    href: index.get(row.slug)?.href ?? null,
  }));

  const shown = selected ? [selected] : rows;

  // Narrowing to one series narrows the price bands with it, so the filter
  // answers "what do works of this series sell for" and not just "how many".
  const prices = priceDistribution(
    selected ? events.filter(event => event.seriesSlug === selected.seriesSlug) : events,
  );

  return (
    <Container size="editorial" className="pb-16 md:pb-24">
      <PageHeader
        title="Collections"
        description="What each series looks like on chain: the wallets holding it, the tokens it reached, and the prices that were visible in the transactions."
      />

      <InsightsNav current="collections" extra={insightsExtraNav()} />

      <div className="pt-8">
        <SnapshotNote meta={meta} />
      </div>

      {!insights || rows.length === 0 ? (
        <Section>
          {insights ? (
            <Empty className={cn(EMPTY_BLOCK_CLASS, 'max-w-md')}>
              <EmptyHeader>
                <EmptyTitle>No series in the snapshot</EmptyTitle>
                <EmptyDescription>
                  The snapshot read no contract this catalogue knows about. Check that each series carries its contract
                  address, then run the chain snapshot again.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <NoChainData missing={missingChainVars()} />
          )}
        </Section>
      ) : (
        <>
          {rows.length > 1 ? (
            <Section
              id="filter"
              title="Narrow to one series"
              description="The whole state of this page is its address, so a filtered view can be shared or cited."
              size="small"
              headingLevel={2}
            >
              <ul className="flex flex-wrap items-center gap-2">
                <li>
                  <Badge
                    variant={selected ? 'outline' : 'default'}
                    className="h-7 px-3"
                    render={<Link href="/insights/collections" aria-current={selected ? undefined : 'true'} />}
                  >
                    Every series
                  </Badge>
                </li>
                {rows.map(row => (
                  <li key={row.seriesSlug}>
                    <Badge
                      variant={selected?.seriesSlug === row.seriesSlug ? 'default' : 'outline'}
                      className="h-7 px-3"
                      render={
                        <Link
                          href={`/insights/collections?series=${encodeURIComponent(row.seriesSlug)}`}
                          aria-current={selected?.seriesSlug === row.seriesSlug ? 'true' : undefined}
                        />
                      }
                    >
                      {row.title}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {selected ? (
            <Section
              id="series"
              title={selected.title}
              description="Everything the snapshot holds about this series."
              action={
                selected.href ? (
                  <Button variant="outline" size="sm" nativeButton={false} render={<Link href={selected.href} />}>
                    Open the series
                  </Button>
                ) : null
              }
            >
              <SeriesTable rows={shown} />
              {prices ? <PriceDistributionChart distribution={prices} /> : null}
            </Section>
          ) : (
            <>
              {movers.length > 0 && bounds ? (
                <Section
                  id="movers"
                  title="Top series, this period against the last"
                  description={`Measured back from the snapshot's own date, so the comparison does not shift as the snapshot ages.`}
                >
                  <TopSeries rows={movers} bounds={bounds} />
                </Section>
              ) : null}

              <Section
                id="volume"
                title="Volume by series"
                description="Priced sales only. A sale that settled in a wrapped token or through a marketplace contract carries no value in the transaction, so it is not in these totals."
              >
                <SeriesVolumeChart rows={rows} />
                <Card>
                  <CardHeader className="gap-1">
                    <CardHeading level={3}>Why there is no currency selector</CardHeading>
                    <CardDescription>
                      Converting an on-chain amount needs an exchange rate for the day of each sale. This install stores
                      no price feed it could name, so amounts stay in the currency each sale settled in and there is no
                      dollar column.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    An install that wants one can add a rate source to the chain snapshot and fill in{' '}
                    <code className="font-mono text-xs">TokenAmount.usd</code>, which every figure on these pages
                    already carries a place for.
                  </CardContent>
                </Card>
              </Section>

              {prices ? (
                <Section
                  id="prices"
                  title="What works sold for"
                  description="Priced sales grouped into bands. The highest sale is the figure a dashboard reaches for and the least representative one it has; this is what a work of this catalogue usually changed hands for."
                >
                  <PriceDistributionChart distribution={prices} />
                </Section>
              ) : null}

              <Section id="all" title="Every series" description="Sorted by the number of wallets holding it.">
                <SeriesTable rows={rows} />
              </Section>
            </>
          )}
        </>
      )}
    </Container>
  );
}
