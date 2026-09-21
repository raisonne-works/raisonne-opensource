import type { ReactNode } from 'react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { formatNumber } from '@/lib/money';
import { cn } from '@/lib/utils';

import type { ActivityEventType } from '@/lib/types';

import { ACTIVITY_PAGE_SIZE, EVENT_LABELS, EVENT_TYPES, activityHref, type ActivityQuery } from './lib';

export interface SeriesOption {
  slug: string;
  title: string;
  events: number;
}

/**
 * The feed's filters, as links.
 *
 * The whole state of this page is its URL, so a filtered feed can be shared,
 * bookmarked, opened in a new tab and cited in a footnote. That rules out a
 * dropdown holding state in the browser, and it is why the counts are next to
 * each choice: a filter that leads to an empty page should say so before it
 * is pressed.
 */
export function ActivityFilters({
  query,
  counts,
  series,
  className,
}: {
  query: ActivityQuery;
  counts: Record<ActivityEventType | 'all', number>;
  series: SeriesOption[];
  className?: string;
}) {
  // A kind with nothing in it is left out rather than offered and then
  // answered with an empty page. The one exception is the kind already
  // chosen, which has to stay visible so it can be turned off again.
  const types: (ActivityEventType | 'all')[] = [
    'all',
    ...EVENT_TYPES.filter(type => counts[type] > 0 || query.type === type),
  ];

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <FilterRow label="Event">
        {types.map(type => (
          <FilterChip
            key={type}
            href={activityHref({ type: type === 'all' ? 'all' : type, series: query.series })}
            active={query.type === type}
            count={counts[type]}
          >
            {type === 'all' ? 'Everything' : EVENT_LABELS[type]}
          </FilterChip>
        ))}
      </FilterRow>

      {series.length > 1 ? (
        <FilterRow label="Series">
          <FilterChip href={activityHref({ type: query.type })} active={query.series === null}>
            Every series
          </FilterChip>
          {series.map(option => (
            <FilterChip
              key={option.slug}
              href={activityHref({ type: query.type, series: option.slug })}
              active={query.series === option.slug}
              count={option.events}
            >
              {option.title}
            </FilterChip>
          ))}
        </FilterRow>
      ) : null}
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-muted-foreground uppercase">{label}</p>
      <ul aria-label={`Filter by ${label.toLowerCase()}`} className="flex flex-wrap items-center gap-2">
        {children}
      </ul>
    </div>
  );
}

function FilterChip({
  href,
  active,
  count,
  children,
}: {
  href: string;
  active: boolean;
  count?: number;
  children: ReactNode;
}) {
  return (
    <li>
      <Badge
        variant={active ? 'default' : 'outline'}
        className="h-7 px-3"
        render={<Link href={href} aria-current={active ? 'true' : undefined} />}
      >
        {children}
        {typeof count === 'number' ? (
          <span className={cn('tabular-nums', active ? 'opacity-70' : 'text-muted-foreground')}>
            {formatNumber(count)}
          </span>
        ) : null}
      </Badge>
    </li>
  );
}

/** Pages of the feed, each its own URL, so a position in a long history is a place. */
export function ActivityPagination({ query, total }: { query: ActivityQuery; total: number }) {
  const pages = Math.max(1, Math.ceil(total / ACTIVITY_PAGE_SIZE));
  if (pages <= 1) return null;

  const page = Math.min(query.page, pages);
  const numbers = pageWindow(page, pages);

  return (
    <Pagination className="justify-start" aria-label="Activity pages">
      <PaginationContent>
        <PaginationItem>
          {page > 1 ? (
            <PaginationPrevious href={activityHref({ ...query, page: page - 1 })} />
          ) : (
            <PaginationPrevious aria-disabled className="pointer-events-none opacity-50" />
          )}
        </PaginationItem>
        {numbers.map((value, index) =>
          value === 'gap' ? (
            <PaginationItem key={`gap-${index}`}>
              <span aria-hidden className="px-2 text-sm text-muted-foreground">
                ...
              </span>
            </PaginationItem>
          ) : (
            <PaginationItem key={value}>
              <PaginationLink
                isActive={value === page}
                aria-label={`Page ${value} of ${pages}`}
                href={activityHref({ ...query, page: value })}
              >
                {value}
              </PaginationLink>
            </PaginationItem>
          ),
        )}
        <PaginationItem>
          {page < pages ? (
            <PaginationNext href={activityHref({ ...query, page: page + 1 })} />
          ) : (
            <PaginationNext aria-disabled className="pointer-events-none opacity-50" />
          )}
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

/** The first page, the last, and a window around the current one. */
function pageWindow(page: number, pages: number): (number | 'gap')[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, index) => index + 1);
  const around = [page - 1, page, page + 1].filter(value => value > 1 && value < pages);
  const shown = [1, ...around, pages];
  const out: (number | 'gap')[] = [];
  let previous = 0;
  for (const value of shown) {
    if (value - previous > 1) out.push('gap');
    out.push(value);
    previous = value;
  }
  return out;
}
