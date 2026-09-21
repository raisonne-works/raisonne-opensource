import { RecordCardGrid, RecordCardGridSkeleton } from '@/components/raisonne/records/record-card';
import type { RecordPreview } from '@/components/raisonne/records/preview';
import { recordTypeLabel } from '@/lib/records';
import type { Collaboration } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * The projects the artist leads with on the commissions page: the ones the
 * artist picked, or the newest when they picked none.
 *
 * It renders the same tile the rest of the catalogue uses, so a visitor who
 * arrives here from the work sees one kind of card, not two.
 */
export function FeaturedCollaborations({
  collaborations,
  className,
}: {
  collaborations: Collaboration[];
  className?: string;
}) {
  if (collaborations.length === 0) return null;
  return <RecordCardGrid previews={collaborations.map(toPreview)} className={cn(className)} />;
}

function toPreview(collaboration: Collaboration): RecordPreview {
  const cover = collaboration.cover;
  const src = cover ? (cover.kind === 'video' ? cover.poster : cover.src) : null;
  return {
    ref: { type: 'collaboration', key: collaboration.slug },
    type: 'collaboration',
    href: `/collaborations/${encodeURIComponent(collaboration.slug)}`,
    title: collaboration.title,
    subtitle: collaboration.subtitle ?? collaboration.kind,
    typeLabel: recordTypeLabel('collaboration'),
    year: collaboration.year,
    image: src ? { src, alt: cover?.alt ?? collaboration.title, width: cover?.width ?? null, height: cover?.height ?? null } : null,
  };
}

export function FeaturedCollaborationsSkeleton({ count = 3, className }: { count?: number; className?: string }) {
  return <RecordCardGridSkeleton count={count} className={className} />;
}
