import Link from 'next/link';
import { ExternalLinkIcon, UsersIcon } from 'lucide-react';

import { type HeadingLevel, nextHeadingLevel } from '@/components/raisonne/shell/heading';
import { READING_CLASS } from '@/components/raisonne/shell/measure';
import { ShareButton } from '@/components/raisonne/shell/share-button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { DEFAULT_WORKS_LABEL } from '@/lib/records';
import type { Series, Work } from '@/lib/types';
import { cn } from '@/lib/utils';

import {
  WORK_STAGE_CLASS,
  CO_AUTHORED_COPY,
  MEDIA_KIND_LABELS,
  SERIES_KIND_DESCRIPTIONS,
  SERIES_KIND_LABELS,
  hostOf,
  isOneOfOne,
  marketLabel,
  seriesHref,
  seriesTitle,
  workTitle,
} from './lib';
import { ProvenanceList } from './provenance-list';
import { WorkAttributes } from './work-attributes';
import { WorkFacts } from './work-facts';
import { WorkMedia } from './work-media';
import { WorkTags } from './work-tags';

/**
 * A single work: the media as large as the screen allows, then the record a
 * catalogue raisonne keeps (what it is, where it lives on-chain, and how it
 * is attributed). From 1280 px the record sits beside the media; below that
 * it follows it, capped at a readable measure. The media stays in view while
 * the record scrolls, because the art is what the page is about.
 *
 * Titles are printed as the artist wants them read: a short display title
 * where the token's own name is a machine name, with the full name kept in
 * the record underneath. Long names wrap rather than overflow.
 */
export function WorkDetail({
  work,
  series,
  parent = null,
  liveHtml = false,
  showOwner = false,
  worksLabel = DEFAULT_WORKS_LABEL,
  headingLevel = 1,
  standalone = false,
  className,
}: {
  work: Work;
  series: Series;
  /** The series' parent, when the work belongs to a chapter of a larger series. */
  parent?: Series | null;
  /** SiteSettings.liveHtml: run an interactive work instead of showing its still. */
  liveHtml?: boolean;
  /** SiteSettings.showOwners. */
  showOwner?: boolean;
  /** What the first crumb calls /works: worksLabel(settings). */
  worksLabel?: string;
  /** 1 on a work page; deeper where the work is shown inside another page. */
  headingLevel?: HeadingLevel;
  /** The work is the whole series (a one of one), so the breadcrumb skips the series. */
  standalone?: boolean;
  className?: string;
}) {
  const Heading = `h${headingLevel}` as const;
  const SubHeading = `h${nextHeadingLevel(headingLevel)}` as const;
  const title = workTitle(work);
  const marketUrl = work.marketUrl ?? series.marketUrl;
  const unique = isOneOfOne(work, series);
  const categories = work.categories?.length ? work.categories : series.categories;

  return (
    <article data-slot="work-detail" data-one-of-one={unique ? '' : undefined} className={cn('flex flex-col gap-6', className)}>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/works" />}>{worksLabel}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          {standalone ? (
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className="truncate">{title}</BreadcrumbPage>
            </BreadcrumbItem>
          ) : (
            <>
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
                  {seriesTitle(series)}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="max-sm:hidden" />
              <BreadcrumbItem className="min-w-0 max-sm:hidden">
                <BreadcrumbPage className="truncate">{title}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>

      <div data-slot="work-layout" className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_26rem] xl:items-start xl:gap-12">
        <div data-slot="work-media" className="xl:sticky xl:top-20 xl:self-start">
          <WorkMedia work={work} liveHtml={liveHtml} />
        </div>

        <div data-slot="work-facts" className={cn('flex min-w-0 flex-col gap-8', READING_CLASS)}>
          <header data-slot="work-header" className="flex flex-col gap-3">
            {standalone ? null : (
              <p data-slot="work-series" className="text-sm text-muted-foreground">
                <Link href={seriesHref(series)} className="underline-offset-4 hover:text-foreground hover:underline">
                  {seriesTitle(series)}
                </Link>
              </p>
            )}
            <Heading
              title={work.title}
              className="font-heading text-2xl font-semibold tracking-tight text-pretty break-words hyphens-auto sm:text-3xl"
            >
              {title}
            </Heading>
            <div data-slot="work-badges" className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary">{MEDIA_KIND_LABELS[work.media.kind]}</Badge>
              {unique ? (
                <Badge variant="outline" className="font-normal">
                  One of one
                </Badge>
              ) : null}
              {series.kind !== 'series' ? (
                <Badge variant="outline" className="font-normal">
                  {SERIES_KIND_LABELS[series.kind]}
                </Badge>
              ) : null}
              {series.coAuthored ? (
                <Badge>
                  <UsersIcon aria-hidden data-icon="inline-start" />
                  Co-authored
                </Badge>
              ) : null}
            </div>
            <WorkTags tags={categories} className="pt-1" />
          </header>

          <WorkFacts work={work} series={series} />

          <div data-slot="work-actions" className="flex flex-wrap gap-2">
            <ShareButton title={title} text={`${title}, ${seriesTitle(series)}`} />
            <Button
              variant="outline"
              nativeButton={false}
              render={<a data-link="explorer" href={work.explorerUrl} target="_blank" rel="noopener noreferrer" />}
            >
              View on {hostOf(work.explorerUrl)}
              <ExternalLinkIcon aria-hidden data-icon="inline-end" />
              <span className="sr-only">(opens in a new tab)</span>
            </Button>
            {marketUrl ? (
              <Button
                variant="outline"
                nativeButton={false}
                render={<a data-link="market" href={marketUrl} target="_blank" rel="noopener noreferrer" />}
              >
                Collect on {marketLabel(marketUrl, work.platform ?? series.platform)}
                <ExternalLinkIcon aria-hidden data-icon="inline-end" />
                <span className="sr-only">(opens in a new tab)</span>
              </Button>
            ) : null}
          </div>

          <WorkAttributes
            work={work}
            series={series}
            showOwner={showOwner}
            headingLevel={nextHeadingLevel(headingLevel)}
          />

          <section data-slot="work-provenance" className="flex flex-col gap-3">
            <SubHeading className="text-sm font-medium">Provenance</SubHeading>
            <p className="text-sm text-muted-foreground text-pretty">
              {SERIES_KIND_DESCRIPTIONS[series.kind]} This is how the catalogue knows the work is the artist&apos;s:
            </p>
            <ProvenanceList series={series} />
            {series.coAuthored ? (
              <Alert>
                <UsersIcon aria-hidden />
                <AlertTitle>Co-authored</AlertTitle>
                <AlertDescription>{CO_AUTHORED_COPY.explanation}</AlertDescription>
              </Alert>
            ) : null}
          </section>
        </div>
      </div>
    </article>
  );
}

export function WorkDetailSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-6', className)} role="status" aria-label="Loading work">
      <Skeleton className="h-4 w-56" />
      <div data-slot="work-layout" className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_26rem] xl:items-start xl:gap-12">
        <Skeleton className={cn('w-full rounded-lg', WORK_STAGE_CLASS)} />
        <div className={cn('flex flex-col gap-8', READING_CLASS)}>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="flex flex-col gap-3">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-6 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
