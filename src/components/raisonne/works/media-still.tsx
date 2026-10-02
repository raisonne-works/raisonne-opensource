'use client';

import Image from 'next/image';
import { ImageOffIcon } from 'lucide-react';
import { useState } from 'react';

import type { Media } from '@/lib/types';
import { cn } from '@/lib/utils';

import { isAnimatedImage, MEDIA_FRAME_CLASS, stageStill } from './lib';

/**
 * The still of a work or a series cover, in a frame the caller sizes
 * (square by default; pass an aspect or height class to change it).
 *
 * Pass alt="" when a caption next to the frame already names the work (cards).
 *
 * Grids use media.still and never load animated originals (a GIF counts as
 * one, so it is not shown). A work page's stage passes source="stage" for the
 * full-size still of an image work. When there is no still, or it fails to
 * load (IPFS gateways do), the frame shows a quiet "no image" state instead
 * of a broken image.
 *
 * Inside a button or a link, pass as="span" so the markup stays valid.
 */
export function MediaStill({
  media,
  alt,
  sizes,
  className,
  priority = false,
  fit = 'contain',
  fill = false,
  source = 'still',
  emptyLabel,
  as: Frame = 'div',
  onNaturalSize,
}: {
  media: Media | null;
  alt: string;
  sizes: string;
  className?: string;
  /** For the first media above the fold: loads eagerly at high priority. */
  priority?: boolean;
  /** contain shows the whole work (the default for artworks); cover fills the frame (series covers). */
  fit?: 'contain' | 'cover';
  /** Fill the parent instead of forcing a square. The parent must have a height. */
  fill?: boolean;
  /** still for cards and grids; stage for the large frame on a work page. */
  source?: 'still' | 'stage';
  /**
   * What the frame says when there is no image, in the record's own words.
   * An exhibition photograph was never on a chain, so a show must not be
   * told it is "not found on-chain".
   */
  emptyLabel?: string;
  as?: 'div' | 'span';
  /** Called with the loaded image's own size, for frames that follow the work's ratio. */
  onNaturalSize?: (width: number, height: number) => void;
}) {
  const raw = media ? (source === 'stage' ? stageStill(media) : media.still) : null;
  const src = raw && !isAnimatedImage(raw) ? raw : null;
  // Remember which src failed, so a new src gets a fresh try without an effect.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = src !== null && failedSrc === src;

  return (
    <Frame
      data-slot="media-still"
      className={cn(
        'relative block w-full overflow-hidden',
        fill ? 'absolute inset-0 h-full rounded-none' : 'aspect-square rounded-lg',
        MEDIA_FRAME_CLASS,
        className,
      )}
    >
      {src && !failed ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          onError={() => setFailedSrc(src)}
          onLoad={
            onNaturalSize
              ? event => {
                  const { naturalWidth, naturalHeight } = event.currentTarget;
                  if (naturalWidth > 0 && naturalHeight > 0) onNaturalSize(naturalWidth, naturalHeight);
                }
              : undefined
          }
          className={fit === 'cover' ? 'object-cover' : 'object-contain'}
        />
      ) : (
        <MediaStillEmpty
          as={Frame}
          alt={alt}
          label={emptyLabel}
          reason={failed ? 'failed' : media?.kind === 'unknown' || !media ? 'missing' : 'no-still'}
        />
      )}
    </Frame>
  );
}

/**
 * The frame with nothing in it. It is quiet on purpose: a grid where half the
 * records have no photograph should read as a grid of records, not as a wall
 * of error boxes, so the mark is small and the words are grey.
 */
function MediaStillEmpty({
  alt,
  reason,
  label,
  as: Frame,
}: {
  alt: string;
  reason: 'failed' | 'missing' | 'no-still';
  /** The caller's own words for a missing picture. */
  label?: string;
  as: 'div' | 'span';
}) {
  const text = reason === 'failed' ? 'Image did not load' : (label ?? 'No image yet');
  return (
    <Frame
      {...(alt ? { role: 'img', 'aria-label': `${alt}. ${text}.` } : { 'aria-hidden': true })}
      className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-4 text-center text-muted-foreground/70"
    >
      <ImageOffIcon aria-hidden className="size-4" />
      <span className="text-xs text-pretty">{text}</span>
    </Frame>
  );
}
