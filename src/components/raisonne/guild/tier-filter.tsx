import Link from 'next/link';

import { formatCount } from '@/components/raisonne/works/lib';
import { Badge } from '@/components/ui/badge';
import type { TierCount } from '@/lib/guild';
import { cn } from '@/lib/utils';

import { leaderboardHref, type LeaderboardState } from './lib';

/**
 * The tiers, as filters.
 *
 * Links rather than a dropdown: three or four options fit on one line, a link
 * keeps the back button and a crawler can follow it, and each one carries the
 * number of wallets it would leave so nobody picks an empty list. A tier with
 * no wallets in it today is shown as text, because a filter that empties the
 * page is worse than a filter that is visibly unavailable.
 */
export function TierFilter({
  distribution,
  state,
  total,
  className,
}: {
  distribution: readonly TierCount[];
  state: LeaderboardState;
  /** Wallets on the whole ranked list, for the All option. */
  total: number;
  className?: string;
}) {
  if (distribution.length === 0) return null;

  return (
    <nav aria-label="Filter by tier" className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <Option href={leaderboardHref(state, { tier: '' })} active={!state.tier} label="All tiers" count={total} />
      {distribution.map(entry =>
        entry.wallets === 0 ? (
          <span
            key={entry.tier.id}
            className="inline-flex h-6 items-center gap-1.5 rounded-4xl px-2 text-xs text-muted-foreground/70"
          >
            {entry.tier.name}
            <span className="tabular-nums">0</span>
          </span>
        ) : (
          <Option
            key={entry.tier.id}
            href={leaderboardHref(state, { tier: entry.tier.id })}
            active={state.tier === entry.tier.id}
            label={entry.tier.name}
            count={entry.wallets}
          />
        ),
      )}
    </nav>
  );
}

function Option({ href, active, label, count }: { href: string; active: boolean; label: string; count: number }) {
  return (
    <Badge
      variant={active ? 'default' : 'outline'}
      render={<Link href={href} />}
      aria-current={active ? 'true' : undefined}
      className="h-6 gap-1.5 px-2"
    >
      {label}
      <span className={cn('tabular-nums', active ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
        {formatCount(count)}
      </span>
    </Badge>
  );
}
