import { FilmIcon } from 'lucide-react';

import type { HeadingLevel } from '@/components/raisonne/shell/heading';
import { READING_CLASS } from '@/components/raisonne/shell/measure';
import type { StoryBlock } from '@/lib/types';
import { cn } from '@/lib/utils';

import { AssetVideo } from './asset';

export type FilmStoryBlock = Extract<StoryBlock, { type: 'film' }>;

/** Seconds to "4 min", or "0:45" for anything under a minute. */
function runtime(seconds: number | null | undefined): string | null {
  if (!seconds || seconds <= 0) return null;
  if (seconds < 60) return `0:${String(Math.round(seconds)).padStart(2, '0')}`;
  return `${Math.round(seconds / 60)} min`;
}

/**
 * A documentary or making-of film: its title, what it is, and the film
 * itself behind its poster. Nothing downloads until the visitor presses
 * play, and the file it then loads is the one that suits their screen.
 */
export function FilmBlock({
  block,
  headingLevel = 2,
  className,
}: {
  block: FilmStoryBlock;
  headingLevel?: HeadingLevel;
  className?: string;
}) {
  const Heading = `h${headingLevel}` as const;
  const length = runtime(block.video.duration);

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {block.title || block.description ? (
        <div className={cn('flex flex-col gap-2', READING_CLASS)}>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <FilmIcon aria-hidden className="size-4" />
            Film{length ? `, ${length}` : null}
          </p>
          {block.title ? (
            <Heading className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">{block.title}</Heading>
          ) : null}
          {block.description ? <p className="text-base/relaxed text-pretty">{block.description}</p> : null}
        </div>
      ) : null}
      <AssetVideo asset={block.video} label={block.title ?? 'Film'} frameClassName="max-h-[80svh]" />
    </div>
  );
}
