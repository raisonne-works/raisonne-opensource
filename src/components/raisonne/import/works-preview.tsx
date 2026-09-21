'use client';

import { useId } from 'react';
import { ImageOffIcon } from 'lucide-react';

import type { HeadingLevel } from '@/components/raisonne/shell/heading';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import type { DiscoveredWork } from '@/lib/import-events';
import type { Media } from '@/lib/types';
import { cn } from '@/lib/utils';

import { MediaStill } from '../works/media-still';
import { formatCount, plural, shortTokenId } from '../works/lib';
import { type ImportState, type IncludeOverrides, includedKeys, interleavedWorks } from './import-state';

/** Two full rows at every width of the preview grid (2, 3, 4 and 5 columns). */
const PREVIEW_LIMIT = 10;

/**
 * The import flow is a tool in a column, not a full-width gallery, so this
 * grid counts the column it is in rather than the window: container queries,
 * so the same component fits the page and the design system.
 */
const PREVIEW_GRID = 'grid grid-cols-2 gap-x-4 gap-y-8 @xl:grid-cols-3 @3xl:grid-cols-4 @7xl:grid-cols-5';

const PREVIEW_SIZES = '(min-width: 1280px) 280px, (min-width: 768px) 30vw, 45vw';

/** Hides the tiles past two rows for the current column count. */
function tileVisibility(index: number): string {
  if (index < 4) return '';
  if (index < 6) return 'hidden @xl:block';
  if (index < 8) return 'hidden @3xl:block';
  return 'hidden @7xl:block';
}

function toMedia(work: DiscoveredWork): Media {
  return {
    kind: work.mediaType,
    still: work.thumbnail,
    full: work.image,
    animation: null,
    width: work.width,
    height: work.height,
  };
}

export interface WorksPreviewProps {
  state: ImportState;
  overrides?: IncludeOverrides;
  /** The level of this block's title in the page's outline. */
  headingLevel?: HeadingLevel;
  className?: string;
}

/**
 * The works themselves, the moment they load: stills from the series being
 * included, taken a work per series at a time so one large series cannot
 * fill the view. Two rows at any width, in the site's media grid.
 */
export function WorksPreview({ state, overrides = {}, headingLevel = 2, className }: WorksPreviewProps) {
  const titleId = useId();
  const Heading = `h${headingLevel}` as const;
  const keys = includedKeys(state, overrides);
  const items = interleavedWorks(state, keys, PREVIEW_LIMIT);
  const loaded = keys.reduce((sum, key) => sum + (state.works[key]?.length ?? 0), 0);
  const running = state.phase === 'running';

  return (
    <section aria-labelledby={titleId} className={cn('@container flex flex-col gap-4', className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
        <div className="flex flex-col gap-1">
          <Heading id={titleId} className="text-lg font-semibold tracking-tight">
            First look
          </Heading>
          <p className="text-sm text-pretty text-muted-foreground">
            Stills from the series you are including, as the import loads them.
          </p>
        </div>
        {loaded > 0 ? (
          <p className="text-sm text-muted-foreground tabular-nums">
            {plural(loaded, 'work')} loaded from the {plural(keys.length, 'series', 'series')} switched on
          </p>
        ) : null}
      </div>

      {items.length > 0 ? (
        <ul className={PREVIEW_GRID}>
          {items.map(({ key, work }, index) => {
            const title = work.title?.trim() || `Token ${shortTokenId(work.tokenId)}`;
            const series = state.series[key]?.name ?? null;
            return (
              <li
                key={`${key}:${work.tokenId}`}
                className={cn(
                  'min-w-0 animate-in duration-500 fade-in-0 motion-reduce:animate-none',
                  tileVisibility(index),
                )}
              >
                <figure className="flex flex-col gap-2">
                  <MediaStill media={toMedia(work)} alt="" sizes={PREVIEW_SIZES} />
                  <figcaption className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">{title}</span>
                    {series ? <span className="truncate text-xs text-muted-foreground">{series}</span> : null}
                  </figcaption>
                </figure>
              </li>
            );
          })}
        </ul>
      ) : running ? (
        <div role="status">
          <span className="sr-only">Loading works</span>
          <ul aria-hidden className={PREVIEW_GRID}>
            {Array.from({ length: PREVIEW_LIMIT }, (_, index) => (
              <li key={index} className={cn('flex flex-col gap-2', tileVisibility(index))}>
                <Skeleton className="aspect-square w-full rounded-lg" />
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="h-3 w-2/5" />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <Empty className="border py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ImageOffIcon aria-hidden />
            </EmptyMedia>
            <EmptyTitle>No stills to show</EmptyTitle>
            <EmptyDescription>
              {keys.length === 0
                ? 'Switch on a series in the review below to see its works here.'
                : `None of the ${formatCount(keys.length)} series switched on has a still yet.`}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </section>
  );
}
