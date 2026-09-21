import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SearchXIcon } from 'lucide-react';
import type { Metadata } from 'next';

import { signInUrl } from '@/components/raisonne/auth/routes';
import type { RawSearchParams } from '@/components/raisonne/catalogue/lib';
import { BadgeDistribution } from '@/components/raisonne/guild/badge-distribution';
import { LeaderboardSearch } from '@/components/raisonne/guild/leaderboard-search';
import { LeaderboardTable } from '@/components/raisonne/guild/leaderboard-table';
import { GUILD_PATH, isFiltered, leaderboardHref, parseLeaderboardState, shownRange } from '@/components/raisonne/guild/lib';
import { RankingExplainer } from '@/components/raisonne/guild/ranking-explainer';
import { TierFilter } from '@/components/raisonne/guild/tier-filter';
import { SignInToSeeYourRow, YourStanding } from '@/components/raisonne/guild/your-standing';
import { MetricGrid } from '@/components/raisonne/insights/metric-grid';
import { NoChainData } from '@/components/raisonne/insights/no-chain-data';
import { SnapshotNote } from '@/components/raisonne/insights/snapshot-note';
import { sourceLabel, type Metric } from '@/components/raisonne/insights/lib';
import { EMPTY_BLOCK_CLASS } from '@/components/raisonne/shell/measure';
import { Container, PageHeader, Section } from '@/components/raisonne/shell/page';
import { formatCount, formatDate } from '@/components/raisonne/works/lib';
import { WorksPagination } from '@/components/raisonne/works/works-pagination';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { getSettings, getSiteData } from '@/fixtures';
import { getSessionAddress, isOwnerAddress } from '@/lib/auth/guards';
import { chainDataState } from '@/lib/chain/holdings';
import { ENV_DOCS, isConfigured, surfaceState } from '@/lib/config';
import {
  LEADERBOARD_PAGE_SIZE,
  badgeCatalogue,
  badgeCounts,
  clampPage,
  filterStandings,
  findStanding,
  pageCount,
  pageOf,
  tierDistribution,
} from '@/lib/guild';
import { getGuildBoard } from '@/lib/guild/read';
import { pageMetadata } from '@/lib/seo/metadata';

/**
 * Who holds the work, ranked.
 *
 * Everything on this page is counted from one file: the chain snapshot this
 * install refreshes with `pnpm snapshot:chain`. Nothing is read live, because
 * a ranking has to be the same for every reader, and nothing is estimated,
 * because the only honest alternative to a number the snapshot cannot support
 * is no number at all. The note under the heading says when the snapshot was
 * taken, and the section at the foot says in plain words how the order was
 * decided.
 *
 * The page belongs to the insights module. With it switched off there is no
 * leaderboard at all, which is the right answer for an artist who does not
 * want their collectors listed: a 404, not an empty table.
 */

const ANCHOR = 'ranked';

export function generateMetadata(): Metadata {
  const { artist } = getSiteData();
  return pageMetadata('leaderboard', {
    title: 'Collector leaderboard',
    description: `Everyone holding a work by ${artist.name}, ranked from the studio's own on-chain snapshot: works held, series covered and how long they have held them.`,
    path: '/leaderboard',
  });
}

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const settings = getSettings();
  if (surfaceState(settings, 'insights') === 'off') notFound();

  const board = getGuildBoard();
  const chain = chainDataState();

  if (!board || board.total === 0) {
    return (
      <Container size="editorial" className="pb-16 md:pb-24">
        <PageHeader
          title="Collector leaderboard"
          description="Who holds the work, ranked from this install's own chain snapshot."
        />
        <NoChainData
          title={board ? 'The snapshot found no holders' : 'No chain snapshot yet'}
          missing={
            isConfigured('chain')
              ? []
              : [{ name: 'ALCHEMY_API_KEY', detail: ENV_DOCS.ALCHEMY_API_KEY ?? '' }]
          }
        />
      </Container>
    );
  }

  const params = await searchParams;
  const state = parseLeaderboardState(
    params,
    board.tiers.map(tier => tier.id),
  );

  // The tier counts are of what the search left, not of the whole list, so a
  // chip never promises rows that the query has already taken away.
  const searched = filterStandings(board.standings, { query: state.q });
  const matched = state.tier ? searched.filter(standing => standing.tier?.id === state.tier) : searched;
  const distribution = tierDistribution(searched, board.tiers);
  const page = clampPage(state.page, matched.length);
  const pages = pageCount(matched.length);
  const rows = pageOf(matched, page);
  const range = shownRange({ ...state, page }, matched.length);

  // The session is read only when sign-in is configured, so an install with no
  // secret stays a static page rather than an uncached one.
  const own = await getSessionAddress();
  const ownStanding = findStanding(board.standings, own);
  const snapshotDate = formatDate(board.snapshot.computedAt);

  // Which page of the table the signed-in wallet's own row is on, when the
  // filters have not taken it off the list and it is not already in view.
  const ownIndex = ownStanding ? matched.indexOf(ownStanding) : -1;
  const ownPage = ownIndex === -1 ? null : Math.floor(ownIndex / LEADERBOARD_PAGE_SIZE) + 1;
  const ownRowHref = ownPage !== null && ownPage !== page ? `${leaderboardHref(state, { page: ownPage })}#${ANCHOR}` : null;

  return (
    <Container size="editorial" className="pb-16 md:pb-24">
      <PageHeader
        eyebrow="Insights"
        title="Collector leaderboard"
        description={`Every wallet holding a work in this catalogue, ranked by how much of it they hold and how long they have held it. Counted from the chain itself${snapshotDate ? `, as it stood on ${snapshotDate}` : ''}.`}
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href={GUILD_PATH} />}>
            Tiers and badges
          </Button>
        }
      />

      <SnapshotNote
        meta={{
          computedAt: board.snapshot.computedAt,
          live: chain.live,
          gaps: board.snapshot.gaps,
          contracts: board.snapshot.contracts,
          truncated: board.snapshot.truncated ? 1 : 0,
        }}
      />

      <Section title="At a glance" headingLevel={2} size="small">
        <MetricGrid metrics={highlights(board.totals, board.snapshot.computedAt)} headingLevel={3} />
      </Section>

      <Section title="Your place on it" headingLevel={2} size="small">
        {own ? (
          <YourStanding
            standing={ownStanding}
            address={own}
            total={board.total}
            isOwner={isOwnerAddress(own)}
            snapshotDate={snapshotDate}
            rowHref={ownRowHref}
            headingLevel={3}
          />
        ) : isConfigured('accounts') ? (
          <SignInToSeeYourRow href={signInUrl('/leaderboard')} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Sign-in is not configured on this install, so the list is read the same way by everyone. The ranking itself
            needs no account.
          </p>
        )}
      </Section>

      <Section
        id={ANCHOR}
        title="Ranked holders"
        headingLevel={2}
        description="Search by address, ENS name or tier. Every filter is in the URL, so a view can be shared."
        action={<LeaderboardSearch state={{ ...state, page }} />}
      >
        <div className="flex flex-col gap-4">
          <TierFilter distribution={distribution} state={{ ...state, page }} total={searched.length} />

          <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
            {matched.length === 0
              ? 'No wallet matches'
              : `Showing ${formatCount(range.from)} to ${formatCount(range.to)} of ${formatCount(matched.length)} ${matched.length === 1 ? 'wallet' : 'wallets'}`}
            {isFiltered(state) ? (
              <>
                {' '}
                <Link href={leaderboardHref(state, { q: '', tier: '' })} className="underline underline-offset-4">
                  Clear
                </Link>
              </>
            ) : null}
          </p>

          {rows.length > 0 ? (
            <>
              <LeaderboardTable
                standings={rows}
                ownAddress={own}
                linkProfiles={settings.publicCollectorProfiles === true}
                caption={`Collectors ranked by works held, from the chain snapshot${snapshotDate ? ` of ${snapshotDate}` : ''}.`}
              />
              <WorksPagination
                page={page}
                pages={pages}
                hrefFor={next => `${leaderboardHref(state, { page: next })}#${ANCHOR}`}
              />
            </>
          ) : (
            <Empty className={EMPTY_BLOCK_CLASS}>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchXIcon />
                </EmptyMedia>
                <EmptyTitle>Nothing matches that</EmptyTitle>
                <EmptyDescription>
                  Try part of an address, an ENS name, or a tier name. The search only looks at what is on the page.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>
      </Section>

      <Section
        title="How the ranking works"
        headingLevel={2}
        description="The same four comparisons the code makes, in the order it makes them. Two people with the same snapshot get the same list."
      >
        <RankingExplainer />
      </Section>

      <Section
        title="What a badge means"
        headingLevel={2}
        size="small"
        description="Badges come from facts in the snapshot, never from a decision about someone. Each one says exactly what earns it."
        action={
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href={GUILD_PATH} />}>
            Tiers and badges
          </Button>
        }
      >
        <BadgeDistribution badges={badgeCatalogue(board.badges)} counts={badgeCounts(board.standings)} />
      </Section>
    </Container>
  );
}

/** Four counts, all of them things the snapshot can stand behind. */
function highlights(
  totals: { wallets: number; worksHeld: number; seriesHeld: number; withBadges: number },
  computedAt: string,
): Metric[] {
  const source = sourceLabel('derived', computedAt);
  return [
    {
      id: 'wallets',
      label: 'Ranked wallets',
      value: formatCount(totals.wallets),
      hint: "Wallets holding at least one work. The artist's own wallets are not among them.",
      sourceId: 'derived',
      source,
    },
    {
      id: 'works',
      label: 'Works held between them',
      value: formatCount(totals.worksHeld),
      hint: 'Tokens in wallets, counted once each.',
      sourceId: 'derived',
      source,
    },
    {
      id: 'series',
      label: 'Series held',
      value: formatCount(totals.seriesHeld),
      sourceId: 'derived',
      source,
    },
    {
      id: 'badged',
      label: 'Wallets with a badge',
      value: formatCount(totals.withBadges),
      hint: 'Worked out from the snapshot, never given by hand unless it says so.',
      sourceId: 'derived',
      source,
    },
  ];
}
