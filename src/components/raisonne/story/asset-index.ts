import type { Asset, StoryBlock } from '@/lib/types';

/**
 * Which pictures a record's story already shows.
 *
 * A record carries its photographs and videos in two places: its own
 * `photos` and `videos` fields, and the story blocks the artist arranged.
 * The same file is often in both. Pages show the story as the artist built
 * it and then only what it left out, so nothing appears twice.
 */

function collect(block: StoryBlock, into: Set<string>): void {
  switch (block.type) {
    case 'media':
      into.add(block.asset.src);
      break;
    case 'gallery':
    case 'sketchbook':
      for (const asset of block.items) into.add(asset.src);
      break;
    case 'film':
      into.add(block.video.src);
      break;
    case 'process':
      if (block.asset) into.add(block.asset.src);
      break;
    case 'embed':
      if (block.poster) into.add(block.poster.src);
      break;
    case 'chapter':
      if (block.background) into.add(block.background.src);
      break;
    case 'immersive':
      into.add(block.video.src);
      if (block.poster) into.add(block.poster.src);
      break;
    default:
      break;
  }
}

export function storyAssetSources(blocks: StoryBlock[]): Set<string> {
  const sources = new Set<string>();
  for (const block of blocks) collect(block, sources);
  return sources;
}

/**
 * The record's own assets that the story does not already show, with
 * duplicates and the cover removed.
 */
export function assetsBeyondStory(
  assets: (Asset | null | undefined)[],
  blocks: StoryBlock[],
  cover?: Asset | null,
): Asset[] {
  const seen = storyAssetSources(blocks);
  if (cover) seen.add(cover.src);
  const out: Asset[] = [];
  for (const asset of assets) {
    if (!asset || seen.has(asset.src)) continue;
    seen.add(asset.src);
    out.push(asset);
  }
  return out;
}
