import { BoxIcon } from 'lucide-react';

import type { HeadingLevel } from '@/components/raisonne/shell/heading';
import { READING_CLASS } from '@/components/raisonne/shell/measure';
import type { Asset, StoryBlock } from '@/lib/types';
import { cn } from '@/lib/utils';

import { AssetVideo } from './asset';

export type ImmersiveStoryBlock = Extract<StoryBlock, { type: 'immersive' }>;

const ROOM_LABEL: Record<ImmersiveStoryBlock['room'], string> = {
  cylinder: 'Cylindrical room',
  gallery: 'Gallery room',
};

/**
 * A work made for a room. The catalogue shows the recording of it: the
 * poster first, the video when the visitor presses play, and a line saying
 * what the room was, because a flat video of a curved wall needs the
 * explanation.
 *
 * Wave 1 ships no 3D engine. When the immersive-rooms module lands, this is
 * the block that grows a walk-in view; until then the recording is the
 * honest version rather than a placeholder for one.
 */
export function ImmersiveBlock({
  block,
  headingLevel = 2,
  className,
}: {
  block: ImmersiveStoryBlock;
  headingLevel?: HeadingLevel;
  className?: string;
}) {
  const Heading = `h${headingLevel}` as const;
  // The block's own poster wins over whatever the video file carries.
  const video: Asset = block.poster ? { ...block.video, poster: block.poster.src } : block.video;

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <div data-slot="immersive-head" className={cn('flex flex-col gap-2', READING_CLASS)}>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <BoxIcon aria-hidden className="size-4" />
          {ROOM_LABEL[block.room]}
        </p>
        {block.title ? (
          <Heading className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">{block.title}</Heading>
        ) : null}
        <p className="text-sm text-pretty text-muted-foreground">
          The work was made for a room. This is the recording of it, shown flat.
        </p>
      </div>
      <AssetVideo asset={video} label={block.title ?? 'Immersive room'} frameClassName="max-h-[80svh]" />
    </div>
  );
}
