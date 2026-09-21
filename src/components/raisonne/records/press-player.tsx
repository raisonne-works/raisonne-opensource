'use client';

import { getImageProps } from 'next/image';
import { useState } from 'react';
import { ArrowUpRightIcon, HeadphonesIcon, PlayIcon } from 'lucide-react';

import { AssetPlate } from '@/components/raisonne/story/asset';
import { EMBED_ALLOW, embedPlayerUrl } from '@/components/raisonne/story/embed-url';
import { hostOf } from '@/components/raisonne/works/lib';
import { Button } from '@/components/ui/button';
import type { PressItem } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * An interview or an episode played on the page.
 *
 * A file the artist uploaded plays in the browser's own player. A video
 * published on YouTube or Vimeo loads only once the visitor presses play, so
 * opening the page tells the other site nothing. Anything else is a link to
 * where it lives, which is honest about what the site can and cannot play.
 */
export function PressPlayer({ item, className }: { item: PressItem; className?: string }) {
  const [playing, setPlaying] = useState(false);
  const kind = item.kind ?? 'article';
  const poster = item.image;
  const player = item.embedUrl ? embedPlayerUrl(item.embedUrl) : null;
  const sourceUrl = item.embedUrl ?? item.url;
  const host = sourceUrl ? hostOf(sourceUrl) : null;

  if (item.mediaUrl && kind === 'podcast') {
    return (
      <div className={cn('flex flex-col gap-3', className)}>
        <audio controls preload="none" src={item.mediaUrl} className="w-full">
          <a href={item.mediaUrl}>Download the audio</a>
        </audio>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <HeadphonesIcon aria-hidden className="size-4" />
          {item.minutes ? `${item.minutes} min` : 'Episode'}
        </p>
      </div>
    );
  }

  if (item.mediaUrl) {
    return (
      <div className={cn('relative aspect-video w-full overflow-hidden rounded-lg bg-muted dark:bg-muted/40', className)}>
        <video
          className="absolute inset-0 size-full object-contain"
          controls
          playsInline
          preload="none"
          poster={poster ? getImageProps({ src: poster.src, alt: '', width: 1600, height: 900 }).props.src : undefined}
          aria-label={item.title}
          src={item.mediaUrl}
        />
      </div>
    );
  }

  if (playing && player) {
    return (
      <div className={cn('relative aspect-video w-full overflow-hidden rounded-lg bg-muted dark:bg-muted/40', className)}>
        <iframe
          src={player}
          title={item.title}
          allow={EMBED_ALLOW}
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="absolute inset-0 size-full border-0"
        />
      </div>
    );
  }

  const action = player ? (
    <Button size="lg" onClick={() => setPlaying(true)}>
      <PlayIcon aria-hidden data-icon="inline-start" />
      Play
    </Button>
  ) : sourceUrl ? (
    <Button size="lg" nativeButton={false} render={<a href={sourceUrl} target="_blank" rel="noopener noreferrer" />}>
      {kind === 'podcast' ? 'Listen' : 'Watch'} on {host}
      <ArrowUpRightIcon aria-hidden data-icon="inline-end" />
      <span className="sr-only">(opens in a new tab)</span>
    </Button>
  ) : null;

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {poster ? (
        <AssetPlate asset={poster} sizes="(min-width: 1280px) 60vw, 100vw" alt="" className="max-h-[70svh]" />
      ) : null}
      {action ? (
        <div className="flex flex-wrap items-center gap-3">
          {action}
          {host ? (
            <p className="text-sm text-muted-foreground">
              {player ? `Nothing is loaded from ${host} until you press play.` : `Published on ${host}.`}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
