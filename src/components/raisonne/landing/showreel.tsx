'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, Play } from 'lucide-react';

import { MediaStill } from '@/components/raisonne/works/media-still';
import { MEDIA_FRAME_CLASS } from '@/components/raisonne/works/lib';
import { usePrefersReducedMotion } from '@/components/raisonne/works/use-prefers-reduced-motion';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Asset, Landing } from '@/lib/types';
import { cn } from '@/lib/utils';

import { assetMedia } from './lib';

/**
 * The reel: a still until someone asks for it, then the video with its own
 * controls, at the size the screen can use.
 *
 * Nothing plays by itself. Hovering a pointer over the still starts a muted,
 * silent preview so the page is alive without being loud, and a visitor who
 * asks for less motion never sees even that. Clicking or pressing Enter
 * loads the real thing with controls and sound. "Expand" asks the browser
 * for fullscreen and, where that is refused, grows the frame in place.
 */
export function Showreel({
  showreel,
  title = 'Showreel',
  className,
}: {
  showreel: NonNullable<Landing['showreel']>;
  /** The accessible name for the player. */
  title?: string;
  className?: string;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [playing, setPlaying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);

  // A video asset already carries its own still, so either source works.
  const posterMedia = assetMedia(showreel.poster ?? showreel.video);
  const posterUrl = posterMedia?.still ?? undefined;
  const posterAlt = showreel.poster?.alt ?? showreel.video.alt ?? `Still from the ${title.toLowerCase()}`;
  // The original until a visitor asks for the video; the size their screen
  // can use from that moment on. Chosen in the handler, so nothing is
  // measured during a render and the markup starts the same on both sides.
  const [src, setSrc] = useState(showreel.video.src);

  // Leaving fullscreen with Escape has to put the button back in step.
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setExpanded(false);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleExpand = useCallback(() => {
    const frame = frameRef.current;
    if (!frame) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
      setExpanded(false);
      return;
    }
    if (frame.requestFullscreen) {
      frame.requestFullscreen().then(
        () => setExpanded(true),
        // Fullscreen can be refused (an iframe without the permission);
        // growing the frame in place is the same idea, in the page.
        () => setExpanded(true),
      );
      return;
    }
    setExpanded(true);
  }, []);

  const startPreview = useCallback(() => {
    if (reducedMotion || playing) return;
    setSrc(bestSource(showreel.video));
    setPreviewing(true);
    // The muted preview is a nicety, so a refused play() is not an error.
    void previewRef.current?.play().catch(() => undefined);
  }, [reducedMotion, playing, showreel.video]);

  const stopPreview = useCallback(() => {
    setPreviewing(false);
    const video = previewRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
  }, []);

  return (
    <figure
      data-slot="showreel"
      // What a pack's script needs to present the reel its own way.
      data-video-src={showreel.video.src}
      data-video-poster={posterUrl}
      data-video-renditions={JSON.stringify(
        (showreel.video.renditions ?? []).filter(r => r.src).map(r => ({ height: r.height, src: r.src })),
      )}
      className={cn('flex flex-col gap-3', className)}
    >
      <div
        ref={frameRef}
        onMouseEnter={startPreview}
        onMouseLeave={stopPreview}
        className={cn(
          'relative overflow-hidden rounded-lg',
          MEDIA_FRAME_CLASS,
          expanded ? 'h-[88svh] rounded-none' : 'aspect-video',
        )}
      >
        {playing ? (
          <video
            key={src}
            src={src}
            poster={posterUrl}
            controls
            autoPlay
            playsInline
            preload="metadata"
            aria-label={title}
            className="size-full bg-black object-contain"
          />
        ) : (
          <>
            <MediaStill
              media={posterMedia}
              alt={posterAlt}
              sizes="(min-width: 1280px) 70vw, 100vw"
              fit="cover"
              className="absolute inset-0 size-full rounded-none"
            />
            {previewing ? (
              <video
                ref={previewRef}
                src={src}
                muted
                loop
                playsInline
                preload="none"
                aria-hidden
                tabIndex={-1}
                className="absolute inset-0 size-full object-cover"
              />
            ) : null}
            <button
              type="button"
              onClick={() => {
                stopPreview();
                setSrc(bestSource(showreel.video));
                setPlaying(true);
              }}
              className="absolute inset-0 flex items-end justify-start p-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
            >
              <span className="inline-flex items-center gap-2 rounded-lg bg-background/90 px-3 py-2 text-sm font-medium">
                <Play aria-hidden className="size-4" />
                Play the {title.toLowerCase()}
              </span>
            </button>
          </>
        )}

        <Button
          variant="outline"
          size="icon-sm"
          onClick={toggleExpand}
          aria-pressed={expanded}
          aria-label={expanded ? 'Shrink the video' : 'Expand the video'}
          className="absolute top-3 right-3"
        >
          {expanded ? <Minimize2 aria-hidden /> : <Maximize2 aria-hidden />}
        </Button>
      </div>

      {showreel.video.caption ? (
        <figcaption className="max-w-[40rem] text-sm text-pretty text-muted-foreground">
          {showreel.video.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

/**
 * The encoded size this screen can actually use: the smallest rendition tall
 * enough for it, or the original when the host made none.
 */
function bestSource(video: Asset): string {
  const renditions = (video.renditions ?? []).filter(rendition => rendition.src);
  if (renditions.length === 0) return video.src;
  const ratio = video.width && video.height ? video.height / video.width : 9 / 16;
  const wanted = Math.round(window.innerWidth * (window.devicePixelRatio || 1) * ratio);
  const sorted = [...renditions].sort((a, b) => a.height - b.height);
  return (sorted.find(rendition => rendition.height >= wanted) ?? sorted[sorted.length - 1]).src;
}

export function ShowreelSkeleton({ className }: { className?: string }) {
  return (
    <div role="status" className={cn('flex flex-col gap-3', className)}>
      <span className="sr-only">Loading the showreel</span>
      <Skeleton aria-hidden className="aspect-video w-full rounded-lg" />
      <Skeleton aria-hidden className="h-4 w-64 max-w-full" />
    </div>
  );
}
