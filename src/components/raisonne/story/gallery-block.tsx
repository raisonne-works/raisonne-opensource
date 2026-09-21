import type { HeadingLevel } from '@/components/raisonne/shell/heading';
import type { Asset, StoryBlock } from '@/lib/types';
import { cn } from '@/lib/utils';

import { AssetFigure } from './asset';

export type GalleryStoryBlock = Extract<StoryBlock, { type: 'gallery' }>;

/** Captioned photos and videos: one column on a phone, then two, three and four as the screen widens. */
export const GALLERY_GRID_CLASS = 'grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4';

export const GALLERY_SIZES =
  '(min-width: 1920px) 24vw, (min-width: 1280px) 32vw, (min-width: 640px) 48vw, calc(100vw - 2rem)';

/**
 * Installation views, exhibition photographs and process shots, each with
 * its caption. The block's own title sits on the left and the aside (a
 * venue, a credit) on the right, the way a plate list reads.
 *
 * Captions carry the credit lines a museum image needs, so they are part of
 * the figure rather than a tooltip.
 */
export function GalleryBlock({
  block,
  headingLevel = 2,
  className,
}: {
  block: GalleryStoryBlock;
  headingLevel?: HeadingLevel;
  className?: string;
}) {
  const Heading = `h${headingLevel}` as const;
  if (block.items.length === 0) return null;

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {block.title || block.aside ? (
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
          {block.title ? (
            <Heading className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">{block.title}</Heading>
          ) : (
            <span />
          )}
          {block.aside ? <p className="text-sm text-muted-foreground">{block.aside}</p> : null}
        </div>
      ) : null}

      <AssetGallery items={block.items} />
    </div>
  );
}

/**
 * Captioned assets in the gallery grid. Pages use it for the photographs and
 * videos a record carries outside its story blocks.
 */
export function AssetGallery({ items, className }: { items: Asset[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <ul className={cn(GALLERY_GRID_CLASS, className)}>
      {items.map((asset, index) => (
        <li key={`${asset.src}-${index}`} className="min-w-0">
          <AssetFigure asset={asset} sizes={GALLERY_SIZES} />
        </li>
      ))}
    </ul>
  );
}
