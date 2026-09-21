import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ActivityFeed } from '@/components/raisonne/insights/activity-feed';
import { ActivityFilters, ActivityPagination, type SeriesOption } from '@/components/raisonne/insights/activity-filters';
import { InsightsNav } from '@/components/raisonne/insights/insights-nav';
import {
  ACTIVITY_PAGE_SIZE,
  EVENT_DESCRIPTIONS,
  EVENT_LABELS,
  EVENT_TYPES,
  eventCounts,
  filterEvents,
  parseActivityQuery,
} from '@/components/raisonne/insights/lib';
import { NoChainData } from '@/components/raisonne/insights/no-chain-data';
import { SnapshotNote } from '@/components/raisonne/insights/snapshot-note';
import { Container, PageHeader, Section } from '@/components/raisonne/shell/page';
import { getSettings, getSiteData } from '@/fixtures';
import { surfaceState } from '@/lib/config';
import { formatNumber } from '@/lib/money';
import { NO_INDEX, pageMetadata } from '@/lib/seo/metadata';

import { activityRow, insightsExtraNav, missingChainVars, seriesIndex, snapshotEvents, snapshotMeta } from '../_data';

/**
 * The public on-chain feed: every mint, transfer, sale and burn the snapshot
 * reaches, newest first, each linked to the work it moved and to the
 * transaction on a block explorer so any row can be checked against the chain.
 *
 * Wallets appear as addresses and nothing more. An address is public on the
 * chain; a name, an avatar or an email is not, and none of them belongs on a
 * page anyone can read.
 *
 * The filters are links, so the whole state of the feed is its address: a
 * filtered page can be shared, bookmarked and cited.
 */

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export function generateMetadata(): Metadata {
  const settings = getSettings();
  if (surfaceState(settings, 'insights') === 'off') return { title: 'Not found', robots: NO_INDEX };
  const { artist } = getSiteData();
  return pageMetadata('insights-activity', {
    title: 'Activity',
    description: `Public on-chain events for the work of ${artist.name}: mints, transfers and sales, each linked to the transaction.`,
    path: '/insights/activity',
  });
}

export default async function InsightsActivityPage({ searchParams }: { searchParams: SearchParams }) {
  const settings = getSettings();
  if (surfaceState(settings, 'insights') === 'off') notFound();

  const params = await searchParams;
  const meta = snapshotMeta();
  const events = snapshotEvents();
  const index = seriesIndex();

  const slugsWithEvents = [...new Set(events.map(event => event.seriesSlug).filter((slug): slug is string => Boolean(slug)))];
  const query = parseActivityQuery(params, slugsWithEvents);

  // Counts are for the choice the reader is about to make, so each one is
  // taken with the other filter already applied.
  const withinSeries = query.series ? events.filter(event => event.seriesSlug === query.series) : events;
  const counts = eventCounts(withinSeries);

  const seriesOptions: SeriesOption[] = slugsWithEvents
    .map(slug => ({
      slug,
      title: index.get(slug)?.title ?? slug,
      events: events.filter(event => event.seriesSlug === slug && (query.type === 'all' || event.type === query.type))
        .length,
    }))
    .sort((a, b) => b.events - a.events || a.title.localeCompare(b.title));

  const matched = filterEvents(events, query);
  const pages = Math.max(1, Math.ceil(matched.length / ACTIVITY_PAGE_SIZE));
  const page = Math.min(query.page, pages);
  const from = (page - 1) * ACTIVITY_PAGE_SIZE;
  const rows = matched.slice(from, from + ACTIVITY_PAGE_SIZE).map(event => activityRow(event, index));

  return (
    <Container size="editorial" className="pb-16 md:pb-24">
      <PageHeader
        title="Activity"
        description="Every mint, transfer and sale the snapshot reaches, newest first, with a link to the transaction on a block explorer."
      />

      <InsightsNav current="activity" extra={insightsExtraNav()} />

      <div className="pt-8">
        <SnapshotNote meta={meta} />
      </div>

      {events.length === 0 ? (
        <Section>
          <NoChainData missing={missingChainVars()} />
        </Section>
      ) : (
        <>
          <Section id="filters" title="Filter" size="small" headingLevel={2}>
            <ActivityFilters query={query} counts={counts} series={seriesOptions} />
            <dl className="grid gap-x-8 gap-y-2 text-sm text-muted-foreground sm:grid-cols-2">
              {EVENT_TYPES.filter(type => counts[type] > 0).map(type => (
                <div key={type} className="flex flex-wrap gap-x-2">
                  <dt className="font-medium text-foreground">{EVENT_LABELS[type]}</dt>
                  <dd className="min-w-0 flex-1">{EVENT_DESCRIPTIONS[type]}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section
            id="feed"
            title="Events"
            description={
              matched.length === events.length
                ? `All ${formatNumber(events.length)} events in the snapshot.`
                : `${formatNumber(matched.length)} of ${formatNumber(events.length)} events in the snapshot.`
            }
          >
            <ActivityFeed
              rows={rows}
              caption={
                matched.length > ACTIVITY_PAGE_SIZE
                  ? `Showing ${formatNumber(from + 1)} to ${formatNumber(from + rows.length)} of ${formatNumber(matched.length)}.`
                  : undefined
              }
            />
            <ActivityPagination query={{ ...query, page }} total={matched.length} />
          </Section>
        </>
      )}
    </Container>
  );
}
