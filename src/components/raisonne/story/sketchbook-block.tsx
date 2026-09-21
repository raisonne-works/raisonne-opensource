import { GRID_CLASS, GRID_SIZES } from '@/components/raisonne/works/lib';
import type { HeadingLevel } from '@/components/raisonne/shell/heading';
import type { StoryBlock } from '@/lib/types';
import { cn } from '@/lib/utils';

import { AssetImage } from './asset';

export type SketchbookStoryBlock = Extract<StoryBlock, { type: 'sketchbook' }>;

/**
 * Studies and sketches in the same dense grid the catalogue uses for works:
 * two columns on a phone, six on a 2560 px screen. They are read as a set
 * rather than one at a time, so captions stay off the tiles and the alt text
 * carries what each one is.
 */
export function SketchbookBlock({
  block,
  headingLevel = 2,
  className,
}: {
  block: SketchbookStoryBlock;
  headingLevel?: HeadingLevel;
  className?: string;
}) {
  const Heading = `h${headingLevel}` as const;
  if (block.items.length === 0) return null;

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {block.title ? (
        <Heading className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">{block.title}</Heading>
      ) : null}
      <ul className={GRID_CLASS}>
        {block.items.map((asset, index) => (
          <li key={`${asset.src}-${index}`} className="min-w-0">
            <AssetImage asset={asset} sizes={GRID_SIZES} fit="cover" ratio="square" />
          </li>
        ))}
      </ul>
    </div>
  );
}
