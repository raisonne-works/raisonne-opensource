'use client';

import { ExternalLinkIcon, ImageOffIcon, Maximize2Icon, PlayIcon } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import type { Work } from '@/lib/types';
import { cn } from '@/lib/utils';

import { hostOf, stageVars, workTitle, WORK_STAGE_CLASS } from './lib';
import { LiveHtmlFrame } from './live-html-frame';
import { MediaStill } from './media-still';
import { MediaViewer } from './media-viewer';

const STAGE_ACTIONS = {
  image: { icon: Maximize2Icon, label: 'View larger' },
  video: { icon: PlayIcon, label: 'Play video' },
  html: { icon: Maximize2Icon, label: 'View larger' },
  unknown: { icon: Maximize2Icon, label: 'View larger' },
} as const;

/**
 * The work at the top of its page, whole and uncropped.
 *
 * An interactive work runs here, in a sandboxed frame, when the artist has
 * switched live HTML on; a visitor starts it from the still. Everything else
 * is a still that opens the viewer, where images zoom and pan and video
 * plays. Below sm the stage takes the work's own ratio: from the recorded
 * size when the data has one, otherwise from the still once it loads.
 */
export function WorkMedia({ work, liveHtml = false, className }: { work: Work; liveHtml?: boolean; className?: string }) {
  const { media } = work;
  const [measured, setMeasured] = useState<{ width: number; height: number } | null>(null);
  const action = STAGE_ACTIONS[media.kind];
  const Icon = action.icon;
  // The recorded size when the import has one, the loaded image's own size
  // when it does not: either way the stage ends up the shape of the work.
  const frameStyle = stageVars(media.width && media.height ? media : measured);
  const title = workTitle(work);

  // Live code runs in place, never inside a card and never on its own.
  if (media.kind === 'html' && media.animation && liveHtml) {
    return <LiveHtmlFrame work={work} enabled className={className} />;
  }

  const still = (
    <MediaStill
      as="span"
      media={media}
      alt={title}
      sizes="(min-width: 1280px) 70vw, 100vw"
      source="stage"
      priority
      className={cn('absolute inset-0 aspect-auto h-full w-full', className)}
      onNaturalSize={(width, height) => setMeasured({ width, height })}
    />
  );

  // A video with no usable still can still be played in the viewer; only a
  // work with no media at all falls back to the designed empty state.
  const canOpen = Boolean(media.still) || (media.kind === 'video' && Boolean(media.animation));

  if (!canOpen) {
    return (
      <div style={frameStyle} className={cn('flex rounded-lg bg-muted ring-1 ring-inset ring-border', WORK_STAGE_CLASS, className)}>
        <Empty className="m-auto">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ImageOffIcon aria-hidden />
            </EmptyMedia>
            <EmptyTitle>No media on-chain</EmptyTitle>
            <EmptyDescription>
              This token records nothing the catalogue can show. The explorer has the token itself.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<a href={work.explorerUrl} target="_blank" rel="noopener noreferrer" />}
            >
              View the token on {hostOf(work.explorerUrl)}
              <ExternalLinkIcon aria-hidden data-icon="inline-end" />
              <span className="sr-only">(opens in a new tab)</span>
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <MediaViewer
        work={work}
        liveHtml={liveHtml}
        trigger={
          <button
            type="button"
            style={frameStyle}
            aria-label={`${action.label}: ${title}`}
            className={cn(
              'group/work-media relative block cursor-zoom-in rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
              WORK_STAGE_CLASS,
            )}
          />
        }
      >
        {still}
        <span
          className={cn(
            'pointer-events-none absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-md bg-background/90 px-2 py-1 text-xs font-medium text-foreground ring-1 ring-foreground/10 transition-opacity',
            // Video works always say so; stills reveal the hint on hover or focus.
            media.kind !== 'video' &&
              'md:opacity-0 md:group-hover/work-media:opacity-100 md:group-focus-visible/work-media:opacity-100',
          )}
        >
          <Icon aria-hidden className="size-3.5" />
          {action.label}
        </span>
      </MediaViewer>
      {media.kind === 'html' && media.animation ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">This site shows interactive works as stills.</p>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<a href={media.animation} target="_blank" rel="noopener noreferrer" />}
          >
            Open the live work
            <ExternalLinkIcon aria-hidden data-icon="inline-end" />
            <span className="sr-only">(opens in a new tab)</span>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
