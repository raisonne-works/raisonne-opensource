import { type HeadingLevel } from '@/components/raisonne/shell/heading';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import type { CvEducation, CvRole } from '@/lib/types';
import { cn } from '@/lib/utils';

import { dateRange, joinParts } from './format';

/**
 * Roles and study, in the shape a CV expects: the dates in their own column
 * on the left, the title and the place beside them. The same rhythm as the
 * exhibition list above it, so a printed page reads as one document.
 */

const ROW_CLASS = 'grid gap-x-6 gap-y-1 py-4 first:pt-0 sm:grid-cols-[9rem_minmax(0,1fr)] print:py-2';
const DATE_CLASS = 'text-sm text-muted-foreground tabular-nums print:text-xs';

export function ExperienceList({
  roles,
  headingLevel = 3,
  className,
}: {
  roles: CvRole[];
  headingLevel?: HeadingLevel;
  className?: string;
}) {
  const Heading = `h${headingLevel}` as const;
  if (roles.length === 0) return <ExperienceEmpty className={className} />;

  return (
    <ul data-slot="experience-list" className={cn('flex flex-col divide-y divide-border', className)}>
      {roles.map((role, index) => {
        const when = dateRange(role.startDate, role.endDate);
        const place = joinParts([role.organization, role.location]);
        return (
          <li key={`${role.title}-${index}`} className={ROW_CLASS}>
            <p className={DATE_CLASS}>{when ?? ''}</p>
            <div className="flex min-w-0 flex-col gap-1">
              <Heading className="text-base font-medium text-pretty">{role.title}</Heading>
              {place ? <p className="text-sm text-muted-foreground">{place}</p> : null}
              {role.description ? (
                <p className="max-w-[36rem] text-sm text-pretty text-muted-foreground">{role.description}</p>
              ) : null}
              {role.highlights.length > 0 ? (
                <ul className="flex list-disc flex-col gap-0.5 pl-4 text-sm text-muted-foreground marker:text-border">
                  {role.highlights.map((highlight, position) => (
                    <li key={position} className="text-pretty">
                      {highlight}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function EducationList({
  education,
  headingLevel = 3,
  className,
}: {
  education: CvEducation[];
  headingLevel?: HeadingLevel;
  className?: string;
}) {
  const Heading = `h${headingLevel}` as const;
  if (education.length === 0) return null;

  return (
    <ul data-slot="education-list" className={cn('flex flex-col divide-y divide-border', className)}>
      {education.map((entry, index) => {
        const when = dateRange(entry.startDate, entry.endDate);
        const place = joinParts([entry.institution, entry.location]);
        return (
          <li key={`${entry.title}-${index}`} className={ROW_CLASS}>
            <p className={DATE_CLASS}>{when ?? ''}</p>
            <div className="flex min-w-0 flex-col gap-1">
              <Heading className="text-base font-medium text-pretty">{entry.title}</Heading>
              {place ? <p className="text-sm text-muted-foreground">{place}</p> : null}
              {entry.description ? (
                <p className="max-w-[36rem] text-sm text-pretty text-muted-foreground">{entry.description}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function ExperienceEmpty({ className }: { className?: string }) {
  return (
    <Empty className={className}>
      <EmptyHeader>
        <EmptyTitle>No roles listed yet</EmptyTitle>
        <EmptyDescription>Experience appears here once the CV carries any.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function ExperienceListSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div role="status" className={cn('flex flex-col gap-6', className)}>
      <span className="sr-only">Loading the experience</span>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} aria-hidden className="grid gap-x-6 gap-y-2 sm:grid-cols-[9rem_minmax(0,1fr)]">
          <Skeleton className="h-4 w-28" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-56 max-w-full" />
            <Skeleton className="h-4 w-40 max-w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
