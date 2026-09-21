import Image, { getImageProps } from 'next/image';

import { Skeleton } from '@/components/ui/skeleton';
import type { Asset } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * How a documentation asset (a photo, an installation video, a film) is put
 * on a page. Story blocks, record heroes and the commissions page all render
 * through these three, so an image is sized the same way everywhere and a
 * video never starts on its own.
 *
 * Images go through next/image with the sizes the caller knows. Videos are
 * plain elements with controls and preload="none": nothing is fetched until
 * the visitor presses play, the poster is all that loads, and the page needs
 * no JavaScript for any of it.
 */

/** The frame's shape: the asset's own ratio when the importer recorded it. */
export function assetRatioStyle(asset: Pick<Asset, 'width' | 'height'>): React.CSSProperties | undefined {
  const { width, height } = asset;
  if (!width || !height || width <= 0 || height <= 0) return undefined;
  return { aspectRatio: `${width} / ${height}` };
}

/** Alt text: the recorded one, the caption as a fallback, empty when a caption already says it. */
function altFor(asset: Asset, fallback: string | null): string {
  return asset.alt ?? fallback ?? '';
}

/** The shape of a frame: the asset's own ratio, or one the caller fixes for a grid. */
export type AssetRatio = 'natural' | 'square' | 'video';

const RATIO_CLASS: Record<Exclude<AssetRatio, 'natural'>, string> = {
  square: 'aspect-square',
  video: 'aspect-video',
};

export function AssetImage({
  asset,
  sizes,
  alt,
  priority = false,
  fit = 'contain',
  ratio = 'natural',
  className,
  frameClassName,
}: {
  asset: Asset;
  sizes: string;
  /** Overrides the asset's own alt text. Pass "" when a caption beside it says the same. */
  alt?: string;
  priority?: boolean;
  fit?: 'contain' | 'cover';
  /** natural keeps the asset's proportions; a grid of tiles fixes one instead. */
  ratio?: AssetRatio;
  className?: string;
  frameClassName?: string;
}) {
  const natural = ratio === 'natural' ? assetRatioStyle(asset) : undefined;
  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-lg bg-muted dark:bg-muted/40',
        ratio === 'natural' ? (natural ? null : 'aspect-video') : RATIO_CLASS[ratio],
        frameClassName,
        className,
      )}
      style={natural}
    >
      <Image
        src={asset.src}
        alt={alt ?? altFor(asset, null)}
        fill
        sizes={sizes}
        priority={priority}
        className={fit === 'cover' ? 'object-cover' : 'object-contain'}
      />
    </div>
  );
}

/**
 * One picture at its own proportions, centred, never taller than the cap.
 *
 * A frame with a fixed height letterboxes anything that is not its shape: a
 * square photograph in a wide frame sits between two grey bands. A plate has
 * no frame at all, so the picture is the shape it is and the page is as tall
 * as the picture needs. Heroes and full-width media use this; grids, where
 * tiles have to line up, use AssetImage.
 */
export function AssetPlate({
  asset,
  sizes,
  alt,
  priority = false,
  className,
}: {
  asset: Asset;
  sizes: string;
  alt?: string;
  priority?: boolean;
  /** The height cap, e.g. max-h-[70svh]. */
  className?: string;
}) {
  return (
    <Image
      src={asset.src}
      alt={alt ?? altFor(asset, null)}
      // Intrinsic size, so width follows height and nothing is letterboxed.
      width={asset.width ?? 1600}
      height={asset.height ?? 1200}
      sizes={sizes}
      priority={priority}
      className={cn('mx-auto h-auto max-h-[70svh] w-auto max-w-full rounded-lg object-contain', className)}
    />
  );
}

/** The optimized poster for a video, so a 20 MB still is not the first thing a visitor downloads. */
function posterSrc(asset: Asset): string | undefined {
  const poster = asset.poster ?? (asset.kind === 'image' ? asset.src : null);
  if (!poster) return undefined;
  return getImageProps({ src: poster, alt: '', width: 1600, height: 900 }).props.src;
}

/**
 * The sources a player can choose from, smallest first. Encoded renditions
 * carry a height each, so a phone is never handed a 1080p file; the original
 * is the last source, for a screen wider than every rendition.
 */
function videoSources(asset: Asset): { src: string; media?: string }[] {
  const renditions = [...(asset.renditions ?? [])].sort((a, b) => a.height - b.height);
  const sources: { src: string; media?: string }[] = [];
  const seen = new Set<string>();

  for (const rendition of renditions.slice(0, -1)) {
    if (seen.has(rendition.src)) continue;
    seen.add(rendition.src);
    sources.push({ src: rendition.src, media: `(max-width: ${rendition.height * 2}px)` });
  }

  const largest = renditions.at(-1);
  const fallback = largest?.src ?? asset.src;
  if (!seen.has(fallback)) {
    seen.add(fallback);
    sources.push({ src: fallback });
  }
  if (!seen.has(asset.src)) sources.push({ src: asset.src });

  return sources;
}

export function AssetVideo({
  asset,
  label,
  className,
  frameClassName,
}: {
  asset: Asset;
  /** Names the video for screen readers when no caption does. */
  label?: string | null;
  className?: string;
  frameClassName?: string;
}) {
  const ratio = assetRatioStyle(asset);
  const sources = videoSources(asset);

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-lg bg-muted dark:bg-muted/40',
        ratio ? null : 'aspect-video',
        frameClassName,
        className,
      )}
      style={ratio}
    >
      {/* No autoplay and no preload: the poster is the whole page weight until play is pressed. */}
      <video
        className="absolute inset-0 size-full object-contain"
        controls
        playsInline
        preload="none"
        poster={posterSrc(asset)}
        aria-label={label ?? asset.alt ?? asset.caption ?? 'Video'}
      >
        {sources.map(source => (
          <source key={source.src} src={source.src} media={source.media} />
        ))}
      </video>
    </div>
  );
}

/**
 * One asset with its caption: an image or a video, whichever the record
 * carries. The caption is the figure's caption, so the picture and the words
 * about it stay one thing for a screen reader too.
 */
export function AssetFigure({
  asset,
  sizes,
  priority = false,
  fit = 'contain',
  ratio = 'natural',
  plate = false,
  alt,
  className,
  frameClassName,
  captionClassName,
}: {
  asset: Asset;
  sizes: string;
  priority?: boolean;
  fit?: 'contain' | 'cover';
  ratio?: AssetRatio;
  /** One picture on its own: no frame, so nothing is letterboxed. See AssetPlate. */
  plate?: boolean;
  alt?: string;
  className?: string;
  /** The frame's classes; in plate mode they land on the picture, which is the only box there is. */
  frameClassName?: string;
  captionClassName?: string;
}) {
  return (
    <figure className={cn('flex min-w-0 flex-col gap-2', className)}>
      {asset.kind === 'video' ? (
        <AssetVideo asset={asset} frameClassName={frameClassName} />
      ) : plate ? (
        <AssetPlate
          asset={asset}
          sizes={sizes}
          priority={priority}
          alt={alt ?? (asset.caption ? altFor(asset, null) : undefined)}
          className={frameClassName}
        />
      ) : (
        <AssetImage
          asset={asset}
          sizes={sizes}
          priority={priority}
          fit={fit}
          ratio={ratio}
          alt={alt ?? (asset.caption ? altFor(asset, null) : undefined)}
          frameClassName={frameClassName}
        />
      )}
      {asset.caption ? (
        <figcaption className={cn('text-sm text-pretty text-muted-foreground', captionClassName)}>
          {asset.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

export function AssetSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn('aspect-video w-full rounded-lg', className)} />;
}
