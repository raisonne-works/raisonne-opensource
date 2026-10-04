import Link from 'next/link';

import { CardTeaser } from '@/components/raisonne/catalogue/card-teaser';
import { seriesTitle, workTitle } from '@/components/raisonne/works/lib';
import { MediaStill } from '@/components/raisonne/works/media-still';
import { Skeleton } from '@/components/ui/skeleton';
import { recordHref, recordTypeLabel } from '@/lib/records';
import type { Asset, Media, RecordRef, SiteData, StoryBlock } from '@/lib/types';
import { cn } from '@/lib/utils';

import { assetMedia } from './lib';

/**
 * Hand-picked work of any kind: a series, a single token, a show, an
 * installation, a collaboration, a paper. The artist chooses what leads the
 * page, and the theme does not care which type each one is.
 *
 * A reference that points at a record this install does not have is dropped
 * rather than rendered as a dead tile, so a fixture can carry a reference to
 * something that has not been imported yet.
 */

export interface FeaturedItem {
  key: string;
  href: string;
  title: string;
  typeLabel: string;
  media: Media | null;
  year: number | null;
  /** A short film that plays over the picture while the tile is pointed at. */
  teaser?: string | null;
}

/** Turns the artist's references into tiles, keeping their order. */
export function resolveFeatured(data: SiteData, refs: readonly RecordRef[], limit = 6): FeaturedItem[] {
  const locateWork = (id: string) => {
    const work = data.works.find(candidate => candidate.id === id);
    return work ? { seriesSlug: work.seriesSlug, tokenId: work.tokenId } : null;
  };

  const items: FeaturedItem[] = [];
  for (const ref of refs) {
    if (items.length >= limit) break;
    const href = recordHref(ref, locateWork);
    if (!href) continue;

    const found = findRecord(data, ref);
    if (!found) continue;

    items.push({
      key: `${ref.type}:${ref.key}`,
      href,
      title: found.title,
      typeLabel: recordTypeLabel(ref.type),
      media: found.media,
      year: found.year,
      teaser: found.media?.still ? found.teaser : null,
    });
  }
  return items;
}

/** The smallest encoding of a film: a tile is a preview, not a screening. */
function teaserSrc(asset: Asset | null | undefined): string | null {
  if (!asset || asset.kind !== 'video' || !asset.src) return null;
  return asset.renditions?.[0]?.src ?? asset.src;
}

/** A record's own film: one it lists, or the first its story shows. */
function recordTeaser(videos: Asset[] | undefined, story: StoryBlock[] | undefined): string | null {
  for (const video of videos ?? []) {
    const src = teaserSrc(video);
    if (src) return src;
  }
  for (const block of story ?? []) {
    const src = block.type === 'film' ? teaserSrc(block.video) : block.type === 'media' ? teaserSrc(block.asset) : null;
    if (src) return src;
  }
  return null;
}

function findRecord(
  data: SiteData,
  ref: RecordRef,
): { title: string; media: Media | null; year: number | null; teaser?: string | null } | null {
  switch (ref.type) {
    case 'series': {
      const series = data.series.find(item => item.slug === ref.key);
      return series
        ? { title: seriesTitle(series), media: series.cover, year: series.year, teaser: teaserSrc(series.teaser) }
        : null;
    }
    case 'work': {
      const work = data.works.find(item => item.id === ref.key);
      if (!work) return null;
      const year = work.mintedAt ? new Date(work.mintedAt).getUTCFullYear() : null;
      return {
        title: workTitle(work),
        media: work.media,
        year: Number.isFinite(year) ? year : null,
      };
    }
    case 'installation':
    case 'immersive':
    case 'physical-work':
    case 'exhibition':
    case 'collaboration':
    case 'award':
    case 'writing':
    case 'press':
    case 'drop': {
      const record = recordOfType(data, ref);
      return record
        ? { title: record.title, media: assetMedia(record.cover), year: record.year, teaser: recordTeaser(record.videos, record.story) }
        : null;
    }
    default:
      return null;
  }
}

/** Every non-token record seen the same way: a slug, a title, a cover, a year. */
interface SimpleRecord {
  slug: string | null;
  title: string;
  cover: Asset | null;
  year: number | null;
  videos?: Asset[];
  story?: StoryBlock[];
}

function recordOfType(data: SiteData, ref: RecordRef): SimpleRecord | null {
  const list = recordList(data, ref.type);
  return list.find(record => record.slug === ref.key) ?? null;
}

function recordList(data: SiteData, type: RecordRef['type']): SimpleRecord[] {
  switch (type) {
    case 'installation':
      return data.installations;
    case 'immersive':
      return data.immersives;
    case 'physical-work':
      return data.physicalWorks;
    case 'collaboration':
      return data.collaborations;
    case 'writing':
      return data.writings;
    case 'drop':
      return data.drops;
    case 'exhibition':
      return data.exhibitions.map(show => ({
        slug: show.slug ?? null,
        title: show.title,
        cover: show.cover ?? null,
        year: show.year,
        story: show.story,
      }));
    case 'award':
      return data.awards.map(award => ({
        slug: award.slug ?? null,
        title: award.title,
        cover: award.cover ?? null,
        year: award.year,
      }));
    case 'press':
      return data.press.map(item => ({
        slug: item.slug ?? null,
        title: item.title,
        cover: item.image ?? null,
        year: item.year,
      }));
    default:
      return [];
  }
}

/**
 * Six tiles, four columns. The first work is the large cell. The rest fill
 * the rows beside and below it. A square picture inside a spanned cell was
 * the bug: the span did nothing, and the grid fell apart.
 */
const BENTO_SPANS = [
  'lg:col-span-2 lg:row-span-2',
  'lg:col-span-2',
  'lg:col-span-1',
  'lg:col-span-1',
  'lg:col-span-2',
  'lg:col-span-2',
] as const;

function bentoSpan(index: number, count: number): string {
  if (count < 3) return '';
  if (count === 3) return ['sm:col-span-2 sm:row-span-2', 'sm:col-span-2', 'sm:col-span-2'][index] ?? '';
  if (count === 4) return ['lg:col-span-2 lg:row-span-2', 'lg:col-span-2', 'lg:col-span-1', 'lg:col-span-1'][index] ?? '';
  if (count === 5 && index === 4) return 'lg:col-span-4';
  return BENTO_SPANS[index] ?? '';
}

/**
 * Selected work as a bento. Each tile is the picture. The label sits on it.
 * The first tile is the large cell when there are at least three.
 */
export function FeaturedGrid({ items, className }: { items: FeaturedItem[]; className?: string }) {
  if (items.length === 0) return null;
  const shown = items.slice(0, BENTO_SPANS.length);

  return (
    <ul
      data-slot="featured"
      className={cn(
        'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:auto-rows-[220px]',
        className,
      )}
    >
      {shown.map((item, index) => (
        <li key={item.key} className={cn('min-h-[220px] min-w-0', bentoSpan(index, shown.length))}>
          <Link
            href={item.href}
            data-teaser-host=""
            className="group/featured relative block h-full overflow-hidden rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <MediaStill
              media={item.media}
              alt=""
              as="span"
              fill
              fit="cover"
              priority={index === 0}
              sizes={
                index === 0
                  ? '(min-width: 1024px) 50vw, 100vw'
                  : '(min-width: 1024px) 25vw, 50vw'
              }
            />
            {item.teaser ? <CardTeaser src={item.teaser} /> : null}
            <span className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-0.5 bg-gradient-to-t from-black/75 via-black/35 to-transparent p-3 pt-10 text-white">
              <span className="text-xs text-white/75">
                {item.typeLabel}
                {item.year ? ` · ${item.year}` : ''}
              </span>
              <span className="font-medium text-pretty underline-offset-4 group-hover/featured:underline">
                {item.title}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function FeaturedGridSkeleton({ items = 6, className }: { items?: number; className?: string }) {
  const count = Math.min(items, BENTO_SPANS.length);
  return (
    <div
      role="status"
      className={cn('grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:auto-rows-[220px]', className)}
    >
      <span className="sr-only">Loading the featured work</span>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} aria-hidden className={cn('min-h-[220px]', bentoSpan(index, count))}>
          <Skeleton className="h-full w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}
