'use client';

import {
  ExternalLinkIcon,
  MaximizeIcon,
  MinimizeIcon,
  PlayIcon,
  ShieldIcon,
  SquareIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { Work } from '@/lib/types';
import { cn } from '@/lib/utils';

import { hostOf, stageVars, WORK_STAGE_CLASS } from './lib';
import { MediaStill } from './media-still';

/** How long a work may take to load before the page offers a way out. */
const SLOW_AFTER = 15_000;

/**
 * How long the still stays over a frame that has just loaded.
 *
 * A sandboxed cross-origin frame cannot tell us when it has painted, and a
 * work that clears its canvas first shows a slab of its own white before it
 * draws anything. The still covers that beat rather than the page flashing
 * white in the middle of a dark screen.
 */
const FIRST_PAINT_GRACE = 400;

type RunState = 'idle' | 'loading' | 'running' | 'failed';

/**
 * An interactive work, running.
 *
 * Live HTML is other people's code, so it runs only when the artist has
 * switched it on (SiteSettings.liveHtml), only when a visitor asks for it,
 * and only inside a frame with `sandbox="allow-scripts"` and no
 * `allow-same-origin`: no cookies, no storage, no reach into this site. It
 * never runs by itself, and never in a grid.
 *
 * Until it is running, and whenever it cannot run, the still stands in its
 * place and the link to the original file is always there.
 */
export function LiveHtmlFrame({
  work,
  enabled,
  sizes = '(min-width: 1280px) 70vw, 100vw',
  className,
  frameClassName,
}: {
  work: Work;
  /** SiteSettings.liveHtml. Off means the still, an explanation and the link out. */
  enabled: boolean;
  sizes?: string;
  className?: string;
  /** Sizes the stage the work runs in. Defaults to the work page's stage. */
  frameClassName?: string;
}) {
  const src = work.media.animation;
  const [state, setState] = useState<RunState>('idle');
  const [slow, setSlow] = useState(false);
  const runButton = useRef<HTMLButtonElement | null>(null);
  const frame = useRef<HTMLDivElement | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);
  const [painted, setPainted] = useState(false);

  useEffect(() => {
    setCanFullscreen(document.fullscreenEnabled && typeof frame.current?.requestFullscreen === 'function');
    function onChange() {
      setFullscreen(document.fullscreenElement === frame.current);
    }
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await frame.current?.requestFullscreen();
    } catch {
      setCanFullscreen(false);
    }
  }

  useEffect(() => {
    if (state !== 'loading') return;
    const timer = window.setTimeout(() => setSlow(true), SLOW_AFTER);
    return () => window.clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    if (state !== 'running') return undefined;
    const timer = window.setTimeout(() => setPainted(true), FIRST_PAINT_GRACE);
    return () => window.clearTimeout(timer);
  }, [state]);

  const running = state === 'loading' || state === 'running';
  const canRun = enabled && Boolean(src);

  return (
    <div data-slot="live-html-frame" className={cn('flex flex-col gap-2', className)}>
      {/* ring-1: the frame keeps an edge whatever the work paints inside it,
          including a full white canvas on a dark page. */}
      <div
        ref={frame}
        style={stageVars(work.media)}
        className={cn(
          'relative overflow-hidden rounded-lg bg-muted ring-1 ring-inset ring-border',
          frameClassName ?? WORK_STAGE_CLASS,
        )}
      >
        {/* The still stays underneath: it is what a visitor sees while the work loads and if it never does. */}
        <MediaStill
          media={work.media}
          alt={running ? '' : work.title}
          sizes={sizes}
          source="stage"
          className="aspect-auto absolute inset-0 size-full rounded-none"
        />

        {running && src ? (
          <iframe
            key={src}
            src={src}
            title={`${work.title}, interactive work`}
            // allow-scripts only: the frame gets no access to this site, its
            // cookies or its storage, which is what makes running it safe.
            sandbox="allow-scripts"
            referrerPolicy="no-referrer"
            loading="lazy"
            className={cn(
              'absolute inset-0 size-full border-0 bg-background transition-opacity',
              !painted && 'opacity-0',
            )}
            onLoad={() => setState('running')}
            onError={() => {
              setPainted(false);
              setState('failed');
            }}
          />
        ) : null}

        {state === 'loading' ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <Spinner className="size-6 text-muted-foreground" aria-label="Loading the live work" />
          </div>
        ) : null}

        {!running && canRun ? (
          <button
            ref={runButton}
            type="button"
            onClick={() => {
              setSlow(false);
              setPainted(false);
              setState('loading');
            }}
            aria-label={`Run the live work: ${work.title}`}
            className="group/run absolute inset-0 flex cursor-pointer items-center justify-center outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
          >
            <span className="inline-flex items-center gap-2 rounded-lg bg-background/90 px-3 py-2 text-sm font-medium ring-1 ring-foreground/10 transition-colors group-hover/run:bg-background">
              <PlayIcon aria-hidden className="size-4" />
              Run the work
            </span>
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldIcon aria-hidden className="size-3.5 shrink-0" />
          {enabled
            ? running
              ? 'Running in a sandboxed frame with no access to this site.'
              : 'Live code. It runs only when you ask, in a sandboxed frame.'
            : 'This site shows interactive works as stills.'}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {running && canFullscreen ? (
            <Button variant="ghost" size="sm" onClick={toggleFullscreen} aria-pressed={fullscreen}>
              {fullscreen ? (
                <MinimizeIcon aria-hidden data-icon="inline-start" />
              ) : (
                <MaximizeIcon aria-hidden data-icon="inline-start" />
              )}
              {fullscreen ? 'Leave full screen' : 'Full screen'}
            </Button>
          ) : null}
          {running ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setPainted(false);
                setState('idle');
                // Focus goes back to the control that replaces this one.
                window.requestAnimationFrame(() => runButton.current?.focus());
              }}
            >
              <SquareIcon aria-hidden data-icon="inline-start" />
              Stop
            </Button>
          ) : null}
          {src ? (
            <Button variant="outline" size="sm" nativeButton={false} render={<a href={src} target="_blank" rel="noopener noreferrer" />}>
              Open the live work
              <ExternalLinkIcon aria-hidden data-icon="inline-end" />
              <span className="sr-only">(opens in a new tab)</span>
            </Button>
          ) : null}
        </div>
      </div>

      {state === 'failed' ? (
        <Alert>
          <TriangleAlertIcon aria-hidden />
          <AlertTitle>The live work did not load</AlertTitle>
          <AlertDescription>
            {src ? `${hostOf(src)} did not answer. ` : null}
            The still is shown instead, and the link above opens the original file.
          </AlertDescription>
        </Alert>
      ) : null}

      {slow && state === 'loading' ? (
        <Alert>
          <TriangleAlertIcon aria-hidden />
          <AlertTitle>Still loading</AlertTitle>
          <AlertDescription>
            {src ? `${hostOf(src)} is slow to answer. ` : null}
            Interactive works are often large files on a public gateway. The still stays up until it arrives.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
