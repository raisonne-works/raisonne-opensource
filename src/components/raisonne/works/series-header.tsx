import Link from 'next/link';
import type { ReactNode } from 'react';
import { ExternalLinkIcon, UsersIcon } from 'lucide-react';

import { type HeadingLevel, nextHeadingLevel } from '@/components/raisonne/shell/heading';
import { PageHeader } from '@/components/raisonne/shell/page';
import { ShareButton } from '@/components/raisonne/shell/share-button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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

import { EvidenceBadges } from './evidence-badges';
import {
  CO_AUTHORED_COPY,
  SERIES_HERO_CLASS,
  SERIES_KIND_DESCRIPTIONS,
  SERIES_KIND_LABELS,
  contractExplorerUrl,
  hostOf,
  marketLabel,
  seriesHref,
  seriesTitle,
} from './lib';
import { MediaStill } from './media-still';

/**
 * The top of a series page: where it sits, what it is called, and why it is
 * attributed to the artist. The facts live beside it in SeriesSpecs, and the
 * works fill the width below.
 *
 * A chapter of a larger series says so, and its breadcrumb goes back to the
 * parent. Where the contract's own name is a machine name the page prints the
 * artist's display title and keeps the full name underneath.
 *
 * It opens on the cover, the same band its /about child opens on, so the
 * deepest pages of the catalogue start with the work rather than with a wall
 * of text and the first image 1,500 px down.
 */
export function SeriesHeader({
  series,
  parent = null,
  facts,
  headingLevel = 1,
  className,
}: {
  series: Series;
  /** The series this one is a chapter of. */
  parent?: Series | null;
  /** The facts panel (SeriesSpecs), between the description and the attribution. */
  facts?: ReactNode;
  /** 1 on a series page; deeper where the header is shown inside another page. */
  headingLevel?: HeadingLevel;
  className?: string;
}) {
  const SubHeading = `h${nextHeadingLevel(headingLevel)}` as const;
  const explorer = contractExplorerUrl(series.chain, series.contract);
  const title = seriesTitle(series);
  const fullName = title === series.name ? null : series.name;
  const hasEvidence = series.evidence.length > 0 || series.coAuthored;

  return (
    <div data-slot="series-header" className={cn('flex flex-col gap-6 pt-6 pb-8 md:pb-10', className)}>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/works" />}>Works</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          {parent ? (
            <>
              <BreadcrumbItem className="min-w-0">
                <BreadcrumbLink render={<Link href={seriesHref(parent)} />} className="truncate">
                  {seriesTitle(parent)}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          ) : null}
          <BreadcrumbItem className="min-w-0">
            <BreadcrumbPage className="truncate">{title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {series.cover?.still ? (
        <MediaStill
          media={series.cover}
          alt=""
          fit="cover"
          priority
          sizes="(min-width: 1536px) 1536px, 100vw"
          className={SERIES_HERO_CLASS}
        />
      ) : null}

      <PageHeader
        className="py-0 md:py-0"
        headingLevel={headingLevel}
        eyebrow={
          parent ? (
            <>
              {SERIES_KIND_LABELS[series.kind]}, part of{' '}
              <Link href={seriesHref(parent)} className="underline-offset-4 hover:text-foreground hover:underline">
                {seriesTitle(parent)}
              </Link>
            </>
          ) : (
            SERIES_KIND_LABELS[series.kind]
          )
        }
        title={<span className="break-words hyphens-auto">{title}</span>}
        description={
          series.description ? <p className="whitespace-pre-line">{series.description}</p> : undefined
        }
        actionsBelow
        actions={
          <>
            <ShareButton title={title} size="sm" />
            {explorer ? (
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<a href={explorer} target="_blank" rel="noopener noreferrer" />}
              >
                Contract on {hostOf(explorer)}
                <ExternalLinkIcon aria-hidden data-icon="inline-end" />
                <span className="sr-only">(opens in a new tab)</span>
              </Button>
            ) : null}
            {series.marketUrl ? (
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<a href={series.marketUrl} target="_blank" rel="noopener noreferrer" />}
              >
                Collect on {marketLabel(series.marketUrl, series.platform)}
                <ExternalLinkIcon aria-hidden data-icon="inline-end" />
                <span className="sr-only">(opens in a new tab)</span>
              </Button>
            ) : null}
          </>
        }
      />

      {fullName ? (
        <p className="text-sm text-muted-foreground">
          Recorded on-chain as <span className="font-mono break-words">{fullName}</span>
        </p>
      ) : null}

      {facts}

      {/*
        A heading over "no evidence recorded" gives the absence more weight
        than the record it is about, so a series with no signal says so in one
        quiet line instead.
      */}
      {hasEvidence ? (
        <div className="flex max-w-prose flex-col gap-3">
          <SubHeading className="text-sm font-medium">Why this is attributed to the artist</SubHeading>
          <EvidenceBadges evidence={series.evidence} coAuthored={series.coAuthored} />
          <p className="text-sm text-muted-foreground">
            {series.kind !== 'series' ? `${SERIES_KIND_DESCRIPTIONS[series.kind]} ` : ''}
            Open a signal to read what it means and the record behind it.
          </p>
        </div>
      ) : (
        <p className="max-w-prose text-sm text-muted-foreground">
          {series.kind !== 'series' ? `${SERIES_KIND_DESCRIPTIONS[series.kind]} ` : ''}
          No attribution signal is recorded on this contract yet.
        </p>
      )}

      {series.coAuthored ? (
        <Alert className="max-w-prose">
          <UsersIcon aria-hidden />
          <AlertTitle>Co-authored series</AlertTitle>
          <AlertDescription>{CO_AUTHORED_COPY.explanation}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

export function SeriesHeaderSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-6 pt-6 pb-8 md:pb-10', className)} role="status" aria-label="Loading series">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="aspect-[16/9] max-h-[min(60svh,34rem)] w-full max-w-[96rem] rounded-lg sm:aspect-[5/2]" />
      <div className="flex max-w-prose flex-col gap-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-4/5" />
      </div>
      <div className="flex flex-wrap gap-8">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="flex flex-col gap-2">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
