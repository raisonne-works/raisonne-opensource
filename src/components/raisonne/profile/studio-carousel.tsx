'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { assetMedia } from '@/components/raisonne/landing/lib';
import { usePrefersReducedMotion } from '@/components/raisonne/works/use-prefers-reduced-motion';
import { MediaStill } from '@/components/raisonne/works/media-still';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Asset } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * Photographs from the studio, one at a time.
 *
 * It is a scroller, not a slideshow: nothing moves on its own, a swipe and
 * the arrow keys do the same thing, and with one image the controls are not
 * rendered at all. Each slide keeps its own caption, which is where the
 * credit for a photograph belongs.
 */
export function StudioCarousel({
  images,
  label = 'Studio photographs',
  className,
}: {
  images: Asset[];
  label?: string;
  className?: string;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const trackRef = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);

  const scrollTo = useCallback(
    (next: number) => {
      const track = trackRef.current;
      if (!track) return;
      const clamped = Math.max(0, Math.min(next, images.length - 1));
      const slide = track.children[clamped] as HTMLElement | undefined;
      if (!slide) return;
      track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: reducedMotion ? 'auto' : 'smooth' });
      setIndex(clamped);
    },
    [images.length, reducedMotion],
  );

  // The scroller is the source of truth: a swipe updates the counter too.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    const onScroll = () => {
      const width = track.clientWidth || 1;
      setIndex(Math.round(track.scrollLeft / width));
    };
    track.addEventListener('scroll', onScroll, { passive: true });
    return () => track.removeEventListener('scroll', onScroll);
  }, []);

  if (images.length === 0) return null;
  const many = images.length > 1;

  return (
    <section
      data-slot="studio-carousel"
      aria-roledescription="carousel"
      aria-label={label}
      className={cn('flex flex-col gap-3', className)}
    >
      <ul
        ref={trackRef}
        tabIndex={many ? 0 : -1}
        onKeyDown={event => {
          if (!many) return;
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            scrollTo(index + 1);
          }
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            scrollTo(index - 1);
          }
        }}
        className={cn(
          'flex snap-x snap-mandatory gap-4 overflow-x-auto rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
          !many && 'overflow-x-hidden',
        )}
      >
        {images.map((image, position) => (
          <li
            key={`${image.src}-${position}`}
            aria-roledescription="slide"
            aria-label={`${position + 1} of ${images.length}`}
            className="w-full shrink-0 snap-start"
          >
            <figure className="flex flex-col gap-2">
              <MediaStill
                media={assetMedia(image)}
                alt={image.alt ?? `${label}, ${position + 1} of ${images.length}`}
                sizes="(min-width: 1024px) 50vw, 100vw"
                fit="cover"
                priority={position === 0}
                className="aspect-[4/3]"
              />
              {image.caption ? (
                <figcaption className="max-w-[40rem] text-sm text-pretty text-muted-foreground">
                  {image.caption}
                </figcaption>
              ) : null}
            </figure>
          </li>
        ))}
      </ul>

      {many ? (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Previous photograph"
            disabled={index === 0}
            onClick={() => scrollTo(index - 1)}
          >
            <ChevronLeft aria-hidden />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Next photograph"
            disabled={index >= images.length - 1}
            onClick={() => scrollTo(index + 1)}
          >
            <ChevronRight aria-hidden />
          </Button>
          <p aria-live="polite" className="text-sm text-muted-foreground tabular-nums">
            {index + 1} of {images.length}
          </p>
        </div>
      ) : null}
    </section>
  );
}

export function StudioCarouselSkeleton({ className }: { className?: string }) {
  return (
    <div role="status" className={cn('flex flex-col gap-3', className)}>
      <span className="sr-only">Loading the studio photographs</span>
      <Skeleton aria-hidden className="aspect-[4/3] w-full rounded-lg" />
      <Skeleton aria-hidden className="h-4 w-56 max-w-full" />
    </div>
  );
}
