import type { StoryBlock } from '@/lib/types';
import { cn } from '@/lib/utils';

import { AssetFigure } from './asset';

export type MediaStoryBlock = Extract<StoryBlock, { type: 'media' }>;

/**
 * One image or one video. A picture keeps its own proportions and is capped
 * at most of the viewport, so a portrait photograph neither fills the screen
 * nor sits between two grey bands. The caption goes under it.
 */
export function MediaBlock({
  block,
  priority = false,
  className,
}: {
  block: MediaStoryBlock;
  priority?: boolean;
  className?: string;
}) {
  return (
    <AssetFigure
      asset={block.asset}
      sizes="(min-width: 2976px) 2880px, 100vw"
      priority={priority}
      plate
      frameClassName="max-h-[80svh]"
      className={cn('w-full', className)}
    />
  );
}
