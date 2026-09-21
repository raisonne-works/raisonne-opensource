import { AwardIcon, StarIcon } from 'lucide-react';

import { formatCount } from '@/components/raisonne/works/lib';
import { Badge } from '@/components/ui/badge';
import type { AwardedBadge } from '@/lib/guild';
import { cn } from '@/lib/utils';

/**
 * One badge, said in full: what it is, exactly what earns it, how many
 * wallets have it, and whether the install worked it out or the artist gave
 * it.
 *
 * The sentence under "Earned by" is the rule itself, not a paraphrase of it.
 * Where the artist wrote their own note as well, it is shown above, because a
 * collector is owed both the intent and the mechanism.
 */
export function BadgeExplainer({
  badge,
  wallets,
  suspended = false,
  className,
}: {
  badge: AwardedBadge;
  /** How many wallets hold it now. Absent when the page does not count. */
  wallets?: number;
  /** True when this rule is standing down because the snapshot's history is incomplete. */
  suspended?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={badge.positive === false ? 'outline' : 'secondary'}>
          {badge.source === 'given' ? (
            <StarIcon aria-hidden data-icon="inline-start" />
          ) : (
            <AwardIcon aria-hidden data-icon="inline-start" />
          )}
          {badge.name}
        </Badge>
        {typeof wallets === 'number' ? (
          <span className="text-xs text-muted-foreground tabular-nums">
            {wallets === 0 ? 'Nobody yet' : `${formatCount(wallets)} ${wallets === 1 ? 'wallet' : 'wallets'}`}
          </span>
        ) : null}
      </div>

      {badge.description ? <p className="text-sm text-muted-foreground">{badge.description}</p> : null}

      <p className="text-sm">
        <span className="font-medium">Earned by. </span>
        <span className="text-muted-foreground">{badge.earnedBy}</span>
      </p>

      {suspended ? (
        <p className="text-xs text-muted-foreground">
          Not awarded from this snapshot: it covers recent history only, and this badge needs the whole of it to be
          true rather than likely.
        </p>
      ) : null}

      {badge.source === 'given' ? (
        <p className="text-xs text-muted-foreground">
          This install cannot check this one against the chain, so it is only ever awarded by hand.
        </p>
      ) : null}
    </div>
  );
}
