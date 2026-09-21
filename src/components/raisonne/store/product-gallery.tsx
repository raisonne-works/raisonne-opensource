'use client';

import Image from 'next/image';
import { useState } from 'react';
import { ImageOffIcon } from 'lucide-react';

import { AssetVideo } from '@/components/raisonne/story/asset';
import { MEDIA_FRAME_CLASS } from '@/components/raisonne/works/lib';
import type { Asset } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * The pictures of a product: one large, the rest as thumbnails under it.
 *
 * A print is bought on its picture, so the large frame keeps the photograph
 * at its own proportions rather than cropping it to a square, and the
 * thumbnails are real buttons with real labels, so the gallery can be walked
 * with a keyboard. With one picture there are no thumbnails at all.
 */
export function ProductGallery({
  assets,
  title,
  className,
}: {
  assets: Asset[];
  /** Names the pictures for anyone who cannot see them. */
  title: string;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const current = assets[Math.min(index, assets.length - 1)] ?? null;

  if (!current) {
    return (
      <div
        className={cn(
          'flex aspect-4/3 w-full items-center justify-center rounded-lg text-muted-foreground',
          MEDIA_FRAME_CLASS,
          className,
        )}
      >
        <span className="flex flex-col items-center gap-2 text-center">
          <ImageOffIcon aria-hidden="true" className="size-5" />
          <span className="text-xs">No picture of this yet</span>
        </span>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {current.kind === 'video' ? (
        <AssetVideo asset={current} label={`${title}, video`} />
      ) : (
        <div className={cn('relative aspect-4/3 w-full overflow-hidden rounded-lg', MEDIA_FRAME_CLASS)}>
          <Image
            src={current.src}
            alt={current.alt ?? title}
            fill
            priority={index === 0}
            sizes="(min-width: 1280px) 55vw, 100vw"
            className="object-contain"
          />
        </div>
      )}

      {current.caption ? <p className="text-xs text-muted-foreground">{current.caption}</p> : null}

      {assets.length > 1 ? (
        <ul className="flex flex-wrap gap-2">
          {assets.map((asset, position) => {
            const thumb = asset.kind === 'video' ? asset.poster : asset.src;
            const selected = position === index;
            return (
              <li key={`${asset.src}-${position}`}>
                <button
                  type="button"
                  onClick={() => setIndex(position)}
                  aria-current={selected ? 'true' : undefined}
                  aria-label={`Picture ${position + 1} of ${assets.length}${asset.alt ? `, ${asset.alt}` : ''}`}
                  className={cn(
                    'relative size-16 overflow-hidden rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                    MEDIA_FRAME_CLASS,
                    selected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'opacity-70 hover:opacity-100',
                  )}
                >
                  {thumb ? (
                    <Image src={thumb} alt="" fill sizes="64px" className="object-cover" />
                  ) : (
                    <span className="flex size-full items-center justify-center text-muted-foreground">
                      <ImageOffIcon aria-hidden="true" className="size-4" />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
