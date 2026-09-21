import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';

import type { HeadingLevel } from '@/components/raisonne/shell/heading';
import { PageHeader } from '@/components/raisonne/shell/page';
import { ShareButton } from '@/components/raisonne/shell/share-button';
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
import type { Series } from '@/lib/types';
import { cn } from '@/lib/utils';

import { plural, seriesHref, SERIES_HERO_CLASS, seriesTitle } from './lib';
import { MediaStill } from './media-still';

/**
 * The top of a series essay on its own page: the cover, where the essay sits
 * in the catalogue, and the way back to the works it is about.
 */
export function SeriesHero({
  series,
  parent = null,
  workCount,
  headingLevel = 1,
  className,
}: {
  series: Series;
  parent?: Series | null;
  /** Works in the family, for the line back to the series. */
  workCount?: number;
  headingLevel?: HeadingLevel;
  className?: string;
}) {
  const title = seriesTitle(series);

  return (
    <div data-slot="series-hero" className={cn('flex flex-col gap-6 pt-6', className)}>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/works" />}>Works</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          {parent ? (
            <>
              <BreadcrumbItem className="min-w-0 max-sm:hidden">
                <BreadcrumbLink render={<Link href={seriesHref(parent)} />} className="truncate">
                  {seriesTitle(parent)}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="max-sm:hidden" />
            </>
          ) : null}
          <BreadcrumbItem className="min-w-0">
            <BreadcrumbLink render={<Link href={seriesHref(series)} />} className="truncate">
              {title}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>About</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {series.cover?.still ? (
        <MediaStill
          media={series.cover}
          alt=""
          fit="cover"
          priority
          sizes="(min-width: 1280px) 1200px, 100vw"
          className={SERIES_HERO_CLASS}
        />
      ) : null}

      <PageHeader
        className="py-0 md:py-0"
        headingLevel={headingLevel}
        eyebrow="About the series"
        title={<span className="break-words hyphens-auto">{title}</span>}
        description={series.description ? <p className="whitespace-pre-line">{series.description}</p> : undefined}
        actionsBelow
        actions={
          <>
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href={seriesHref(series)} />}>
              <ArrowLeftIcon aria-hidden data-icon="inline-start" />
              {workCount ? `View the ${plural(workCount, 'work')}` : 'Back to the series'}
            </Button>
            <ShareButton title={title} size="sm" />
          </>
        }
      />
    </div>
  );
}

export function SeriesHeroSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-6 pt-6', className)} role="status" aria-label="Loading the series essay">
      <Skeleton className="h-4 w-56" />
      <Skeleton className="aspect-[16/9] max-h-[min(60svh,34rem)] w-full max-w-[96rem] rounded-lg sm:aspect-[5/2]" />
      <div className="flex max-w-prose flex-col gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-5 w-full" />
      </div>
    </div>
  );
}
