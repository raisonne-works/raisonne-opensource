import type { ReactNode } from 'react';

import type { HeadingLevel } from '@/components/raisonne/shell/heading';
import { FactsTableSkeleton } from '@/components/raisonne/shell/facts';
import { resolveRecordRefs } from '@/components/raisonne/records/resolve';
import { Skeleton } from '@/components/ui/skeleton';
import { getPressByIds, getSettings } from '@/fixtures';
import { isModuleEnabled } from '@/lib/records';
import type { StoryBlock } from '@/lib/types';
import { cn } from '@/lib/utils';

import { ChapterBlock } from './chapter-block';
import { EmbedBlock } from './embed-block';
import { FilmBlock } from './film-block';
import { GalleryBlock } from './gallery-block';
import { ImmersiveBlock } from './immersive-block';
import { MediaBlock } from './media-block';
import { PressBlock } from './press-block';
import { ProcessBlock } from './process-block';
import { RelatedBlock } from './related-block';
import { SketchbookBlock } from './sketchbook-block';
import { TextBlock } from './text-block';

/**
 * The documentation on a record's page: the artist's own text, the photos,
 * the film, the press and the records it points at, in the order the artist
 * put them in.
 *
 * Every page that is not a token is built from these blocks, so a series, a
 * show and a collaboration document themselves the same way.
 *
 * The first text block sits beside `aside` (the record's facts) from xl up,
 * because the opening paragraph and the record read together. Everything
 * after it takes the full width.
 *
 * A block type this version does not know renders nothing and says so once
 * in development, so adding a block in the CMS can never take a page down.
 */
export function StoryBlocks({
  blocks,
  aside,
  headingLevel = 2,
  className,
}: {
  blocks: StoryBlock[];
  /** The record's facts, placed beside the opening text. */
  aside?: ReactNode;
  headingLevel?: HeadingLevel;
  className?: string;
}) {
  if (blocks.length === 0 && !aside) return null;

  const immersiveRooms = isModuleEnabled(getSettings(), 'immersive-rooms');
  const firstTextIndex = aside ? blocks.findIndex(block => block.type === 'text') : -1;

  return (
    <div className={cn('flex flex-col gap-12 md:gap-16', className)}>
      {aside && firstTextIndex === -1 ? <div>{aside}</div> : null}

      {blocks.map((block, index) => {
        const rendered = renderBlock(block, headingLevel, immersiveRooms);
        if (!rendered) return null;

        if (index === firstTextIndex) {
          return (
            <div key={block.id} className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start xl:gap-12">
              <div id={block.id} className="min-w-0 scroll-mt-24">
                {rendered}
              </div>
              <div className="min-w-0 xl:sticky xl:top-20 xl:self-start">{aside}</div>
            </div>
          );
        }

        return (
          <div key={block.id} id={block.id} className="min-w-0 scroll-mt-24">
            {rendered}
          </div>
        );
      })}
    </div>
  );
}

function renderBlock(block: StoryBlock, headingLevel: HeadingLevel, immersiveRooms: boolean): ReactNode {
  switch (block.type) {
    case 'text':
      return <TextBlock block={block} headingLevel={headingLevel} />;
    case 'media':
      return <MediaBlock block={block} />;
    case 'gallery':
      return <GalleryBlock block={block} headingLevel={headingLevel} />;
    case 'film':
      return <FilmBlock block={block} headingLevel={headingLevel} />;
    case 'press':
      return <PressBlock block={block} items={getPressByIds(block.pressIds)} headingLevel={headingLevel} />;
    case 'process':
      return <ProcessBlock block={block} headingLevel={headingLevel} />;
    case 'sketchbook':
      return <SketchbookBlock block={block} headingLevel={headingLevel} />;
    case 'related':
      return <RelatedBlock block={block} previews={resolveRecordRefs(block.refs)} headingLevel={headingLevel} />;
    case 'embed':
      return <EmbedBlock block={block} headingLevel={headingLevel} />;
    case 'chapter':
      return <ChapterBlock block={block} headingLevel={headingLevel} />;
    case 'immersive':
      // Without the module the recording is shown as plain media, which is
      // what it is: the page never promises a room it cannot open.
      return immersiveRooms ? (
        <ImmersiveBlock block={block} headingLevel={headingLevel} />
      ) : (
        <MediaBlock block={{ type: 'media', id: block.id, asset: posterFirst(block) }} />
      );
    default:
      warnUnknownBlock(block);
      return null;
  }
}

/** The room's video with its own poster, so the still is the artist's choice and not a frame grab. */
function posterFirst(block: Extract<StoryBlock, { type: 'immersive' }>) {
  return block.poster ? { ...block.video, poster: block.poster.src } : block.video;
}

const warnedTypes = new Set<string>();

/**
 * A CMS can add a block type before the theme knows it. The page carries on
 * without it, and a developer hears about it once per type rather than once
 * per render.
 */
function warnUnknownBlock(block: never): void {
  if (process.env.NODE_ENV === 'production') return;
  const type = (block as { type?: string } | null)?.type ?? 'unknown';
  if (warnedTypes.has(type)) return;
  warnedTypes.add(type);
  console.warn(`[raisonne] story block "${type}" has no renderer in this version, so it was left out of the page.`);
}

/** The shape of a documented page while it loads: a paragraph, a picture, a row of tiles. */
export function StoryBlocksSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-12 md:gap-16', className)} role="status" aria-label="Loading the page">
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem] xl:gap-12">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <FactsTableSkeleton />
      </div>
      <Skeleton className="aspect-video w-full rounded-lg" />
    </div>
  );
}
