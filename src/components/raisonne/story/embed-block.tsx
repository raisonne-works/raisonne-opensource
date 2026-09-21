'use client';

import { useState } from 'react';
import { ArrowUpRightIcon, PlayIcon } from 'lucide-react';

import type { HeadingLevel } from '@/components/raisonne/shell/heading';
import { READING_CLASS } from '@/components/raisonne/shell/measure';
import { hostOf } from '@/components/raisonne/works/lib';
import { Button } from '@/components/ui/button';
import type { Asset, StoryBlock } from '@/lib/types';
import { cn } from '@/lib/utils';

import { AssetPlate } from './asset';
import { EMBED_ALLOW, EMBED_PROVIDER_LABEL, embedPlayerUrl } from './embed-url';

export type EmbedStoryBlock = Extract<StoryBlock, { type: 'embed' }>;

/**
 * A video or a post published somewhere else. Nothing is requested from the
 * other site until the visitor asks for it: before that the block is a
 * poster, a title, the context the artist wrote and the attribution, all of
 * it in the page's own markup, so it reads with JavaScript switched off and
 * no third party learns that the page was opened.
 *
 * A post that cannot be framed without loading a script (X) is a link out
 * instead of an embed, which is the same decision for the visitor's privacy.
 */
export function EmbedBlock({
  block,
  headingLevel = 2,
  className,
}: {
  block: EmbedStoryBlock;
  headingLevel?: HeadingLevel;
  className?: string;
}) {
  const Heading = `h${headingLevel}` as const;
  const [playing, setPlaying] = useState(false);
  const player = embedPlayerUrl(block.url, block.provider);
  const host = hostOf(block.url);

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <div className={cn('flex flex-col gap-2', READING_CLASS)}>
        <p className="text-sm text-muted-foreground">{EMBED_PROVIDER_LABEL[block.provider]}</p>
        <Heading className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">{block.title}</Heading>
        {block.context ? <p className="text-base/relaxed text-pretty">{block.context}</p> : null}
        {block.attribution ? <p className="text-sm text-muted-foreground">{block.attribution}</p> : null}
      </div>

      {playing && player ? (
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted dark:bg-muted/40">
          <iframe
            src={player}
            title={block.title}
            allow={EMBED_ALLOW}
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="absolute inset-0 size-full border-0"
          />
        </div>
      ) : (
        <EmbedPoster
          poster={block.poster}
          title={block.title}
          host={host}
          url={block.url}
          onPlay={player ? () => setPlaying(true) : null}
        />
      )}
    </div>
  );
}

function EmbedPoster({
  poster,
  title,
  host,
  url,
  onPlay,
}: {
  poster: Asset | null;
  title: string;
  host: string;
  url: string;
  /** Null when the post cannot be framed, so the action opens the source instead. */
  onPlay: (() => void) | null;
}) {
  const action = onPlay ? (
    <Button onClick={onPlay} size="lg">
      <PlayIcon aria-hidden data-icon="inline-start" />
      Play {title}
    </Button>
  ) : (
    <Button
      size="lg"
      nativeButton={false}
      render={<a href={url} target="_blank" rel="noopener noreferrer" />}
    >
      Open on {host}
      <ArrowUpRightIcon aria-hidden data-icon="inline-end" />
      <span className="sr-only">(opens in a new tab)</span>
    </Button>
  );

  if (!poster) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-6">
        <p className="text-sm text-muted-foreground">
          {onPlay
            ? `Nothing is loaded from ${host} until you press play.`
            : `This one is published on ${host} and opens there.`}
        </p>
        {action}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <AssetPlate asset={poster} sizes="(min-width: 1280px) 60vw, 100vw" alt="" className="max-h-[70svh]" />
      <div className="flex flex-wrap items-center gap-3">
        {action}
        <p className="text-sm text-muted-foreground">
          {onPlay ? `Nothing is loaded from ${host} until you press play.` : `Published on ${host}.`}
        </p>
      </div>
    </div>
  );
}
