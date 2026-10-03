import Image from 'next/image';
import Link from 'next/link';
import { EyeIcon } from 'lucide-react';

import { CopyButton } from '@/components/raisonne/shell/copy-button';
import { MEDIA_FRAME_CLASS } from '@/components/raisonne/works/lib';
import { MediaStill } from '@/components/raisonne/works/media-still';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { CardTeaser } from './card-teaser';
import { EnlargeButton } from './enlarge-dialog';
import type { CatalogueEntry } from './entry';
import { VIEW_GRID_SIZES } from './lib';

/**
 * One record in a grid, whatever kind it is: the image, then the facts a
 * visitor scans for. The whole tile is one link (the caption carries it and
 * covers the tile), so the controls that sit on top of the image, enlarge
 * and copy the contract, stay reachable by keyboard and by screen reader.
 *
 * Interactive works are never run here. The card shows their still and says
 * so; running the code is the work page's job.
 *
 * `density` picks how much caption there is: the full caption in the grid,
 * one line in the dense grid, none on the contact sheet, where the image is
 * the whole point and the title is read out instead.
 */
export function CatalogueCard({
  entry,
  density = 'grid',
  sizes,
  priority = false,
  showType = false,
  markFeatured = false,
  className,
}: {
  entry: CatalogueEntry;
  density?: 'grid' | 'dense' | 'sheet';
  sizes?: string;
  priority?: boolean;
  /** On a list of one type the badge only repeats the page title. */
  showType?: boolean;
  /** Say which records the artist leads with, where the list has no separate featured band. */
  markFeatured?: boolean;
  className?: string;
}) {
  const href = entry.href ?? entry.externalHref;
  const external = !entry.href && Boolean(entry.externalHref);
  const imageSizes = sizes ?? VIEW_GRID_SIZES[density];
  const hover = density === 'grid' ? entry.hoverStill : null;
  const badges = cardBadges(entry, showType, markFeatured);
  // A contact sheet wants whole frames at one height: cropping the title out
  // of a poster defeats the one job the sheet has, which is identification.
  const fit = density === 'sheet' ? 'contain' : entry.fit;

  return (
    <article data-slot="catalogue-card" data-type={entry.type} className={cn('group/card relative flex min-w-0 flex-col gap-2.5', className)}>
      <div data-slot="catalogue-card-media" className="relative">
        {entry.media?.still ? (
          <MediaStill
            media={entry.media}
            alt=""
            sizes={imageSizes}
            priority={priority}
            fit={fit}
            emptyLabel={emptyMediaLabel(entry)}
            className={cn('transition-opacity', hover && 'group-hover/card:opacity-0')}
          />
        ) : (
          <CardPlate entry={entry} />
        )}
        {hover ? (
          // The second image only fades in where a pointer can hover, and it
          // sits under the controls so it never swallows a click.
          <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg opacity-0 transition-opacity group-hover/card:opacity-100">
            <Image
              src={hover}
              alt=""
              fill
              sizes={imageSizes}
              loading="lazy"
              className={fit === 'cover' ? 'object-cover' : 'object-contain'}
            />
          </span>
        ) : null}
        {entry.teaser && entry.media?.still ? <CardTeaser src={entry.teaser.src} /> : null}

        {/*
          Hover affordances, and only where a pointer can hover. On a phone
          they were a permanent white pill over a fifth of every artwork, and
          a catalogue raisonne does not put chrome on the work.
        */}
        <div data-slot="catalogue-card-actions" className="absolute top-1.5 right-1.5 z-10 hidden items-center gap-1 rounded-lg bg-background/80 p-0.5 opacity-0 transition-opacity group-hover/card:opacity-100 group-focus-within/card:opacity-100 [@media(hover:hover)]:flex">
          <EnlargeButton entry={entry} />
          {entry.contract ? (
            <CopyButton value={entry.contract} label={`Copy the contract address for ${entry.title}`} />
          ) : null}
        </div>

        {entry.status ? (
          <Badge variant="secondary" className="absolute top-1.5 left-1.5 z-10">
            {entry.status}
          </Badge>
        ) : null}
      </div>

      {density === 'sheet' ? (
        <>
          <TitleLink entry={entry} href={href} external={external} cover />
          {/* A caption for a design that prints one on the sheet. Skin zero reads the name out instead. */}
          <div data-slot="catalogue-card-caption" aria-hidden className="hidden min-w-0 flex-col gap-1">
            <span data-slot="catalogue-card-title">{entry.title}</span>
            <CardMeta meta={entry.meta} />
            <CardEye href={entry.href} />
          </div>
        </>
      ) : (
        <div data-slot="catalogue-card-caption" className="flex min-w-0 flex-col gap-1">
          <TitleLink
            entry={entry}
            href={href}
            external={external}
            className="line-clamp-2 text-sm font-medium underline-offset-4 group-hover/card:underline"
          />
          <CardMeta meta={entry.meta} />
          <CardEye href={entry.href} />
          {density === 'grid' && badges.length > 0 ? (
            <span data-slot="catalogue-card-badges" className="flex flex-wrap gap-1 pt-0.5">
              {badges.map(badge => (
                <Badge key={badge} variant="outline" className="font-normal">
                  {badge}
                </Badge>
              ))}
            </span>
          ) : null}
        </div>
      )}
    </article>
  );
}

/**
 * The caption line: the facts run together with a dot between them. Each
 * fact is its own element and says what it is (a year, a count, a word), so
 * a design can set them as separate tags or leave some out.
 */
function CardMeta({ meta }: { meta: string[] }) {
  if (meta.length === 0) return null;
  return (
    <span data-slot="catalogue-card-meta" className="truncate text-xs text-muted-foreground">
      {meta.map((fact, index) => (
        <span key={`${index}-${fact}`} data-slot="catalogue-card-fact" data-fact={factKind(fact)}>
          {index > 0 ? <span data-slot="catalogue-card-fact-dot"> · </span> : null}
          {fact}
        </span>
      ))}
    </span>
  );
}

function factKind(fact: string): 'year' | 'count' | 'text' {
  if (/^\d{4}$/.test(fact)) return 'year';
  if (/^[\d.,]+\s/.test(fact)) return 'count';
  return 'text';
}

/**
 * A small way in beside the name, for a design that draws one. It sits over
 * the tile's stretched link so it has a hover of its own. Hidden in skin
 * zero, where the whole tile is already the link, and kept out of the tab
 * order and the accessibility tree because it repeats that link.
 */
function CardEye({ href }: { href: string | null }) {
  if (!href) return null;
  return (
    <Link href={href} data-slot="catalogue-card-eye" aria-hidden tabIndex={-1} className="hidden">
      <EyeIcon />
    </Link>
  );
}

/**
 * The one link of the tile. In the caption it stretches over the whole card
 * with its ::after, so the image is clickable too. On the contact sheet
 * there is no caption, so the link itself covers the tile and its name is
 * read out rather than printed.
 */
function TitleLink({
  entry,
  href,
  external,
  cover = false,
  className,
}: {
  entry: CatalogueEntry;
  href: string | null;
  external: boolean;
  /** No caption: the link is the tile. */
  cover?: boolean;
  className?: string;
}) {
  const title = entry.fullTitle ?? undefined;
  const label = cover ? <span className="sr-only">{entry.title}</span> : entry.title;
  const shape = cover
    ? 'absolute inset-0 z-0 rounded-lg'
    : 'rounded-sm after:absolute after:inset-0 after:z-0 after:content-[""]';

  if (!href) {
    return (
      <span className={cn(cover && 'sr-only', className)} title={title}>
        {entry.title}
      </span>
    );
  }

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={title}
        className={cn(shape, 'outline-none focus-visible:ring-3 focus-visible:ring-ring/50', className)}
      >
        {label}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }

  return (
    <Link
      href={href}
      title={title}
      className={cn(shape, 'outline-none focus-visible:ring-3 focus-visible:ring-ring/50', className)}
    >
      {label}
    </Link>
  );
}

/**
 * A record with no picture, as a catalogue slip rather than a picture frame
 * with nothing in it.
 *
 * Two thirds of an exhibition archive has no photograph, and a grid of
 * identical grey boxes with an error icon in each is the dominant thing on
 * that page. This keeps the tile's shape and rhythm, says what the record is
 * and when it was, and leaves the rest quiet.
 */
function CardPlate({ entry }: { entry: CatalogueEntry }) {
  return (
    <div
      role="img"
      aria-label={`${entry.title}. ${emptyMediaLabel(entry)}.`}
      className={cn('flex aspect-square w-full flex-col justify-between rounded-lg p-3', MEDIA_FRAME_CLASS)}
    >
      <span className="text-xs text-muted-foreground">{entry.typeLabel}</span>
      <span className="self-end font-mono text-xs text-muted-foreground/70 tabular-nums">{entry.year ?? ''}</span>
    </div>
  );
}

/**
 * What a frame with no picture in it should say. Only a token's media lives
 * on a chain; an exhibition photograph or an award certificate never did, so
 * those records are not told their media is "not found on-chain".
 */
function emptyMediaLabel(entry: CatalogueEntry): string {
  switch (entry.type) {
    case 'work':
    case 'series':
    case 'drop':
      return 'Media not found on-chain';
    case 'exhibition':
    case 'installation':
    case 'immersive':
      return 'No photograph yet';
    case 'press':
      return 'No picture with this piece';
    default:
      return 'No image yet';
  }
}

/** What the record is, and the exceptions worth a badge. Never more than three. */
function cardBadges(entry: CatalogueEntry, showType: boolean, markFeatured = false): string[] {
  const badges: string[] = [];
  if (markFeatured && entry.featured) badges.push('Featured');
  if (showType) badges.push(entry.typeLabel);
  if (entry.oneOfOne && entry.type !== 'physical-work') badges.push('One of one');
  if (entry.interactive) badges.push('Interactive');
  // The category, when the caption line has not already said it.
  for (const medium of entry.medium.slice(0, 1)) {
    if (!badges.includes(medium) && !entry.meta.includes(medium)) badges.push(medium);
  }
  for (const tag of entry.tags) {
    if (badges.length >= 3) break;
    if (!badges.includes(tag)) badges.push(tag);
  }
  return badges.slice(0, 3);
}

export function CatalogueCardSkeleton({
  density = 'grid',
  className,
}: {
  density?: 'grid' | 'dense' | 'sheet';
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-2.5', className)} aria-hidden>
      <Skeleton className="aspect-square w-full rounded-lg" />
      {density === 'sheet' ? null : (
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-2/3" />
          {density === 'grid' ? <Skeleton className="h-3 w-1/2" /> : null}
        </div>
      )}
    </div>
  );
}
