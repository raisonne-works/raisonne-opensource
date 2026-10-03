'use client';

import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * A series' short film, played over its cover while the pointer is on the
 * card or the keyboard is inside it.
 *
 * It lies over the still and takes its box, so the card keeps its size and a
 * masonry keeps its rows. Nothing is fetched until the first hover, it never
 * plays on a screen that cannot hover, and never for a visitor who asked for
 * less motion. It shows only once frames arrive, so a slow film leaves the
 * still in place rather than a black box.
 */
export function CardTeaser({ src, className }: { src: string; className?: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const element = video.current;
    const card = element?.closest<HTMLElement>('[data-slot="catalogue-card"]');
    if (!element || !card) return;
    if (!window.matchMedia('(hover: hover)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let wanted = false;
    const start = () => {
      if (wanted) return;
      wanted = true;
      element.play().catch(() => {
        // Refused or interrupted: the still stays.
      });
    };
    const stop = () => {
      // The pointer may leave while the keyboard is still inside, and the other way round.
      if (card.matches(':hover') || card.contains(document.activeElement)) return;
      wanted = false;
      element.pause();
      setPlaying(false);
    };
    const shown = () => setPlaying(wanted);

    card.addEventListener('pointerenter', start);
    card.addEventListener('pointerleave', stop);
    card.addEventListener('focusin', start);
    card.addEventListener('focusout', stop);
    element.addEventListener('playing', shown);
    return () => {
      card.removeEventListener('pointerenter', start);
      card.removeEventListener('pointerleave', stop);
      card.removeEventListener('focusin', start);
      card.removeEventListener('focusout', stop);
      element.removeEventListener('playing', shown);
      element.pause();
    };
  }, []);

  return (
    <video
      ref={video}
      data-slot="card-teaser"
      data-playing={playing ? '' : undefined}
      src={src}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden
      tabIndex={-1}
      className={cn(
        'pointer-events-none absolute inset-0 size-full rounded-lg object-cover opacity-0 transition-opacity data-playing:opacity-100',
        className,
      )}
    />
  );
}
