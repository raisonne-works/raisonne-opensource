import Link from 'next/link';

import { seriesTitle, workTitle } from '@/components/raisonne/works/lib';
import { MediaStill } from '@/components/raisonne/works/media-still';
import { Skeleton } from '@/components/ui/skeleton';
import { recordHref, recordTypeLabel } from '@/lib/records';
import type { Asset, Media, RecordRef, SiteData } from '@/lib/types';
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
    });
  }
  return items;
}

function findRecord(data: SiteData, ref: RecordRef): { title: string; media: Media | null; year: number | null } | null {
  switch (ref.type) {
    case 'series': {
      const series = data.series.find(item => item.slug === ref.key);
      return series ? { title: seriesTitle(series), media: series.cover, year: series.year } : null;
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
      return record ? { title: record.title, media: assetMedia(record.cover), year: record.year } : null;
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
 * The featured tiles. The first one takes two columns and two rows from md
 * up, so the page opens on one large work rather than a row of thumbnails.
 */
export function FeaturedGrid({ items, className }: { items: FeaturedItem[]; className?: string }) {
  if (items.length === 0) return null;

  return (
    <ul data-slot="featured" className={cn('grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3', className)}>
      {items.map((item, index) => {
        const lead = index === 0 && items.length > 2;
        return (
          <li key={item.key} className={cn('min-w-0', lead && 'col-span-2 md:row-span-2')}>
            <Link
              href={item.href}
              className="group/featured flex min-w-0 flex-col gap-2 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <MediaStill
                media={item.media}
                alt=""
                as="span"
                fit="cover"
                priority={index === 0}
                sizes={
                  lead
                    ? '(min-width: 1280px) 45vw, (min-width: 768px) 60vw, 100vw'
                    : '(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 50vw'
                }
              />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">
                  {item.typeLabel}
                  {item.year ? ` · ${item.year}` : ''}
                </span>
                <span
                  className={cn(
                    'font-medium text-pretty underline-offset-4 group-hover/featured:underline',
                    lead ? 'text-base sm:text-lg' : 'text-sm',
                  )}
                >
                  {item.title}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function FeaturedGridSkeleton({ items = 6, className }: { items?: number; className?: string }) {
  return (
    <div role="status" className={cn('grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3', className)}>
      <span className="sr-only">Loading the featured work</span>
      {Array.from({ length: items }, (_, index) => (
        <div key={index} aria-hidden className={cn('flex flex-col gap-2', index === 0 && 'col-span-2 md:row-span-2')}>
          <Skeleton className="aspect-square w-full rounded-lg" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-32" />
        </div>
      ))}
    </div>
  );
}
