'use client';

import { Badge } from '@/components/ui/badge';
import { formatCount, formatDateTime, formatPrice } from '@/components/raisonne/works/lib';
import type { DropPhase } from '@/lib/types';
import { cn } from '@/lib/utils';

import { useNow } from './use-now';

/**
 * How a drop opens: who can mint when, how many at each stage and at what
 * price. The phase that is open now says so, and the page keeps up without a
 * reload, because a page left open through a launch should not lie.
 */
export function DropPhases({
  phases,
  now: initialNow,
  endsAt = null,
  className,
}: {
  phases: DropPhase[];
  /** The time the page was rendered, so the first paint matches the server. */
  now: number;
  /** When the whole drop closes, so the last phase can read "closed". */
  endsAt?: string | null;
  className?: string;
}) {
  const now = useNow(initialNow, 30_000);
  if (phases.length === 0) return null;

  const closed = endsAt ? Date.parse(endsAt) < now : false;
  const starts = phases.map(phase => (phase.startsAt ? Date.parse(phase.startsAt) : Number.NaN));
  // The open phase is the last one whose time has come.
  const open = closed
    ? -1
    : starts.reduce((current, at, index) => (Number.isFinite(at) && at <= now ? index : current), -1);

  return (
    <ul data-slot="drop-phases" className={cn('flex flex-col gap-2', className)}>
      {phases.map((phase, index) => {
        const at = starts[index];
        const isOpen = index === open;
        const facts = [
          phase.supply !== null ? `${formatCount(phase.supply)} available` : null,
          formatPrice(phase.price),
          phase.audience,
        ].filter(Boolean);

        return (
          <li
            key={`${phase.name}-${index}`}
            className={cn('flex flex-col gap-1.5 rounded-lg border px-4 py-3', isOpen && 'border-primary/40 bg-muted/40')}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{phase.name}</span>
              {isOpen ? <Badge>Open now</Badge> : null}
              {closed ? <Badge variant="secondary">Closed</Badge> : null}
            </div>
            <p className="text-sm text-muted-foreground">
              {Number.isFinite(at) ? (
                <span className="font-mono">{formatDateTime(phase.startsAt)}</span>
              ) : (
                'Date to be announced'
              )}
            </p>
            {facts.length > 0 ? <p className="text-sm text-pretty">{facts.join(' · ')}</p> : null}
          </li>
        );
      })}
    </ul>
  );
}
