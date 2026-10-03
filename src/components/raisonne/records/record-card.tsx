import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ImageOffIcon, LayersIcon } from 'lucide-react';

import { GRID_CLASS, GRID_SIZES } from '@/components/raisonne/works/lib';
import { Badge } from '@/components/ui/badge';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import type { RecordPreview } from './preview';
import { EMPTY_BLOCK_CLASS } from '@/components/raisonne/shell/measure';

/**
 * A link to another record, whatever type it is: the works in a show, the
 * series an award was given for, the digital works a physical one comes
 * from. One tile shape for all of them, so a mixed row reads as one list.
 *
 * The type is named on the tile ("Exhibition", "Series") because a catalogue
 * mixes kinds freely and a picture alone does not say which is which.
 */
export function RecordCard({
  preview,
  sizes = GRID_SIZES,
  priority = false,
  className,
}: {
  preview: RecordPreview;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  const facts = [preview.typeLabel, preview.year === null ? null : String(preview.year)].filter(Boolean).join(' · ');

  const inner = (
    <>
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted dark:bg-muted/40">
        {preview.image ? (
          <Image
            src={preview.image.src}
            alt=""
            fill
            sizes={sizes}
            priority={priority}
            className="object-cover transition-opacity group-hover/record-card:opacity-90"
          />
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-muted-foreground">
            <ImageOffIcon aria-hidden className="size-5" />
            <span className="text-xs text-pretty">No preview image</span>
          </span>
        )}
      </div>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="line-clamp-2 text-sm font-medium underline-offset-4 group-hover/record-card:underline">
          {preview.title}
        </span>
        <span className="truncate text-xs text-muted-foreground">{facts}</span>
        {preview.subtitle ? (
          <span className="line-clamp-1 text-xs text-muted-foreground">{preview.subtitle}</span>
        ) : null}
      </span>
    </>
  );

  if (!preview.href) {
    return <div className={cn('flex min-w-0 flex-col gap-2.5', className)}>{inner}</div>;
  }

  return (
    <Link
      href={preview.href}
      className={cn(
        'group/record-card flex min-w-0 flex-col gap-2.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        className,
      )}
    >
      {inner}
    </Link>
  );
}

/** Record previews in the shared media grid (2, 3, 4, 5 then 6 columns as the screen widens). */
export function RecordCardGrid({
  previews,
  empty,
  priorityCount = 0,
  className,
}: {
  previews: RecordPreview[];
  empty?: ReactNode;
  priorityCount?: number;
  className?: string;
}) {
  if (previews.length === 0) {
    return (
      empty ?? (
        <Empty className={EMPTY_BLOCK_CLASS}>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LayersIcon />
            </EmptyMedia>
            <EmptyTitle>Nothing linked yet</EmptyTitle>
            <EmptyDescription>Records linked to this one appear here.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )
    );
  }

  return (
    <ul data-slot="record-grid" className={cn(GRID_CLASS, className)}>
      {previews.map((preview, index) => (
        <li key={`${preview.type}:${preview.ref.key}`} className="min-w-0">
          <RecordCard preview={preview} priority={index < priorityCount} />
        </li>
      ))}
    </ul>
  );
}

export function RecordCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2.5', className)} aria-hidden>
      <Skeleton className="aspect-square w-full rounded-lg" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function RecordCardGridSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn(GRID_CLASS, className)} role="status" aria-label="Loading linked records">
      {Array.from({ length: count }, (_, index) => (
        <RecordCardSkeleton key={index} />
      ))}
    </div>
  );
}

/** A small type tag, for a hero or a row where the card shape is too much. */
export function RecordTypeBadge({ label }: { label: string }) {
  return (
    <Badge variant="outline" className="font-normal">
      {label}
    </Badge>
  );
}
