'use client';

import { Volume2Icon, VolumeXIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import type { Asset } from '@/lib/types';
import { cn } from '@/lib/utils';

import { MEDIA_FRAME_CLASS, SERIES_HERO_CLASS } from './lib';
import { usePrefersReducedMotion } from './use-prefers-reduced-motion';

/**
 * A series' teaser film, in the box its cover still would take.
 *
 * It plays by itself, silent and looping, the way a cover would simply be
 * there; a visitor who asks their system for less motion gets the poster and
 * the browser's own controls instead. Sound is one button away and never on
 * by default.
 */
export function SeriesTeaser({
  teaser,
  poster,
  label,
  className,
}: {
  teaser: Asset;
  /** What stands in before the film plays: the cover still, when the film has no poster of its own. */
  poster?: string | null;
  /** Names the film for a screen reader. */
  label: string;
  className?: string;
}) {
  const video = useRef<HTMLVideoElement | null>(null);
  const reduced = usePrefersReducedMotion();
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const film = video.current;
    if (!film) return;
    if (reduced) {
      film.pause();
      return;
    }
    // A browser may still refuse to start it; the poster stays up then.
    film.play().catch(() => undefined);
  }, [reduced]);

  return (
    <div
      data-slot="series-teaser"
      data-video-src={teaser.src}
      className={cn('relative overflow-hidden rounded-lg', MEDIA_FRAME_CLASS, SERIES_HERO_CLASS, className)}
    >
      <video
        ref={video}
        className="absolute inset-0 size-full object-cover"
        src={teaser.src}
        poster={teaser.poster ?? poster ?? undefined}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        controls={reduced}
        aria-label={label}
        // The film sets its own muted state, so a pack's controls and this button agree.
        onVolumeChange={event => setMuted(event.currentTarget.muted)}
      />
      <Button
        data-teaser-sound=""
        type="button"
        variant="secondary"
        size="icon-sm"
        className="absolute top-3 right-3"
        aria-label={muted ? 'Turn the sound on' : 'Turn the sound off'}
        aria-pressed={!muted}
        onClick={() => {
          const film = video.current;
          if (film) film.muted = !film.muted;
        }}
      >
        {muted ? <VolumeXIcon aria-hidden /> : <Volume2Icon aria-hidden />}
      </Button>
    </div>
  );
}
