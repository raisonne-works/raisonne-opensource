import { type HeadingLevel } from '@/components/raisonne/shell/heading';
import { Skeleton } from '@/components/ui/skeleton';
import type { PartnerGroup } from '@/lib/types';
import { cn } from '@/lib/utils';

import { ArtistLinkList } from './artist-links';

/**
 * Everyone the practice runs on, by kind: museums and galleries, platforms,
 * the tools and the studios. Names and links, no logotypes, because this is
 * a list of relationships rather than a wall of brands.
 */
export function PartnerGroups({
  groups,
  headingLevel = 3,
  className,
}: {
  groups: PartnerGroup[];
  headingLevel?: HeadingLevel;
  className?: string;
}) {
  const Heading = `h${headingLevel}` as const;
  const shown = groups.filter(group => group.links.length > 0);
  if (shown.length === 0) return null;

  return (
    <div data-slot="partner-groups" className={cn('grid gap-8 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {shown.map((group, index) => {
        const id = `partner-group-${index}`;
        return (
          <div key={group.category} className="flex flex-col gap-2">
            <Heading id={id} className="text-sm font-medium">
              {group.category}
            </Heading>
            <ArtistLinkList links={group.links} labelledBy={id} className="flex flex-col gap-0.5" />
          </div>
        );
      })}
    </div>
  );
}

export function PartnerGroupsSkeleton({ groups = 3, className }: { groups?: number; className?: string }) {
  return (
    <div role="status" className={cn('grid gap-8 sm:grid-cols-2 lg:grid-cols-3', className)}>
      <span className="sr-only">Loading the partners</span>
      {Array.from({ length: groups }, (_, index) => (
        <div key={index} aria-hidden className="flex flex-col gap-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}
