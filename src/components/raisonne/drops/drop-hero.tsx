import Image from 'next/image';
import Link from 'next/link';
import { ExternalLinkIcon } from 'lucide-react';

import type { HeadingLevel } from '@/components/raisonne/shell/heading';
import { PageHeader } from '@/components/raisonne/shell/page';
import { ShareButton } from '@/components/raisonne/shell/share-button';
import { MEDIA_FRAME_CLASS, marketLabel, seriesHref, seriesTitle } from '@/components/raisonne/works/lib';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Drop, Series } from '@/lib/types';
import { cn } from '@/lib/utils';

import { AddToCalendar } from './add-to-calendar';
import { DropCountdown } from './countdown';
import { NotifyDialog } from './notify-dialog';

/**
 * The top of a drop page: what is being released, when it opens, and the two
 * things a visitor can do about it, mint it or be told when it opens.
 *
 * The state and the clock are worked out in the browser from the dates, so a
 * page that was built last week still says "open now" on the day.
 */
export function DropHero({
  drop,
  series = null,
  now,
  headingLevel = 1,
  className,
}: {
  drop: Drop;
  series?: Series | null;
  /** The time the page was rendered. */
  now: number;
  headingLevel?: HeadingLevel;
  className?: string;
}) {
  const cover = drop.cover;
  // A hand-written fixture can leave a list out; a page should not crash over it.
  const tags = drop.tags ?? [];

  return (
    <div data-slot="drop-hero" className={cn('flex flex-col gap-6 pt-6', className)}>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/works" />}>Works</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          {series ? (
            <>
              <BreadcrumbItem className="min-w-0 max-sm:hidden">
                <BreadcrumbLink render={<Link href={seriesHref(series)} />} className="truncate">
                  {seriesTitle(series)}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="max-sm:hidden" />
            </>
          ) : null}
          <BreadcrumbItem className="min-w-0">
            <BreadcrumbPage className="truncate">{drop.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {cover ? (
        <figure className="flex flex-col gap-2">
          <div
            className={cn(
              'relative aspect-[3/1] max-h-[50svh] w-full overflow-hidden rounded-lg max-sm:aspect-[16/9]',
              MEDIA_FRAME_CLASS,
            )}
          >
            <Image
              src={cover.src}
              alt={cover.alt ?? ''}
              fill
              priority
              sizes="(min-width: 1280px) 1200px, 100vw"
              className="object-cover"
            />
          </div>
          {cover.caption ? (
            <figcaption className="text-xs text-muted-foreground text-pretty">{cover.caption}</figcaption>
          ) : null}
        </figure>
      ) : null}

      <PageHeader
        className="py-0 md:py-0"
        headingLevel={headingLevel}
        eyebrow={drop.kind ?? 'Drop'}
        title={<span className="break-words hyphens-auto">{drop.title}</span>}
        description={
          drop.subtitle || drop.description ? (
            <div className="flex flex-col gap-2">
              {drop.subtitle ? <p>{drop.subtitle}</p> : null}
              {drop.description ? <p className="text-base whitespace-pre-line">{drop.description}</p> : null}
            </div>
          ) : undefined
        }
      />

      {tags.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
          {tags.map(tag => (
            <li key={tag}>
              <Badge variant="outline" className="font-normal">
                {tag}
              </Badge>
            </li>
          ))}
        </ul>
      ) : null}

      <DropCountdown drop={drop} now={now} />

      <div className="flex flex-wrap items-center gap-2">
        {drop.mintUrl ? (
          <Button nativeButton={false} render={<a href={drop.mintUrl} target="_blank" rel="noopener noreferrer" />}>
            Go to the mint
            <ExternalLinkIcon aria-hidden data-icon="inline-end" />
            <span className="sr-only">(opens in a new tab)</span>
          </Button>
        ) : null}
        {drop.notify ? (
          <NotifyDialog
            slug={drop.slug}
            title={drop.title}
            variant={drop.mintUrl ? 'outline' : 'default'}
            description={drop.startsAt ? null : 'The date is not set yet. One email when it is, and nothing else.'}
          />
        ) : null}
        <AddToCalendar
          title={drop.title}
          description={drop.description}
          startsAt={drop.startsAt}
          endsAt={drop.endsAt}
          slug={drop.slug}
        />
        {drop.marketUrl ? (
          <Button
            variant="outline"
            nativeButton={false}
            render={<a href={drop.marketUrl} target="_blank" rel="noopener noreferrer" />}
          >
            View on {marketLabel(drop.marketUrl, drop.platform)}
            <ExternalLinkIcon aria-hidden data-icon="inline-end" />
            <span className="sr-only">(opens in a new tab)</span>
          </Button>
        ) : null}
        <ShareButton title={drop.title} text={drop.subtitle ?? undefined} variant="ghost" />
      </div>
    </div>
  );
}

export function DropHeroSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-6 pt-6', className)} role="status" aria-label="Loading the drop">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="aspect-[3/1] max-h-[50svh] w-full rounded-lg max-sm:aspect-[16/9]" />
      <div className="flex max-w-prose flex-col gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-5 w-full" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-16 w-16 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
