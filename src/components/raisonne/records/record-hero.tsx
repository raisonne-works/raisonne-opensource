import type { ReactNode } from 'react';

import { AssetFigure, AssetVideo } from '@/components/raisonne/story/asset';
import type { HeadingLevel } from '@/components/raisonne/shell/heading';
import { READING_LEAD_CLASS } from '@/components/raisonne/shell/measure';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Asset } from '@/lib/types';
import { cn } from '@/lib/utils';

/** How much of a long description a pack's title card opens with. */
const HERO_OPENING = 300;

/**
 * The top of a record's page: the picture first, then what it is, what it is
 * called and one paragraph about it.
 *
 * The cover leads because these pages are about work that was seen in a
 * room, and a photograph says more than a heading. The text under it is
 * capped at a readable measure whatever the screen does.
 */
export function RecordHero({
  eyebrow,
  title,
  subtitle,
  description,
  cover,
  badges,
  tags,
  place,
  corner,
  labels,
  actions,
  headingLevel = 1,
  priority = true,
  className,
}: {
  /** What kind of record this is, e.g. "Exhibition". */
  eyebrow?: string | null;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  cover?: Asset | null;
  /** Status and kind badges, shown beside the eyebrow. */
  badges?: ReactNode;
  tags?: string[];
  /**
   * Where the record was shown, a line for the card's corner (a year, a
   * running time) and short labels that sum it up. Skin zero prints all of
   * this in the record's facts, so these stay out of sight here; a pack whose
   * title card carries them brings them into view.
   */
  place?: string | null;
  corner?: string | null;
  labels?: string[];
  actions?: ReactNode;
  headingLevel?: HeadingLevel;
  priority?: boolean;
  className?: string;
}) {
  const Heading = `h${headingLevel}` as const;
  // A pack with a fixed title card shows the opening of a long description.
  const opening = description && description.length > HERO_OPENING ? `${description.substring(0, HERO_OPENING)}...` : null;

  return (
    <header data-slot="record-hero" className={cn('flex flex-col gap-6', className)}>
      {cover ? (
        cover.kind === 'video' ? (
          <AssetVideo asset={cover} label={title} frameClassName="max-h-[70svh]" />
        ) : (
          <AssetFigure
            asset={cover}
            sizes="(min-width: 2976px) 2880px, 100vw"
            alt={cover.alt ?? ''}
            priority={priority}
            plate
            frameClassName="max-h-[70svh]"
          />
        )
      ) : null}

      {/* The text column is capped even on a 2560 px screen: a title is not a banner. */}
      <div data-slot="record-hero-text" className="flex max-w-[52rem] flex-col gap-3">
        {eyebrow || badges ? (
          <div data-slot="record-hero-eyebrow" className="flex flex-wrap items-center gap-2">
            {eyebrow ? <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p> : null}
            {badges}
          </div>
        ) : null}

        {/* break-words: an on-chain title can be one long unbroken string. */}
        <Heading className="text-3xl font-semibold tracking-tight text-balance break-words sm:text-4xl">
          {title}
        </Heading>

        {subtitle ? <p data-slot="record-hero-subtitle" className="text-lg text-pretty text-muted-foreground">{subtitle}</p> : null}

        {description ? (
          <p data-slot="record-hero-description" className={cn('text-base/relaxed text-pretty sm:text-lg/relaxed', READING_LEAD_CLASS)}>
            {opening ? (
              <>
                <span data-slot="record-hero-description-full">{description}</span>
                <span data-slot="record-hero-description-opening" aria-hidden className="hidden">
                  {opening}
                </span>
              </>
            ) : (
              description
            )}
          </p>
        ) : null}

        {place ? (
          <p data-slot="record-hero-place" className="hidden">
            {place}
          </p>
        ) : null}
        {corner ? (
          <p data-slot="record-hero-corner" className="hidden">
            {corner}
          </p>
        ) : null}
        {labels && labels.length > 0 ? (
          <ul data-slot="record-hero-labels" className="hidden">
            {labels.map(label => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        ) : null}

        {tags && tags.length > 0 ? (
          <ul data-slot="record-hero-tags" className="flex flex-wrap gap-1.5 pt-1">
            {tags.map(tag => (
              <li key={tag}>
                <Badge variant="outline" className="font-normal">
                  {tag}
                </Badge>
              </li>
            ))}
          </ul>
        ) : null}

        {actions ? <div data-slot="record-hero-actions" className="flex flex-wrap gap-2 pt-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export function RecordHeroSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-6', className)} role="status" aria-label="Loading the record">
      <Skeleton className="aspect-video max-h-[70svh] w-full rounded-lg" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-4 w-full max-w-[40rem]" />
      </div>
    </div>
  );
}
