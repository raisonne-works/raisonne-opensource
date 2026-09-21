import Link from 'next/link';

import { ExhibitionKindBadge } from '@/components/raisonne/profile/exhibition-list';
import { ExternalLink } from '@/components/raisonne/profile/external-link';
import {
  EXHIBITION_KIND_LABEL,
  EXHIBITION_KIND_ORDER,
  exhibitionPlace,
  sortByYearDesc,
} from '@/components/raisonne/profile/format';
import type { HeadingLevel } from '@/components/raisonne/shell/heading';
import { formatDate, formatMonth, plural } from '@/components/raisonne/works/lib';
import { recordHref } from '@/lib/records';
import type { Exhibition } from '@/lib/types';
import { cn } from '@/lib/utils';

import { CatalogueCard } from './catalogue-card';
import { exhibitionEntry } from './entry';

/**
 * Two ways of reading the same shows.
 *
 * `FeaturedExhibitions` is the handful the artist chose to lead with, as
 * cards, because a show is a place and a date and a photograph before it is
 * a row. `ExhibitionHistory` is the whole record grouped by kind, the list a
 * curator or a writer scans, and the one that prints.
 */

/** "11 Apr to 8 Jun 2025", or the year when only that is known. */
export function exhibitionDates(exhibition: Exhibition): string | null {
  const start = exhibition.startDate ?? null;
  const end = exhibition.endDate ?? null;
  if (!start && !end) return String(exhibition.year);
  if (start && end) {
    const sameYear = start.slice(0, 4) === end.slice(0, 4);
    const opens = sameYear ? formatMonth(start, { withYear: false }) : formatDate(start);
    const openDay = new Date(start).getUTCDate();
    return `${sameYear ? `${openDay} ${opens}` : opens} to ${formatDate(end)}`;
  }
  return formatDate(start ?? end);
}

export function FeaturedExhibitions({
  exhibitions,
  limit = 3,
  className,
}: {
  exhibitions: Exhibition[];
  limit?: number;
  className?: string;
}) {
  const featured = sortByYearDesc(exhibitions.filter(show => show.featured)).slice(0, limit);
  if (featured.length === 0) return null;

  return (
    <ul className={cn('grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {featured.map((show, index) => {
        const entry = exhibitionEntry(show);
        return (
          <li key={show.id} className="min-w-0">
            <CatalogueCard
              entry={{ ...entry, meta: [exhibitionDates(show), entry.subtitle].filter(Boolean) as string[] }}
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              priority={index === 0}
            />
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Every show, solo first, then group, then the rest, each group with its
 * count. Kinds with nothing in them are left out rather than printed empty.
 */
export function ExhibitionHistory({
  exhibitions,
  headingLevel = 2,
  className,
}: {
  exhibitions: Exhibition[];
  headingLevel?: HeadingLevel;
  className?: string;
}) {
  const Heading = `h${headingLevel}` as const;
  const groups = EXHIBITION_KIND_ORDER.map(kind => ({
    kind,
    label: EXHIBITION_KIND_LABEL[kind],
    shows: sortByYearDesc(exhibitions.filter(show => show.kind === kind)),
  })).filter(group => group.shows.length > 0);

  if (groups.length === 0) return null;

  return (
    <div className={cn('flex flex-col gap-10', className)}>
      {groups.map(group => (
        <section key={group.kind} aria-labelledby={`history-${group.kind}`} className="flex flex-col gap-3">
          <Heading id={`history-${group.kind}`} className="text-lg font-semibold tracking-tight">
            {group.label}
            <span className="ml-2 text-sm font-normal text-muted-foreground tabular-nums">
              {plural(group.shows.length, 'show')}
            </span>
          </Heading>
          <ol className="divide-y divide-border border-y border-border">
            {group.shows.map(show => (
              <HistoryRow key={show.id} exhibition={show} />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

/**
 * One show as a row: year, title, where it was, what kind it was.
 *
 * The CV's row links out to the venue, which is right on a CV. Here the
 * title goes to the show's own page whenever the catalogue holds one, and
 * only falls back to the venue's site when it does not.
 */
function HistoryRow({ exhibition }: { exhibition: Exhibition }) {
  const place = exhibitionPlace(exhibition);
  const href = exhibition.slug ? recordHref({ type: 'exhibition', key: exhibition.slug }) : null;
  const dates = exhibitionDates(exhibition);

  return (
    <li className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-4 gap-y-1.5 py-3 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto]">
      <span className="font-mono text-sm leading-6 text-muted-foreground tabular-nums">{exhibition.year}</span>
      <div className="min-w-0">
        <p className="leading-6 font-medium text-pretty">
          {href ? (
            <Link
              href={href}
              className="rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {exhibition.title}
            </Link>
          ) : (
            <ExternalLink href={exhibition.url}>{exhibition.title}</ExternalLink>
          )}
        </p>
        {place || dates ? (
          <p className="text-sm text-pretty text-muted-foreground">
            {[place, dates].filter(Boolean).join(' · ')}
          </p>
        ) : null}
      </div>
      <div className="col-start-2 sm:col-start-3 sm:row-start-1 sm:pt-0.5">
        <ExhibitionKindBadge kind={exhibition.kind} />
      </div>
    </li>
  );
}
