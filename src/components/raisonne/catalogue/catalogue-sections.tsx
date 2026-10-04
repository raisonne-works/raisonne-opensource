import Link from 'next/link';

import { MediaStill } from '@/components/raisonne/works/media-still';
import { GRID_CLASS, GRID_SIZES, formatCount } from '@/components/raisonne/works/lib';
import { isModuleEnabled, worksLabel } from '@/lib/records';
import type { Media, SiteData } from '@/lib/types';
import { cn } from '@/lib/utils';

import { assetMedia, sectionCounts, type CatalogueTypeFilter } from './entry';

/**
 * The catalogue at a glance: one tile per kind of record the install
 * actually holds, each with its live count, a line about what is in it and
 * a cover from the records themselves.
 *
 * It is the index's own contents page and the home page's map of the
 * catalogue, which is why it takes the whole site rather than a list: the
 * counts have to be the real ones, and an empty section is not shown at all.
 */

interface SectionDefinition {
  id: CatalogueTypeFilter | 'press';
  label: string;
  description: string;
  href: string;
  /** Off unless its module is on. */
  module?: 'writings' | 'drops';
}

const SECTIONS: SectionDefinition[] = [
  {
    id: 'series',
    label: 'Series',
    description: 'Bodies of work, each one a contract the artist deployed.',
    href: '/works?type=series',
  },
  {
    id: 'work',
    label: 'Works',
    description: 'Every token in the catalogue, listed one by one.',
    href: '/works?type=work',
  },
  {
    id: 'one-of-one',
    label: 'One of ones',
    description: 'Unique works, with nothing listed twice.',
    href: '/works?type=one-of-one',
  },
  {
    id: 'installation',
    label: 'Immersive',
    description: 'Immersive experiences, and the installations made for a room.',
    href: '/immersive',
  },
  {
    id: 'physical-work',
    label: 'Physical works',
    description: 'Objects and phygital works that exist off the chain.',
    href: '/physical-works',
  },
  {
    id: 'exhibition',
    label: 'Exhibitions',
    description: 'Solo and group shows, biennales, festivals and fairs.',
    href: '/exhibitions',
  },
  {
    id: 'collaboration',
    label: 'Collaborations',
    description: 'Projects made with brands, institutions and other artists.',
    href: '/collaborations',
  },
  {
    id: 'award',
    label: 'Awards',
    description: 'Prizes and recognitions, and the work they were given for.',
    href: '/awards',
  },
  {
    id: 'writing',
    label: 'Writings',
    description: 'Papers and essays by the artist.',
    href: '/writings',
    module: 'writings',
  },
  {
    id: 'drop',
    label: 'Drops',
    description: 'Releases that have been announced but not minted yet.',
    href: '/works?type=drop',
    module: 'drops',
  },
];

/**
 * The pictures a section could show, best first, taken from its own records.
 *
 * A list rather than one image, because two tiles that resolve to the same
 * picture read as a bug: Series and Works sat side by side showing the same
 * frame, since the featured series' cover is the featured work's still. The
 * row takes the first candidate each section has not already used.
 */
function sectionCovers(data: SiteData, id: SectionDefinition['id']): (Media | null)[] {
  const seriesCovers = data.series.filter(series => !series.hidden && series.cover?.still);
  switch (id) {
    case 'series':
      return [
        ...seriesCovers.filter(series => series.featured).map(series => series.cover),
        ...seriesCovers.map(series => series.cover),
      ];
    case 'work': {
      const works = data.works.filter(work => !work.hidden && work.media.still);
      return [...works.filter(work => work.featured).map(work => work.media), ...works.map(work => work.media)];
    }
    case 'one-of-one':
      return [
        ...seriesCovers.filter(series => series.kind === 'one-of-one').map(series => series.cover),
        ...data.works.filter(work => !work.hidden && work.oneOfOne && work.media.still).map(work => work.media),
      ];
    case 'installation':
      return [...data.installations, ...data.immersives].map(record => assetMedia(record.cover));
    case 'physical-work':
      return data.physicalWorks.map(record => assetMedia(record.cover));
    case 'exhibition':
      return data.exhibitions.map(record => assetMedia(record.cover));
    case 'collaboration':
      return data.collaborations.map(record => assetMedia(record.cover));
    case 'award':
      return data.awards.map(record => assetMedia(record.cover));
    case 'writing':
      return data.writings.map(record => assetMedia(record.cover));
    case 'drop':
      return data.drops.map(record => assetMedia(record.cover));
    case 'press':
      return data.press.map(record => assetMedia(record.image));
    default:
      return [];
  }
}

/** The first picture this section can show that no tile before it has taken. */
function pickCover(data: SiteData, id: SectionDefinition['id'], used: Set<string>): Media | null {
  let fallback: Media | null = null;
  for (const media of sectionCovers(data, id)) {
    const still = media?.still;
    if (!still) continue;
    fallback ??= media;
    if (used.has(still)) continue;
    used.add(still);
    return media;
  }
  return fallback;
}

export function CatalogueSections({
  data,
  /** Leaves out the sections whose own page this already is. */
  omit = [],
  className,
}: {
  data: SiteData;
  omit?: SectionDefinition['id'][];
  className?: string;
}) {
  const counts = sectionCounts(data);
  const sections = SECTIONS.filter(section => {
    if (omit.includes(section.id)) return false;
    if (section.module && !isModuleEnabled(data.settings, section.module)) return false;
    return (counts[section.id] ?? 0) > 0;
  });

  if (sections.length === 0) return null;
  const used = new Set<string>();

  return (
    <ul data-slot="catalogue-sections" className={cn(GRID_CLASS, className)}>
      {sections.map(section => {
        const count = counts[section.id] ?? 0;
        // The every-token tile carries the artist's name for the section.
        const label = section.id === 'work' ? worksLabel(data.settings, section.label) : section.label;
        return (
          <li key={section.id} className="min-w-0">
            <article className="group/section relative flex min-w-0 flex-col gap-2.5">
              <MediaStill
                media={pickCover(data, section.id, used)}
                alt=""
                sizes={GRID_SIZES}
                fit="cover"
                className="aspect-[4/3] transition-opacity group-hover/section:opacity-90"
              />
              <div className="flex min-w-0 flex-col gap-1">
                <h3 className="flex items-baseline gap-2 text-sm font-medium">
                  <Link
                    href={section.href}
                    className='rounded-sm underline-offset-4 outline-none after:absolute after:inset-0 after:content-[""] hover:underline focus-visible:ring-3 focus-visible:ring-ring/50'
                  >
                    {label}
                  </Link>
                  <span className="text-xs text-muted-foreground tabular-nums">{formatCount(count)}</span>
                </h3>
                <p className="line-clamp-2 text-xs text-pretty text-muted-foreground">{section.description}</p>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
