import { formatDateTime } from '@/components/raisonne/works/lib';
import type { DropStatus } from '@/lib/records';
import type { Drop } from '@/lib/types';

/**
 * The plain words a drop is described in. Pure, so the countdown (which runs
 * in the browser) and the callout on a series page (which does not) say the
 * same thing.
 */

export const DROP_STATUS_LABELS: Record<DropStatus, string> = {
  announced: 'Announced',
  scheduled: 'Upcoming',
  live: 'Open now',
  ended: 'Closed',
};

/** "Opens 1 Dec 2026, 17:00 UTC", or "Date to be announced" when nobody has set one. */
export function dropDateLine(drop: Drop, status: DropStatus): string {
  const opens = formatDateTime(drop.startsAt);
  const closes = formatDateTime(drop.endsAt);
  if (status === 'ended') return closes ? `Closed ${closes}` : opens ? `Closed after ${opens}` : 'Closed';
  if (!opens) return 'Date to be announced';
  return status === 'live' ? `Opened ${opens}` : `Opens ${opens}`;
}
