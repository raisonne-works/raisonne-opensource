import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

import { MediaStill } from '@/components/raisonne/works/media-still';
import { type HeadingLevel, nextHeadingLevel } from '@/components/raisonne/shell/heading';
import { formatDate } from '@/components/raisonne/works/lib';
import { Badge } from '@/components/ui/badge';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Skeleton } from '@/components/ui/skeleton';
import { type DateStatus, eventStatus } from '@/lib/records';
import type { Announcement, SiteEvent } from '@/lib/types';
import { cn } from '@/lib/utils';

import { isInternalHref, assetMedia } from './lib';

/**
 * What is happening now: what the artist has announced, and where the work
 * can be seen.
 *
 * An event's status is worked out from its dates every time the page is
 * built, never stored, so a show that closed in April cannot still read
 * "upcoming" because nobody edited the record.
 */

const STATUS_LABEL: Record<DateStatus, string | null> = {
  upcoming: 'Upcoming',
  current: 'On now',
  past: 'Past',
  unknown: null,
};

/** Current first, then what is coming, then what has been. */
const STATUS_ORDER: Record<DateStatus, number> = { current: 0, upcoming: 1, unknown: 2, past: 3 };

export function sortEvents(events: readonly SiteEvent[], now: number = Date.now()): SiteEvent[] {
  return [...events].sort((a, b) => {
    const order = STATUS_ORDER[eventStatus(a, now)] - STATUS_ORDER[eventStatus(b, now)];
    if (order !== 0) return order;
    const left = a.startDate ? Date.parse(a.startDate) : Number.MAX_SAFE_INTEGER;
    const right = b.startDate ? Date.parse(b.startDate) : Number.MAX_SAFE_INTEGER;
    return left - right;
  });
}

export function sortAnnouncements(announcements: readonly Announcement[]): Announcement[] {
  return [...announcements].sort((a, b) => {
    const left = a.date ? Date.parse(a.date) : 0;
    const right = b.date ? Date.parse(b.date) : 0;
    return right - left;
  });
}

/** "24 to 25 Oct 2026", or one date, or nothing. */
function eventDates(event: SiteEvent): string | null {
  const start = formatDate(event.startDate);
  const end = formatDate(event.endDate);
  if (start && end && start !== end) return `${start} to ${end}`;
  return start ?? end;
}

const TITLE_CLASS =
  'rounded-sm font-medium text-pretty underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50';

/**
 * The row's title: a link when the record has somewhere to go, and, when it
 * has a picture, the trigger for a preview that opens on hover and on focus
 * alike. The picture is never the only way to read the row, and it is not
 * fetched until the card opens.
 */
function NewsTitle({ title, href, image }: { title: string; href: string | null; image: Announcement['image'] }) {
  const external = href !== null && !isInternalHref(href);
  const label: ReactNode = external ? (
    <>
      {title}
      <ArrowUpRight aria-hidden className="size-3.5 shrink-0 translate-y-0.5" />
      <span className="sr-only"> (opens in a new tab)</span>
    </>
  ) : (
    title
  );

  if (!image) {
    if (href === null) return <span className="font-medium text-pretty">{label}</span>;
    return external ? (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(TITLE_CLASS, 'inline-flex items-baseline gap-1')}
      >
        {label}
      </a>
    ) : (
      <Link href={href} className={TITLE_CLASS}>
        {label}
      </Link>
    );
  }

  const trigger =
    href === null ? (
      <span className="font-medium text-pretty" />
    ) : external ? (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(TITLE_CLASS, 'inline-flex items-baseline gap-1')}
      />
    ) : (
      <Link href={href} className={TITLE_CLASS} />
    );

  return (
    <HoverCard>
      <HoverCardTrigger render={trigger}>{label}</HoverCardTrigger>
      <HoverCardContent side="top" className="w-64">
        <MediaStill
          media={assetMedia(image)}
          alt={image.alt ?? title}
          sizes="256px"
          fit="cover"
          className="aspect-[4/3]"
        />
      </HoverCardContent>
    </HoverCard>
  );
}

/**
 * Announcements and dates, side by side. Either list can be empty; both
 * empty and the section is not rendered at all (see /).
 */
export function News({
  announcements,
  events,
  headingLevel = 3,
  limit = 3,
  now,
  className,
}: {
  announcements: Announcement[];
  events: SiteEvent[];
  headingLevel?: HeadingLevel;
  limit?: number;
  /** Fixed "now" for a stable render; defaults to build time. */
  now?: number;
  className?: string;
}) {
  const Heading = `h${headingLevel}` as const;
  const itemLevel = nextHeadingLevel(headingLevel);
  const ItemHeading = `h${itemLevel}` as const;
  const news = sortAnnouncements(announcements).slice(0, limit);
  const dates = sortEvents(events, now).slice(0, limit);

  if (news.length === 0 && dates.length === 0) return <NewsEmpty className={className} />;

  return (
    <div data-slot="news" className={cn('grid gap-10 lg:grid-cols-2 lg:gap-16', className)}>
      {news.length > 0 ? (
        <section aria-labelledby="news-announcements" className="flex flex-col gap-4">
          <Heading id="news-announcements" className="text-lg font-semibold tracking-tight">
            Announcements
          </Heading>
          <ul className="flex flex-col divide-y divide-border">
            {news.map(item => (
              <li key={item.id} data-slot="news-item" className="flex flex-col gap-1 py-4 first:pt-0">
                {item.date ? (
                  <time dateTime={item.date} className="text-xs text-muted-foreground tabular-nums">
                    {formatDate(item.date)}
                  </time>
                ) : null}
                <ItemHeading className="text-base">
                  <NewsTitle title={item.title} href={item.url} image={item.image} />
                </ItemHeading>
                {item.description ? (
                  <p className="max-w-[40rem] text-sm text-pretty text-muted-foreground">{item.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {dates.length > 0 ? (
        <section aria-labelledby="news-events" className="flex flex-col gap-4">
          <Heading id="news-events" className="text-lg font-semibold tracking-tight">
            Where to see the work
          </Heading>
          <ul className="flex flex-col divide-y divide-border">
            {dates.map(event => {
              const status = eventStatus(event, now);
              const label = STATUS_LABEL[status];
              const when = eventDates(event);
              return (
                <li
                  key={event.id}
                  data-slot="news-item"
                  data-status={status}
                  data-stated={event.statedStatus ? '' : undefined}
                  className="flex flex-col gap-1 py-4 first:pt-0"
                >
                  <span data-slot="news-when" className="flex flex-wrap items-center gap-2">
                    {label ? (
                      <Badge variant={status === 'current' ? 'default' : 'outline'} className="shrink-0">
                        {label}
                      </Badge>
                    ) : null}
                    {when ? <span className="text-xs text-muted-foreground tabular-nums">{when}</span> : null}
                  </span>
                  <ItemHeading className="text-base">
                    <NewsTitle title={event.title} href={event.url} image={event.image} />
                    {/* For a design that sets the status beside the title; the badge above says it here. */}
                    {event.statedStatus || label ? (
                      <span aria-hidden data-slot="news-status" className="hidden">
                        {event.statedStatus || label}
                      </span>
                    ) : null}
                  </ItemHeading>
                  {event.location ? (
                    <p data-slot="news-place" className="text-sm text-muted-foreground">
                      {event.location}
                    </p>
                  ) : null}
                  {event.description ? (
                    <p className="max-w-[40rem] text-sm text-pretty text-muted-foreground">{event.description}</p>
                  ) : null}
                  {/* The date and the place on one line, for a design that ends the row with them. */}
                  {when || event.location ? (
                    <p aria-hidden data-slot="news-meta" className="hidden">
                      {when ? <span>{when}</span> : null}
                      {event.location ? <span>{event.location}</span> : null}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export function NewsEmpty({ className }: { className?: string }) {
  return (
    <Empty className={className}>
      <EmptyHeader>
        <EmptyTitle>Nothing announced</EmptyTitle>
        <EmptyDescription>
          News and dates appear here as soon as there are any. The catalogue below is always up to date.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function NewsSkeleton({ className }: { className?: string }) {
  return (
    <div role="status" className={cn('grid gap-10 lg:grid-cols-2 lg:gap-16', className)}>
      <span className="sr-only">Loading the news</span>
      {Array.from({ length: 2 }, (_, column) => (
        <div key={column} aria-hidden className="flex flex-col gap-4">
          <Skeleton className="h-6 w-40" />
          {Array.from({ length: 3 }, (_, row) => (
            <div key={row} className="flex flex-col gap-2 py-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-64 max-w-full" />
              <Skeleton className="h-4 w-48 max-w-full" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
