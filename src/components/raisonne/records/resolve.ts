import 'server-only';

import { seriesTitle, workTitle } from '@/components/raisonne/works/lib';

import {
  getAward,
  getCollaboration,
  getDrop,
  getExhibition,
  getImmersive,
  getInstallation,
  getPhysicalWork,
  getPressItem,
  getRecordHref,
  getSeries,
  getWorkById,
  getWriting,
} from '@/fixtures';
import { recordTypeLabel } from '@/lib/records';
import type { Asset, Media, RecordRef } from '@/lib/types';

import type { PreviewImage, RecordPreview } from './preview';

/**
 * Turns the references a record carries (the works in a show, the series an
 * award was given for) into everything a card needs. This is the one place
 * that reads the catalogue for them, so the components stay data-free.
 *
 * A reference that points at a record this install does not have comes back
 * as null and is dropped: a dangling link is worse than a missing card.
 */

function fromMedia(media: Media | null, alt: string): PreviewImage | null {
  const src = media?.still ?? media?.full ?? null;
  return src ? { src, alt, width: media?.width ?? null, height: media?.height ?? null } : null;
}

function fromAsset(asset: Asset | null | undefined, alt: string): PreviewImage | null {
  if (!asset) return null;
  const src = asset.kind === 'video' ? asset.poster : asset.src;
  return src ? { src, alt: asset.alt ?? alt, width: asset.width, height: asset.height } : null;
}

export function resolveRecordRef(ref: RecordRef): RecordPreview | null {
  const base = { ref, type: ref.type, href: getRecordHref(ref), typeLabel: recordTypeLabel(ref.type) };

  switch (ref.type) {
    case 'series': {
      const series = getSeries(ref.key);
      if (!series) return null;
      const title = seriesTitle(series);
      return { ...base, title, subtitle: series.description, year: series.year, image: fromMedia(series.cover, title) };
    }
    case 'work': {
      const work = getWorkById(ref.key);
      if (!work) return null;
      const title = workTitle(work);
      const series = getSeries(work.seriesSlug);
      return {
        ...base,
        title,
        subtitle: series ? seriesTitle(series) : null,
        year: work.mintedAt ? new Date(work.mintedAt).getUTCFullYear() : null,
        image: fromMedia(work.media, title),
      };
    }
    case 'installation': {
      const record = getInstallation(ref.key);
      if (!record) return null;
      return {
        ...base,
        title: record.title,
        subtitle: record.subtitle ?? record.location,
        year: record.year,
        image: fromAsset(record.cover ?? record.photos[0], record.title),
      };
    }
    case 'immersive': {
      const record = getImmersive(ref.key);
      if (!record) return null;
      return {
        ...base,
        title: record.title,
        subtitle: record.subtitle ?? record.platform,
        year: record.year,
        image: fromAsset(record.cover ?? record.photos[0], record.title),
      };
    }
    case 'physical-work': {
      const record = getPhysicalWork(ref.key);
      if (!record) return null;
      return {
        ...base,
        title: record.title,
        subtitle: record.subtitle ?? record.medium,
        year: record.year,
        image: fromAsset(record.cover, record.title),
      };
    }
    case 'exhibition': {
      const record = getExhibition(ref.key);
      if (!record) return null;
      const place = [record.venue, record.city].filter(Boolean).join(', ');
      return {
        ...base,
        title: record.title,
        subtitle: place || null,
        year: record.year,
        image: fromAsset(record.cover, record.title),
      };
    }
    case 'collaboration': {
      const record = getCollaboration(ref.key);
      if (!record) return null;
      return {
        ...base,
        title: record.title,
        subtitle: record.subtitle ?? record.kind,
        year: record.year,
        image: fromAsset(record.cover, record.title),
      };
    }
    case 'award': {
      const record = getAward(ref.key);
      if (!record) return null;
      return {
        ...base,
        title: record.title,
        subtitle: record.organization,
        year: record.year,
        image: fromAsset(record.cover, record.title),
      };
    }
    case 'writing': {
      const record = getWriting(ref.key);
      if (!record) return null;
      return {
        ...base,
        title: record.title,
        subtitle: record.publishedIn,
        year: record.year,
        image: fromAsset(record.cover, record.title),
      };
    }
    case 'press': {
      const record = getPressItem(ref.key);
      if (!record) return null;
      return {
        ...base,
        title: record.title,
        subtitle: record.outlet,
        year: record.year,
        image: fromAsset(record.image, record.title),
      };
    }
    case 'drop': {
      const record = getDrop(ref.key);
      if (!record) return null;
      return {
        ...base,
        title: record.title,
        subtitle: record.subtitle ?? record.kind,
        year: record.year,
        image: fromAsset(record.cover, record.title),
      };
    }
    default:
      return null;
  }
}

/** Every reference that resolves, in the order the record lists them. */
export function resolveRecordRefs(refs: RecordRef[]): RecordPreview[] {
  return refs
    .map(ref => resolveRecordRef(ref))
    .filter((preview): preview is RecordPreview => preview !== null && preview.href !== null);
}
