import Link from 'next/link';
import { ArrowDownUpIcon, CheckIcon, UsersIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { EMPTY_BLOCK_CLASS } from '@/components/raisonne/shell/measure';
import { WorksPagination } from '@/components/raisonne/works/works-pagination';
import { formatCount, formatDate } from '@/components/raisonne/works/lib';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { assignTier } from '@/lib/guild';
import type { LeaderboardRow, Tier } from '@/lib/types';
import { cn } from '@/lib/utils';

import { CollectorNameLink } from './collector-identity';
import { TierChip } from './tier-badges';
import {
  DIRECTORY_SORTS,
  directoryHref,
  isFilteredDirectory,
  type DirectoryPage,
  type DirectoryState,
} from './lib';

/**
 * The directory of everyone holding the artist's work.
 *
 * It renders on the server: the whole list is filtered, ordered and paged
 * there, and only the rows on screen reach the browser. Every control is a
 * link or a GET form, so an order, a series filter and a page are all places
 * that can be shared, opened in a new tab and crawled.
 *
 * The rows come from the install's own chain snapshot and hold nothing that
 * is not already public on-chain: an address, what it holds, and when it
 * first and last acquired.
 */

export function CollectorDirectory({
  page,
  state,
  series,
  tiers,
  rankedTotal,
  search,
  showLabels = false,
  linkProfiles = true,
  anchorId = 'collectors',
  className,
}: {
  page: DirectoryPage;
  state: DirectoryState;
  /** The series a visitor can narrow to, with the holders each one has. */
  series: { slug: string; name: string; holders: number }[];
  /**
   * The install's tiers, for the tier column. A row's tier is worked out the
   * way the leaderboard works it out, so the two pages cannot disagree.
   */
  tiers: readonly Tier[];
  /** Wallets on the whole ranked list, which is what a tier band is a percentile of. */
  rankedTotal: number;
  /** The search form, which is the one part of the toolbar that runs in the browser. */
  search?: ReactNode;
  showLabels?: boolean;
  /** Whether this install publishes a page per wallet (settings.publicCollectorProfiles). */
  linkProfiles?: boolean;
  anchorId?: string;
  className?: string;
}) {
  const hasTiers = tiers.length > 0 && page.rows.some(row => assignTier(row, rankedTotal, tiers) !== null);

  return (
    <div className={cn('flex flex-col gap-6', className)} id={anchorId}>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {search}
        <DirectoryControls state={state} series={series} />
      </div>

      {page.rows.length === 0 ? (
        <NoMatches state={state} />
      ) : (
        <>
          <div className="w-full overflow-x-auto">
            <Table>
              <TableCaption className="sr-only">
                Collectors, {captionFor(state)}. {formatCount(page.total)} in all.
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14 text-right">Rank</TableHead>
                  <TableHead>Collector</TableHead>
                  <TableHead className="text-right">Works</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Series</TableHead>
                  {hasTiers ? <TableHead className="hidden md:table-cell">Tier</TableHead> : null}
                  <TableHead className="hidden text-right lg:table-cell">First acquired</TableHead>
                  <TableHead className="hidden text-right lg:table-cell">Last acquired</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.rows.map(row => (
                  <DirectoryRow
                    key={row.address}
                    row={row}
                    tier={assignTier(row, rankedTotal, tiers)}
                    hasTiers={hasTiers}
                    showLabels={showLabels}
                    linkProfiles={linkProfiles}
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {formatCount(page.total)} {page.total === 1 ? 'collector' : 'collectors'}
              {page.pages > 1 ? `, page ${formatCount(page.page)} of ${formatCount(page.pages)}` : ''}
            </p>
            <WorksPagination
              page={page.page}
              pages={page.pages}
              hrefFor={value => `${directoryHref(state, { page: value })}#${anchorId}`}
            />
          </div>
        </>
      )}
    </div>
  );
}

/** What the table's own caption says it is showing, for a screen reader. */
function captionFor(state: DirectoryState): string {
  const order = DIRECTORY_SORTS.find(sort => sort.id === state.sort)?.label.toLowerCase() ?? 'rank';
  const filters = [state.series ? `holding ${state.series}` : '', state.q ? `matching ${state.q}` : ''].filter(Boolean);
  return [`ordered by ${order}`, ...filters].join(', ');
}

function DirectoryRow({
  linkProfiles,
  row,
  tier,
  hasTiers,
  showLabels,
}: {
  linkProfiles: boolean;
  row: LeaderboardRow;
  tier: Tier | null;
  hasTiers: boolean;
  showLabels: boolean;
}) {
  const first = formatDate(row.firstAcquiredAt ?? null);
  const last = formatDate(row.lastAcquiredAt ?? null);

  return (
    <TableRow>
      <TableCell className="text-right font-mono text-xs text-muted-foreground tabular-nums">{row.rank}</TableCell>
      <TableCell className="min-w-56">
        <CollectorNameLink entry={row} showLabel={showLabels} linked={linkProfiles} />
      </TableCell>
      <TableCell className="text-right tabular-nums">{formatCount(row.worksOwned)}</TableCell>
      <TableCell className="hidden text-right tabular-nums sm:table-cell">{formatCount(row.seriesCount)}</TableCell>
      {hasTiers ? (
        <TableCell className="hidden md:table-cell">
          <TierChip tier={tier} />
        </TableCell>
      ) : null}
      <TableCell className="hidden text-right text-muted-foreground tabular-nums lg:table-cell">
        {first ?? 'Not recorded'}
      </TableCell>
      <TableCell className="hidden text-right text-muted-foreground tabular-nums lg:table-cell">
        {last ?? 'Not recorded'}
      </TableCell>
    </TableRow>
  );
}

/**
 * The order of the list and the series filter. Both are menus of links, so
 * they work with no JavaScript and leave a shareable URL behind them.
 */
function DirectoryControls({
  state,
  series,
}: {
  state: DirectoryState;
  series: { slug: string; name: string; holders: number }[];
}) {
  const currentSort = DIRECTORY_SORTS.find(sort => sort.id === state.sort) ?? DIRECTORY_SORTS[0];
  const currentSeries = series.find(entry => entry.slug === state.series);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" size="sm" aria-label={`Sort: ${currentSort.label}`} />}>
          <ArrowDownUpIcon aria-hidden data-icon="inline-start" />
          <span>{currentSort.label}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-auto min-w-48">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Sort</DropdownMenuLabel>
          </DropdownMenuGroup>
          {DIRECTORY_SORTS.map(sort => {
            const selected = sort.id === state.sort;
            return (
              <DropdownMenuItem
                key={sort.id}
                render={
                  <Link
                    href={directoryHref(state, { sort: sort.id })}
                    scroll={false}
                    aria-current={selected ? 'true' : undefined}
                  />
                }
              >
                <CheckIcon aria-hidden className={selected ? undefined : 'invisible'} />
                {sort.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {series.length > 1 ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                aria-label={currentSeries ? `Series: ${currentSeries.name}` : 'Filter by series'}
              />
            }
          >
            <span>{currentSeries ? currentSeries.name : 'Every series'}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-80 w-auto min-w-56 overflow-y-auto">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Holders of</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuItem
              render={<Link href={directoryHref(state, { series: '' })} scroll={false} />}
            >
              <CheckIcon aria-hidden className={state.series ? 'invisible' : undefined} />
              Every series
            </DropdownMenuItem>
            {series.map(entry => {
              const selected = entry.slug === state.series;
              return (
                <DropdownMenuItem
                  key={entry.slug}
                  render={
                    <Link
                      href={directoryHref(state, { series: entry.slug })}
                      scroll={false}
                      aria-current={selected ? 'true' : undefined}
                    />
                  }
                >
                  <CheckIcon aria-hidden className={selected ? undefined : 'invisible'} />
                  <span className="truncate">{entry.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                    {formatCount(entry.holders)}
                  </span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      {isFilteredDirectory(state) ? (
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href={directoryHref(state, { q: '', series: '' })} scroll={false} />}
        >
          Clear
        </Button>
      ) : null}
    </>
  );
}

function NoMatches({ state }: { state: DirectoryState }) {
  return (
    <Empty className={EMPTY_BLOCK_CLASS}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <UsersIcon />
        </EmptyMedia>
        <EmptyTitle>No collector matches</EmptyTitle>
        <EmptyDescription>
          {state.q
            ? 'Nothing here matches that address or name. A wallet appears only once a snapshot has recorded it holding a work.'
            : 'No wallet in the last snapshot holds a work of this series.'}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" nativeButton={false} render={<Link href={directoryHref(state, { q: '', series: '' })} />}>
          Clear the filters
        </Button>
      </EmptyContent>
    </Empty>
  );
}
