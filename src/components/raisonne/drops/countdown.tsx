'use client';

import { Badge } from '@/components/ui/badge';
import { dropStatus } from '@/lib/records';
import type { Drop } from '@/lib/types';
import { cn } from '@/lib/utils';

import { DROP_STATUS_LABELS, dropDateLine } from './lib';
import { useNow } from './use-now';

interface Part {
  label: string;
  value: number;
}

/** Days, hours, minutes and seconds left, never negative. */
function parts(remaining: number): Part[] {
  const total = Math.max(0, Math.floor(remaining / 1000));
  return [
    { label: 'days', value: Math.floor(total / 86400) },
    { label: 'hours', value: Math.floor(total / 3600) % 24 },
    { label: 'minutes', value: Math.floor(total / 60) % 60 },
    { label: 'seconds', value: total % 60 },
  ];
}

function spoken(remaining: number): string {
  const [days, hours, minutes] = parts(remaining);
  if (days.value > 0) return `${days.value} days and ${hours.value} hours left`;
  if (hours.value > 0) return `${hours.value} hours and ${minutes.value} minutes left`;
  return `${minutes.value} minutes left`;
}

/**
 * Where a drop stands and how long is left.
 *
 * A drop with no start date is only announced: it reads "date to be
 * announced" and never counts down to a date nobody has set. Once there is a
 * date the clock runs to it, then to the closing date while the drop is open,
 * and stops when it closes.
 */
export function DropCountdown({
  drop,
  now: initialNow,
  className,
}: {
  drop: Drop;
  /** The time the page was rendered, so the first paint matches the server. */
  now: number;
  className?: string;
}) {
  const now = useNow(initialNow);
  const status = dropStatus(drop, now);
  const starts = drop.startsAt ? Date.parse(drop.startsAt) : NaN;
  const ends = drop.endsAt ? Date.parse(drop.endsAt) : NaN;

  const target =
    status === 'scheduled' && Number.isFinite(starts)
      ? { at: starts, label: 'Opens in' }
      : status === 'live' && Number.isFinite(ends)
        ? { at: ends, label: 'Closes in' }
        : null;

  return (
    <div data-slot="drop-countdown" className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={status === 'live' ? 'default' : 'secondary'}>{DROP_STATUS_LABELS[status]}</Badge>
        <p className="text-sm text-muted-foreground">{dropDateLine(drop, status)}</p>
      </div>

      {target ? (
        <>
          <p className="text-xs text-muted-foreground">{target.label}</p>
          <ul className="flex flex-wrap gap-2" aria-hidden>
            {parts(target.at - now).map(part => (
              <li
                key={part.label}
                className="flex min-w-16 flex-col items-center gap-0.5 rounded-lg border px-3 py-2"
              >
                <span className="font-mono text-xl tabular-nums">{String(part.value).padStart(2, '0')}</span>
                <span className="text-xs text-muted-foreground">{part.label}</span>
              </li>
            ))}
          </ul>
          {/* Read out once rather than four times a second. */}
          <p className="sr-only">{spoken(target.at - now)}</p>
        </>
      ) : null}
    </div>
  );
}
