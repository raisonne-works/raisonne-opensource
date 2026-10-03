import Link from 'next/link';
import { CodeIcon, PlayIcon } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import type { Work } from '@/lib/types';
import { cn } from '@/lib/utils';

import { GRID_SIZES, MEDIA_KIND_LABELS, shortTokenId, titleHasTokenNumber, workTitle } from './lib';
import { MediaStill } from './media-still';

/**
 * One work in a grid: the still, whole and uncropped, with a caption under it.
 * Video and interactive works say so in the caption; they only play in the
 * viewer. The token number is shown only when the title does not already
 * carry it ("Visions #001" says #1 twice otherwise), and it is labelled: a
 * bare "#46" under a title reading "... #376" leaves a reader guessing which
 * number is the token.
 */
export function WorkCard({
  work,
  href,
  sizes = GRID_SIZES,
  priority = false,
  className,
}: {
  work: Work;
  href: string;
  /** next/image sizes; the default matches WorkGrid. */
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  const kind = work.media.kind;
  const title = workTitle(work);
  const showToken = !titleHasTokenNumber(title, work.tokenId);
  return (
    <Link
      href={href}
      className={cn(
        'group/work-card flex min-w-0 flex-col gap-2.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        className,
      )}
    >
      <MediaStill
        media={work.media}
        alt=""
        sizes={sizes}
        priority={priority}
        className="transition-opacity group-hover/work-card:opacity-90"
      />
      <div data-slot="work-card-caption" className="flex min-w-0 flex-col gap-0.5">
        <span data-slot="work-card-title" className="truncate text-sm font-medium underline-offset-4 group-hover/work-card:underline" title={work.title}>
          {title}
        </span>
        <span data-slot="work-card-meta" className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          {showToken ? (
            <span className="truncate" title={`Token ${work.tokenId}`}>
              Token <span className="font-mono">{shortTokenId(work.tokenId)}</span>
            </span>
          ) : null}
          {kind === 'video' || kind === 'html' ? (
            <span className="inline-flex shrink-0 items-center gap-1">
              {kind === 'video' ? (
                <PlayIcon aria-hidden className="size-3" />
              ) : (
                <CodeIcon aria-hidden className="size-3" />
              )}
              {MEDIA_KIND_LABELS[kind]}
            </span>
          ) : null}
          {work.editionSize !== null && work.editionSize > 1 ? (
            <span className="shrink-0">Ed. {work.editionSize}</span>
          ) : null}
        </span>
      </div>
    </Link>
  );
}

export function WorkCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2.5', className)} aria-hidden>
      <Skeleton className="aspect-square w-full rounded-lg" />
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}
