import Link from 'next/link';
import { ImagesIcon, RefreshCwIcon, SearchXIcon } from 'lucide-react';

import { BottomBarAction } from '@/components/raisonne/shell/bottom-bar-action';
import type { HeadingLevel } from '@/components/raisonne/shell/heading';
import { formatCount } from '@/components/raisonne/works/lib';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { cn } from '@/lib/utils';

import { CatalogueCard, CatalogueCardSkeleton } from './catalogue-card';
import { CatalogueTable, CatalogueTableSkeleton } from './catalogue-table';
import type { CatalogueEntry } from './entry';
import { ActiveFilters, CatalogueFacets } from './facets';
import { GalleryWall } from './gallery-wall';
import { CatalogueMore } from './catalogue-more';
import { CataloguePagination } from './catalogue-pagination';
import {
  PAGE_SIZE,
  VIEW_GRID_CLASS,
  VIEW_GRID_SIZES,
  buildFacets,
  catalogueHref,
  clampPage,
  clearedState,
  countLabel,
  dailySeed,
  filterEntries,
  groupEntries,
  isFiltered,
  pageCount,
  sortEntries,
  type CatalogueConfig,
  type CatalogueState,
  type Facet,
} from './lib';
import { CatalogueSearch } from './search-bar';
import { SortMenu } from './sort-menu';
import { ViewToggle } from './view-toggle';
import { EMPTY_BLOCK_CLASS } from '@/components/raisonne/shell/measure';

/**
 * The one browser behind every list on the site: the whole catalogue, and
 * each type on its own page.
 *
 * It runs on the server. The state is read from the URL, the filtering and
 * the sorting happen here, and only the rows on screen are sent to the
 * browser, so a catalogue of 4,031 works costs a page of 24 cards. The
 * controls are links and a GET form, which is what makes a filtered view
 * shareable, crawlable and usable before any JavaScript arrives.
 *
 * The type of a record decides nothing here: `entries` arrive already built
 * and already scoped to a section by the page, because "one of ones" is a
 * selection across types rather than a type of its own.
 */
export function CatalogueBrowser({
  entries,
  state,
  config,
  id = 'catalogue',
  headingLevel = 2,
  className,
}: {
  entries: CatalogueEntry[];
  state: CatalogueState;
  config: CatalogueConfig;
  /** The anchor the list and "back to the top" use. */
  id?: string;
  headingLevel?: HeadingLevel;
  className?: string;
}) {
  const matches = sortEntries(filterEntries(entries, state), state.sort, dailySeed());
  const page = clampPage(state.page, matches.length);
  // A design that grows the list asks for the pages from this one through a later one.
  const through = Math.min(Math.max(page, state.through ?? page), pageCount(matches.length));
  const visible = matches.slice((page - 1) * PAGE_SIZE, through * PAGE_SIZE);
  const shown = (page - 1) * PAGE_SIZE + visible.length;
  const facets = buildFacets(entries, state, config);
  const filtered = isFiltered(state);
  const showType = config.groupBy === 'type' ? state.type === null : entries.some(entry => entry.type !== entries[0]?.type);

  // A list with nothing in it needs no controls: there is nothing to search,
  // nothing to sort and nothing to draw another way.
  if (entries.length === 0) {
    return (
      <div id={id} data-catalogue-type={state.type ?? undefined} data-catalogue-path={config.basePath} data-catalogue-view={state.view} className={cn('flex scroll-mt-20 flex-col gap-6', className)}>
        <CatalogueEmpty state={state} config={config} everythingEmpty />
      </div>
    );
  }

  return (
    <div id={id} data-catalogue-type={state.type ?? undefined} data-catalogue-path={config.basePath} data-catalogue-view={state.view} className={cn('flex scroll-mt-20 flex-col gap-6', className)}>
      <CatalogueToolbar
        state={state}
        config={config}
        facets={facets}
        shown={shown}
        total={matches.length}
        all={entries.length}
        page={page}
      />

      {matches.length === 0 ? (
        <CatalogueEmpty state={state} config={config} everythingEmpty={false} />
      ) : (
        <>
          <CatalogueResults entries={visible} state={state} showType={showType} config={config} headingLevel={headingLevel} />
          <CataloguePagination state={state} config={config} total={matches.length} anchorId={id} />
          <CatalogueMore
            href={shown < matches.length ? catalogueHref(config, state, { page, through: through + 1 }) : null}
          />
          {/*
            Deep in a long grid the toolbar is far above, so the bar at the
            bottom of the window carries where the visitor is and, when a
            filter is narrowing the list, the way out of it.
          */}
          <BottomBarAction>
            <span className="truncate text-xs text-muted-foreground tabular-nums">
              {countLabel(matches.length, page, config)}
            </span>
            {filtered ? (
              <Link
                href={catalogueHref(config, state, clearedState())}
                scroll={false}
                className="shrink-0 rounded-sm text-xs text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                Clear the filters
              </Link>
            ) : null}
          </BottomBarAction>
        </>
      )}
    </div>
  );
}

/**
 * One control bar, grouped at the left. Pushing the view toggle to the far
 * right left two clusters 2,000 px apart on a wide screen with nothing
 * between them, which reads as a broken row rather than a bar. On a phone
 * the search takes a row of its own, so its placeholder is not clipped
 * mid-word and the buttons keep their labels.
 *
 * It is its own component so a page that lists its rows itself, a series and
 * its works, can stand the same bar beside them.
 */
export function CatalogueToolbar({
  state,
  config,
  facets,
  shown,
  total,
  all,
  page,
  className,
  ...rest
}: {
  state: CatalogueState;
  config: CatalogueConfig;
  facets: Facet[];
  /** The number of the last row on screen. */
  shown: number;
  /** How many rows match right now. */
  total: number;
  /** How many rows the list holds with nothing narrowing it. */
  all: number;
  page: number;
  className?: string;
} & Omit<React.ComponentProps<'div'>, 'children'>) {
  const filtered = isFiltered(state);
  return (
    <div data-slot="catalogue-toolbar" className={cn('flex flex-col gap-3', className)} {...rest}>
      <div data-slot="catalogue-controls" className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <CatalogueSearch state={state} config={config} />
        <div data-slot="catalogue-actions" className="flex items-center gap-2">
          <CatalogueFacets facets={facets} state={state} config={config} />
          <SortMenu state={state} config={config} />
          <ViewToggle state={state} config={config} className="ml-auto sm:ml-0" />
          {/*
            One key that clears the search and every facet, and stays in the
            section. Skin zero says as much with its chips and their "Clear
            all", so there it stays hidden; a design with a bare bar of keys
            shows it.
          */}
          <Link
            data-control="reset"
            href={catalogueHref(config, state, { ...clearedState(), type: state.type })}
            scroll={false}
            aria-label="Reset all filters"
            className="hidden"
          >
            <RefreshCwIcon aria-hidden />
          </Link>
        </div>
      </div>

      <ActiveFilters state={state} config={config} />

      <p
        data-slot="catalogue-count"
        data-shown={shown}
        data-total={total}
        data-all={all}
        data-complete={shown >= total ? '' : undefined}
        className="text-sm text-muted-foreground tabular-nums"
        aria-live="polite"
      >
        {countLabel(total, page, config)}
        {filtered && total !== all ? (
          <span className="text-muted-foreground/70"> · {formatCount(all)} in all</span>
        ) : null}
      </p>
    </div>
  );
}

/**
 * The rows themselves, drawn the way the visitor asked for. The first,
 * unsearched page of a list that has sections is grouped by them; a search
 * or another order flattens it, because then the order is the answer.
 */
function CatalogueResults({
  entries,
  state,
  config,
  showType,
  headingLevel,
}: {
  entries: CatalogueEntry[];
  state: CatalogueState;
  config: CatalogueConfig;
  showType: boolean;
  headingLevel: HeadingLevel;
}) {
  if (state.view === 'table') {
    return (
      <CatalogueTable
        entries={entries}
        showType={showType}
        caption={`${config.nounPlural} in this list`}
        state={state}
        config={config}
      />
    );
  }
  if (state.view === 'wall') {
    return <GalleryWall entries={entries} />;
  }

  const density = state.view;
  const grouped =
    config.groupBy &&
    state.page === 1 &&
    !state.q &&
    state.sort === config.defaultSort &&
    (config.groupBy !== 'type' || state.type === null);

  if (!grouped) {
    return (
      <CatalogueGrid entries={entries} density={density} showType={showType} markFeatured={config.markFeatured} />
    );
  }

  const Heading = `h${headingLevel}` as const;
  return (
    <div data-slot="catalogue-groups" className="flex flex-col gap-10">
      {groupEntries(entries, config.groupBy ?? 'type').map(group => (
        <section key={group.id} data-slot="catalogue-group" aria-labelledby={`group-${group.id}`} className="flex flex-col gap-4">
          <Heading id={`group-${group.id}`} className="text-lg font-semibold tracking-tight">
            {group.label}
            <span className="ml-2 text-sm font-normal text-muted-foreground tabular-nums">{group.entries.length}</span>
          </Heading>
          <CatalogueGrid entries={group.entries} density={density} showType={group.mixed} markFeatured={config.markFeatured} />
        </section>
      ))}
    </div>
  );
}

function CatalogueGrid({
  entries,
  density,
  showType,
  markFeatured = false,
}: {
  entries: CatalogueEntry[];
  density: 'grid' | 'dense' | 'sheet';
  showType: boolean;
  markFeatured?: boolean;
}) {
  return (
    <ul data-slot="catalogue-grid" data-view={density} className={VIEW_GRID_CLASS[density]}>
      {entries.map((entry, index) => (
        <li
          key={entry.key}
          data-width={entry.media?.width ?? undefined}
          data-height={entry.media?.height ?? undefined}
          className="min-w-0"
        >
          <CatalogueCard
            entry={entry}
            density={density}
            sizes={VIEW_GRID_SIZES[density]}
            priority={index < 4}
            showType={showType}
            markFeatured={markFeatured}
          />
        </li>
      ))}
    </ul>
  );
}

/**
 * Two different nothings: a list with no records in it yet says what would
 * appear there, and a filter that matches nothing offers a way back.
 */
function CatalogueEmpty({
  state,
  config,
  everythingEmpty,
}: {
  state: CatalogueState;
  config: CatalogueConfig;
  everythingEmpty: boolean;
}) {
  if (everythingEmpty) {
    return (
      <Empty className={EMPTY_BLOCK_CLASS}>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ImagesIcon />
          </EmptyMedia>
          <EmptyTitle>{config.empty.title}</EmptyTitle>
          <EmptyDescription>{config.empty.description}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <Empty className={EMPTY_BLOCK_CLASS}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchXIcon />
        </EmptyMedia>
        <EmptyTitle>Nothing matches</EmptyTitle>
        <EmptyDescription>
          {state.q
            ? `No ${config.nounPlural.toLowerCase()} match "${state.q}" with these filters.`
            : `No ${config.nounPlural.toLowerCase()} match these filters.`}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={catalogueHref(config, state, clearedState())} scroll={false} />}
        >
          Clear the filters
        </Button>
      </EmptyContent>
    </Empty>
  );
}

/** The list while it loads: the toolbar, then a page of tiles or rows. */
export function CatalogueBrowserSkeleton({
  view = 'grid',
  count = PAGE_SIZE,
  className,
}: {
  view?: 'grid' | 'dense' | 'sheet' | 'table';
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-6', className)} role="status" aria-label="Loading the catalogue">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="h-8 min-w-0 flex-1 rounded-lg bg-muted sm:max-w-80" />
          <div className="h-8 w-24 rounded-lg bg-muted" />
          <div className="h-8 w-28 rounded-lg bg-muted" />
          <div className="ml-auto h-8 w-32 rounded-lg bg-muted" />
        </div>
        <div className="h-5 w-40 rounded-md bg-muted" />
      </div>
      {view === 'table' ? (
        <CatalogueTableSkeleton />
      ) : (
        <div className={VIEW_GRID_CLASS[view]}>
          {Array.from({ length: count }, (_, index) => (
            <CatalogueCardSkeleton key={index} density={view} />
          ))}
        </div>
      )}
    </div>
  );
}
