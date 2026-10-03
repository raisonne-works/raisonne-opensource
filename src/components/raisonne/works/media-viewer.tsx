'use client';

import Image, { getImageProps } from 'next/image';
import {
  ExternalLinkIcon,
  ImageOffIcon,
  MaximizeIcon,
  MinimizeIcon,
  TriangleAlertIcon,
  XIcon,
} from 'lucide-react';
import { type ReactElement, type ReactNode, useEffect, useRef, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import type { Work } from '@/lib/types';
import { cn } from '@/lib/utils';

import { CHAIN_LABELS, MEDIA_KIND_LABELS, hostOf, shortTokenId, stageStill, workTitle } from './lib';
import { LiveHtmlFrame } from './live-html-frame';
import { usePrefersReducedMotion } from './use-prefers-reduced-motion';
import { ZoomControls, ZoomPanStage, useZoomPan } from './zoom-pan';

/** The optimized still at viewer size, for a video poster. */
function posterFor(still: string | null): string | undefined {
  if (!still) return undefined;
  return getImageProps({ src: still, alt: '', width: 960, height: 960 }).props.src;
}

/**
 * The work at full size in a dialog: images zoom and pan from half size to
 * five times, video plays here and only here, and an interactive work runs
 * here when the artist allows it. Escape closes the dialog; the whole viewer
 * can also go to real full screen.
 *
 * Pass `trigger` (an element) with `children` (its contents) to let the
 * dialog own its trigger, so the control carries aria-expanded and
 * aria-controls. Controlled `open` is for callers that open it themselves.
 */
export function MediaViewer({
  work,
  liveHtml = false,
  open,
  onOpenChange,
  trigger,
  children,
}: {
  work: Work;
  /** SiteSettings.liveHtml: run interactive works instead of showing the still. */
  liveHtml?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The element the dialog opens from, for example a zoomable stage. */
  trigger?: ReactElement;
  /** What that trigger contains. */
  children?: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger render={trigger}>{children}</DialogTrigger> : null}
      {/* The close button lives inside the shell, so it is still there when the shell goes full screen. */}
      <DialogContent
        showCloseButton={false}
        className="flex h-[min(92dvh,1400px)] w-[calc(100vw-2rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(calc(100vw-4rem),1800px)]"
      >
        {/* Remounted per work, so the zoom starts where the viewer expects it. */}
        <ViewerShell key={work.id} work={work} liveHtml={liveHtml} />
      </DialogContent>
    </Dialog>
  );
}

function ViewerShell({ work, liveHtml }: { work: Work; liveHtml: boolean }) {
  const zoom = useZoomPan();
  const shell = useRef<HTMLDivElement | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);

  useEffect(() => {
    setCanFullscreen(document.fullscreenEnabled && typeof shell.current?.requestFullscreen === 'function');
    function onChange() {
      setFullscreen(document.fullscreenElement === shell.current);
    }
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await shell.current?.requestFullscreen();
    } catch {
      // Some browsers refuse full screen inside a dialog; the viewer is already near full screen.
      setCanFullscreen(false);
    }
  }

  const title = workTitle(work);
  const isInteractive = work.media.kind === 'html' && Boolean(work.media.animation);
  const canZoom = work.media.kind !== 'video' && !(isInteractive && liveHtml) && Boolean(stageStill(work.media));
  const explorerHost = hostOf(work.explorerUrl);

  return (
    <div ref={shell} data-slot="work-viewer" className="relative flex min-h-0 flex-1 flex-col bg-background">
      <DialogHeader className="gap-1 border-b px-4 py-3 pr-12">
        <DialogTitle className="truncate leading-snug" title={work.title}>
          {title}
        </DialogTitle>
        <DialogDescription className="font-mono text-xs">
          {CHAIN_LABELS[work.chain]} #{shortTokenId(work.tokenId, 20)}
        </DialogDescription>
      </DialogHeader>
      <DialogClose render={<Button variant="ghost" size="icon-sm" className="absolute top-2 right-2" />}>
        <XIcon aria-hidden />
        <span className="sr-only">Close the viewer</span>
      </DialogClose>

      <div data-slot="work-viewer-stage" className="relative min-h-0 flex-1 bg-muted/40">
        <ViewerStage work={work} liveHtml={liveHtml} zoom={canZoom ? zoom : null} />
      </div>

      <div data-slot="work-viewer-bar" className="flex flex-col gap-2 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          {canZoom ? (
            <ZoomControls controller={zoom} />
          ) : (
            <p className="text-sm text-muted-foreground">{MEDIA_KIND_LABELS[work.media.kind]}</p>
          )}
        </div>
        <div data-slot="work-viewer-actions" className="flex flex-wrap items-center gap-2">
          {canFullscreen ? (
            <Button variant="ghost" size="sm" onClick={toggleFullscreen} aria-pressed={fullscreen}>
              {fullscreen ? <MinimizeIcon aria-hidden data-icon="inline-start" /> : <MaximizeIcon aria-hidden data-icon="inline-start" />}
              {fullscreen ? 'Leave full screen' : 'Full screen'}
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<a href={work.explorerUrl} target="_blank" rel="noopener noreferrer" />}
          >
            Open on {explorerHost}
            <ExternalLinkIcon aria-hidden data-icon="inline-end" />
            <span className="sr-only">(opens in a new tab)</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

function ViewerStage({
  work,
  liveHtml,
  zoom,
}: {
  work: Work;
  liveHtml: boolean;
  zoom: ReturnType<typeof useZoomPan> | null;
}) {
  const { media } = work;
  const [video, setVideo] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [image, setImage] = useState<'loading' | 'ready' | 'failed'>('loading');
  // Video still plays, with its controls, but only on request when the
  // viewer asks their system for less motion.
  const reducedMotion = usePrefersReducedMotion();

  if (media.kind === 'html' && media.animation && liveHtml) {
    return (
      <LiveHtmlFrame
        work={work}
        enabled
        sizes="(min-width: 1864px) 1800px, 100vw"
        className="absolute inset-0 p-3"
        frameClassName="min-h-0 flex-1"
      />
    );
  }

  if (media.kind === 'video' && media.animation && video !== 'failed') {
    return (
      <>
        {video === 'loading' ? <StageSpinner label="Loading video" /> : null}
        <video
          className="absolute inset-0 size-full object-contain"
          src={media.animation}
          poster={posterFor(media.still)}
          aria-label={work.title}
          muted
          loop
          controls
          autoPlay={!reducedMotion}
          playsInline
          preload="metadata"
          onLoadedData={() => setVideo('ready')}
          onError={() => setVideo('failed')}
        />
      </>
    );
  }

  // Images show their largest still; HTML that is not running, and video
  // that failed to play, show the still.
  const src = stageStill(media);

  if (!src || image === 'failed') {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
        <ImageOffIcon aria-hidden className="size-6" />
        <p className="text-sm">{src ? 'The image did not load.' : 'No image is recorded for this work.'}</p>
      </div>
    );
  }

  const picture = (
    <Image
      src={src}
      alt={work.title}
      fill
      sizes="(min-width: 1864px) 1800px, 100vw"
      className={cn('object-contain p-2 sm:p-4', image === 'loading' && 'opacity-0')}
      onLoad={() => setImage('ready')}
      onError={() => setImage('failed')}
    />
  );

  return (
    <>
      {image === 'loading' ? <StageSpinner label="Loading image" /> : null}
      {zoom ? (
        <ZoomPanStage controller={zoom} label={work.title} className="absolute inset-0">
          {picture}
        </ZoomPanStage>
      ) : (
        picture
      )}
      {video === 'failed' ? (
        <div className="absolute inset-x-4 bottom-4 flex justify-center">
          <MediaErrorAlert host={media.animation ? hostOf(media.animation) : null} className="max-w-md" />
        </div>
      ) : null}
    </>
  );
}

function StageSpinner({ label }: { label: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-muted-foreground">
      <Spinner className="size-6" aria-label={label} />
    </div>
  );
}

/** What the viewer says when a video cannot be played: the still stays up and the source is named. */
export function MediaErrorAlert({ host, className }: { host: string | null; className?: string }) {
  return (
    <Alert className={className}>
      <TriangleAlertIcon aria-hidden />
      <AlertTitle>The video did not load</AlertTitle>
      <AlertDescription>
        {host ? `${host} did not answer. ` : null}
        Showing the still instead.
      </AlertDescription>
    </Alert>
  );
}
