import Link from 'next/link';
import { SlidersHorizontalIcon, XIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

import {
  activeFilters,
  catalogueHref,
  clearedState,
  isFiltered,
  toggleFacetValue,
  type CatalogueConfig,
  type CatalogueState,
  type Facet,
  type StateChange,
} from './lib';

/**
 * The facets a list offers: medium, year, chain, platform, type and kind,
 * each value a link, each group with its own reset.
 *
 * Every option carries the number of records it would leave, counted against
 * the other filters in force, so a visitor never picks a combination that
 * empties the page. A facet with a single value is not shown at all: a
 * filter that cannot narrow anything is furniture.
 */
export function CatalogueFacets({
  facets,
  state,
  config,
  className,
}: {
  facets: Facet[];
  state: CatalogueState;
  config: CatalogueConfig;
  className?: string;
}) {
  // Nothing to narrow by: no key. The empty place is kept for a design whose
  // bar always shows the same keys; skin zero leaves it hidden.
  if (facets.length === 0) return <span data-control="filters" data-empty="" aria-hidden className="hidden" />;
  const active = facets.reduce((sum, facet) => sum + facet.activeCount, 0);

  return (
    <Popover>
      <PopoverTrigger
        render={<Button variant="outline" size="sm" className={className} data-control="filters" aria-label="Filters" />}
      >
        <SlidersHorizontalIcon aria-hidden data-icon="inline-start" />
        <span>Filters</span>
        {active > 0 ? (
          <Badge variant="secondary" className="tabular-nums">
            {active}
          </Badge>
        ) : null}
      </PopoverTrigger>
      {/*
        The panel is a fixed shell around one scrolling list: the reset row
        sits on a border below it, so a list that continues past the fold
        reads as a list that scrolls rather than as a panel that was cut off.
        A stronger ring than the shared popover's own is needed in dark mode,
        where a faint edge over a grid of works disappears.
      */}
      <PopoverContent
        align="end"
        className="w-80 max-w-[calc(100vw-2rem)] gap-0 p-0 shadow-lg ring-border"
        data-catalogue-facets={config.basePath}
      >
        <div data-slot="catalogue-facets-list" className="flex max-h-[min(65svh,28rem)] flex-col gap-4 overflow-y-auto overscroll-contain p-3 [scrollbar-gutter:stable]">
          {facets.map((facet, index) => (
            <div key={facet.id} data-slot="catalogue-facet" data-facet={facet.id} className="flex flex-col gap-2">
              {index > 0 ? <Separator className="-mt-2 mb-1" /> : null}
              <div data-slot="catalogue-facet-head" className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-medium text-muted-foreground">{facet.label}</h3>
                {facet.activeCount > 0 ? (
                  <Link
                    data-slot="catalogue-facet-reset"
                    href={catalogueHref(config, state, resetFacet(facet))}
                    scroll={false}
                    className="rounded-sm text-xs text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    Reset
                  </Link>
                ) : null}
              </div>
              <ul data-slot="catalogue-facet-values" className="flex flex-wrap gap-1.5">
                {facet.values.map(value => (
                  <li key={value.value}>
                    <Link
                      data-slot="catalogue-facet-value"
                      href={catalogueHref(config, state, toggleFacetValue(state, facet.id, value.value))}
                      scroll={false}
                      aria-current={value.selected ? 'true' : undefined}
                      className={cn(
                        'inline-flex h-7 items-center gap-1.5 rounded-lg border px-2 text-sm transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50',
                        value.selected
                          ? 'border-transparent bg-secondary text-secondary-foreground'
                          : 'border-border text-foreground',
                        value.count === 0 && !value.selected && 'opacity-50',
                      )}
                    >
                      {value.label}
                      <span data-slot="catalogue-facet-count" className="text-xs text-muted-foreground tabular-nums">{value.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {isFiltered(state) ? (
          <div data-slot="catalogue-facets-clear" className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              className="w-full justify-start"
              render={<Link href={catalogueHref(config, state, clearedState())} scroll={false} />}
            >
              Clear all filters
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

/** Empties one facet, leaving the others as they are. */
function resetFacet(facet: Facet): StateChange {
  switch (facet.id) {
    case 'type':
      return { type: null };
    case 'kind':
      return { kind: [] };
    case 'chain':
      return { chain: [] };
    case 'year':
      return { year: [] };
    case 'medium':
      return { medium: [] };
    case 'platform':
      return { platform: [] };
    default:
      return {};
  }
}

/**
 * What is narrowing the list right now, each chip a link that takes that one
 * filter off. Shown under the controls so a visitor can always see, and
 * undo, why a list is short.
 */
export function ActiveFilters({
  state,
  config,
  className,
}: {
  state: CatalogueState;
  config: CatalogueConfig;
  className?: string;
}) {
  const chips = activeFilters(state, config);
  if (chips.length === 0) return null;

  return (
    <div data-slot="active-filters" className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <span className="sr-only">Filters in force</span>
      {chips.map(chip => (
        <Link
          key={chip.id}
          data-slot="active-filter"
          href={chip.href}
          scroll={false}
          className="inline-flex h-7 items-center gap-1 rounded-lg bg-muted px-2 text-sm transition-colors outline-none hover:bg-muted/70 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="text-muted-foreground">{chip.label}</span>
          <span className="max-w-40 truncate">{chip.value}</span>
          <XIcon aria-hidden className="size-3 text-muted-foreground" />
          <span className="sr-only">Remove this filter</span>
        </Link>
      ))}
      {chips.length > 1 ? (
        <Link
          data-slot="active-filters-clear"
          href={catalogueHref(config, state, clearedState())}
          scroll={false}
          className="ml-1 rounded-sm text-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Clear all
        </Link>
      ) : null}
    </div>
  );
}
