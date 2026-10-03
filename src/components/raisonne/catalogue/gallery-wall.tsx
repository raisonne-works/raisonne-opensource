'use client';

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { useRef } from 'react';

import { usePrefersReducedMotion } from '@/components/raisonne/works/use-prefers-reduced-motion';
import { MediaStill } from '@/components/raisonne/works/media-still';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { EnlargeTrigger } from './enlarge-dialog';
import type { CatalogueEntry } from './entry';

/**
 * The wall: one work at a time, hung in a line that runs sideways. It is for
 * looking rather than for finding, so the frame is tall, the caption is
 * quiet and the image opens full size on a click.
 *
 * It scrolls with the wheel, a swipe, the two buttons or the keyboard, and
 * each work snaps to the middle. Nothing animates when the visitor has asked
 * for less motion.
 */
export function GalleryWall({ entries, className }: { entries: CatalogueEntry[]; className?: string }) {
  const track = useRef<HTMLUListElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  function step(direction: 1 | -1) {
    const element = track.current;
    if (!element) return;
    const item = element.querySelector('li');
    const width = (item?.clientWidth ?? element.clientWidth * 0.6) + 24;
    element.scrollBy({ left: direction * width, behavior: reducedMotion ? 'auto' : 'smooth' });
  }

  return (
    <div data-slot="gallery-wall" className={cn('flex flex-col gap-4', className)}>
      <ul
        ref={track}
        tabIndex={0}
        aria-label="Works, side by side"
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto overscroll-x-contain pb-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {entries.map((entry, index) => (
          <li key={entry.key} className="flex shrink-0 snap-center flex-col gap-3">
            <EnlargeTrigger
              entry={entry}
              className="group/wall relative block h-[min(58svh,680px)] rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span
                className="block h-full"
                style={{ aspectRatio: aspectRatio(entry) }}
              >
                <MediaStill
                  media={entry.media}
                  alt={entry.title}
                  sizes="(min-width: 1280px) 50vw, 80vw"
                  source="stage"
                  fit={entry.fit}
                  priority={index < 2}
                  as="span"
                  className="h-full w-full aspect-auto transition-opacity group-hover/wall:opacity-90"
                />
              </span>
            </EnlargeTrigger>
            <div className="flex max-w-[40ch] min-w-0 flex-col gap-0.5">
              <span className="truncate text-sm font-medium" title={entry.fullTitle ?? entry.title}>
                {entry.title}
              </span>
              {entry.meta.length > 0 ? (
                <span className="truncate text-xs text-muted-foreground">{entry.meta.join(' · ')}</span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon-sm" aria-label="Previous work" onClick={() => step(-1)}>
          <ChevronLeftIcon aria-hidden />
        </Button>
        <Button variant="outline" size="icon-sm" aria-label="Next work" onClick={() => step(1)}>
          <ChevronRightIcon aria-hidden />
        </Button>
        <p className="text-xs text-muted-foreground">Scroll sideways, or use the arrow keys.</p>
      </div>
    </div>
  );
}

/** The work's own shape, so nothing is cropped; square when the size is unknown. */
function aspectRatio(entry: CatalogueEntry): string {
  const width = entry.media?.width ?? null;
  const height = entry.media?.height ?? null;
  if (!width || !height || width <= 0 || height <= 0) return '1 / 1';
  // A very wide or very tall work still has to fit on a phone.
  const ratio = Math.min(Math.max(width / height, 0.5), 2.5);
  return String(ratio);
}
