import Link from 'next/link';
import { ArrowRightIcon } from 'lucide-react';

import { dropHref } from '@/components/raisonne/works/lib';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { dropStatus } from '@/lib/records';
import type { Drop } from '@/lib/types';
import { cn } from '@/lib/utils';

import { DROP_STATUS_LABELS, dropDateLine } from './lib';

/**
 * A line on a series page saying a release is coming, with the way to it.
 *
 * Wave 1 ships no list of drops, so this and the home page are how a visitor
 * finds one. It is worked out at render time from the dates; the drop page
 * itself carries the running clock.
 */
export function DropCallout({
  drop,
  now,
  className,
}: {
  drop: Drop;
  /** The time the page was rendered. */
  now: number;
  className?: string;
}) {
  const status = dropStatus(drop, now);
  if (status === 'ended') return null;

  return (
    <div
      data-slot="drop-callout"
      className={cn(
        'flex flex-col gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={status === 'live' ? 'default' : 'secondary'}>{DROP_STATUS_LABELS[status]}</Badge>
          <span className="text-sm font-medium text-pretty">{drop.title}</span>
        </div>
        <p className="text-sm text-muted-foreground">{dropDateLine(drop, status)}</p>
      </div>
      <Button variant="outline" size="sm" nativeButton={false} render={<Link href={dropHref(drop.slug)} />}>
        {status === 'live' ? 'Collect it' : 'See the release'}
        <ArrowRightIcon aria-hidden data-icon="inline-end" />
      </Button>
    </div>
  );
}
