import Link from 'next/link';
import { AwardIcon, StarIcon } from 'lucide-react';

import { formatCount } from '@/components/raisonne/works/lib';
import { Badge } from '@/components/ui/badge';
import type { AwardedBadge } from '@/lib/guild';
import { cn } from '@/lib/utils';

import { badgeHref } from './lib';

/**
 * Every badge this install can award, with the number of ranked wallets
 * holding it.
 *
 * The count is the point. A badge half the list has says something different
 * from one two wallets have, and a badge nobody has is worth showing too: it
 * is a rule that can be met, not a rule that was quietly dropped. Each row
 * links to the sentence that earns it.
 */
export function BadgeDistribution({
  badges,
  counts,
  className,
}: {
  badges: readonly AwardedBadge[];
  /** Badge id to wallets holding it. */
  counts: Map<string, number>;
  className?: string;
}) {
  if (badges.length === 0) return null;

  return (
    <ul className={cn('grid gap-x-8 gap-y-3 sm:grid-cols-2 xl:grid-cols-3', className)}>
      {badges.map(badge => {
        const held = counts.get(badge.id) ?? 0;
        return (
          <li key={badge.id} className="flex items-center justify-between gap-3 border-b border-border pb-2">
            <Badge
              variant={badge.positive === false ? 'outline' : 'secondary'}
              render={<Link href={badgeHref(badge.id)} />}
              title={badge.earnedBy}
              className="min-w-0"
            >
              {badge.source === 'given' ? (
                <StarIcon aria-hidden data-icon="inline-start" />
              ) : (
                <AwardIcon aria-hidden data-icon="inline-start" />
              )}
              <span className="truncate">{badge.name}</span>
            </Badge>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {held === 0 ? 'Nobody yet' : `${formatCount(held)} ${held === 1 ? 'wallet' : 'wallets'}`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
