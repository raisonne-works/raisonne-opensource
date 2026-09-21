import { Skeleton } from '@/components/ui/skeleton';
import type { CvSkill } from '@/lib/types';
import { cn } from '@/lib/utils';

import { groupSkills, SKILL_CATEGORY_LABEL } from './format';

/**
 * Skills by category, as a definition list rather than a cloud of badges: a
 * CV is read in one pass, and a line of comma-separated names is faster to
 * read than twenty pills.
 */
export function SkillGroups({ skills, className }: { skills: CvSkill[]; className?: string }) {
  const groups = groupSkills(skills);
  if (groups.length === 0) return null;

  return (
    <dl data-slot="skill-groups" className={cn('flex flex-col divide-y divide-border', className)}>
      {groups.map(group => (
        <div key={group.category} className="grid gap-x-6 gap-y-1 py-3 first:pt-0 sm:grid-cols-[9rem_minmax(0,1fr)] print:py-1.5">
          <dt className="text-sm font-medium">{SKILL_CATEGORY_LABEL[group.category]}</dt>
          <dd className="text-sm text-pretty text-muted-foreground">
            {group.skills.map(skill => skill.name).join(', ')}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function SkillGroupsSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div role="status" className={cn('flex flex-col gap-3', className)}>
      <span className="sr-only">Loading the skills</span>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} aria-hidden className="grid gap-x-6 gap-y-1 sm:grid-cols-[9rem_minmax(0,1fr)]">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-full max-w-sm" />
        </div>
      ))}
    </div>
  );
}
