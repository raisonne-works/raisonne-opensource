import Link from 'next/link';

import { type HeadingLevel } from '@/components/raisonne/shell/heading';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import type { Collaboration } from '@/lib/types';
import { cn } from '@/lib/utils';

import { joinParts } from './format';

/**
 * Projects made with someone else, as CV rows: the year on the left, the
 * project and who it was with beside it. A collaboration that has a page of
 * its own links to it; the rest are plain text, which is what a CV is.
 */
export function CollaborationList({
  collaborations,
  headingLevel = 3,
  limit,
  className,
}: {
  collaborations: Collaboration[];
  headingLevel?: HeadingLevel;
  limit?: number;
  className?: string;
}) {
  const Heading = `h${headingLevel}` as const;
  const shown = typeof limit === 'number' ? collaborations.slice(0, limit) : collaborations;
  if (shown.length === 0) return <CollaborationListEmpty className={className} />;

  return (
    <ul data-slot="collaboration-list" className={cn('flex flex-col divide-y divide-border', className)}>
      {shown.map(collaboration => {
        const partners = collaboration.partners.map(partner => partner.name).filter(Boolean);
        const meta = joinParts([collaboration.kind, partners.join(', ')], ' · ');
        return (
          <li
            key={collaboration.slug}
            className="grid gap-x-6 gap-y-1 py-4 first:pt-0 sm:grid-cols-[9rem_minmax(0,1fr)] print:py-2"
          >
            <p className="text-sm text-muted-foreground tabular-nums print:text-xs">{collaboration.year ?? ''}</p>
            <div className="flex min-w-0 flex-col gap-1">
              <Heading className="text-base font-medium text-pretty">
                <Link
                  href={`/collaborations/${encodeURIComponent(collaboration.slug)}`}
                  className="rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {collaboration.title}
                </Link>
              </Heading>
              {meta ? <p className="text-sm text-muted-foreground">{meta}</p> : null}
              {collaboration.description ? (
                <p className="max-w-[36rem] text-sm text-pretty text-muted-foreground">{collaboration.description}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function CollaborationListEmpty({ className }: { className?: string }) {
  return (
    <Empty className={className}>
      <EmptyHeader>
        <EmptyTitle>No collaborations listed</EmptyTitle>
        <EmptyDescription>Projects made with brands and institutions appear here.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function CollaborationListSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div role="status" className={cn('flex flex-col gap-6', className)}>
      <span className="sr-only">Loading the collaborations</span>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} aria-hidden className="grid gap-x-6 gap-y-2 sm:grid-cols-[9rem_minmax(0,1fr)]">
          <Skeleton className="h-4 w-16" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-64 max-w-full" />
            <Skeleton className="h-4 w-44 max-w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
