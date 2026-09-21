import Link from 'next/link';
import { AwardIcon, StarIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import type { AwardedBadge } from '@/lib/guild';
import { cn } from '@/lib/utils';

import { badgeHref } from './lib';

/**
 * The badges one wallet has, as chips.
 *
 * Each chip is a link to the paragraph that says exactly what earns it, so a
 * reader is never left guessing at a word like "Keeper" and a tap gets the
 * same answer a hover would. A badge the artist gave by hand carries a
 * different mark from one the install worked out, because the difference
 * matters: one is checkable and the other is a decision.
 */
export function BadgeChips({
  badges,
  max,
  className,
}: {
  badges: readonly AwardedBadge[];
  /** Show at most this many, with the rest counted. */
  max?: number;
  className?: string;
}) {
  if (badges.length === 0) return null;
  const shown = max ? badges.slice(0, max) : [...badges];
  const hidden = badges.length - shown.length;

  return (
    <ul className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {shown.map(badge => (
        <li key={badge.id}>
          <Badge
            variant={badge.positive === false ? 'outline' : 'secondary'}
            render={<Link href={badgeHref(badge.id)} />}
            title={badge.earnedBy}
          >
            {badge.source === 'given' ? (
              <StarIcon aria-hidden data-icon="inline-start" />
            ) : (
              <AwardIcon aria-hidden data-icon="inline-start" />
            )}
            {badge.name}
          </Badge>
        </li>
      ))}
      {hidden > 0 ? (
        <li>
          <span className="text-xs text-muted-foreground tabular-nums">and {hidden} more</span>
        </li>
      ) : null}
    </ul>
  );
}
