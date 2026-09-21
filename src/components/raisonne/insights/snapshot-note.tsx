import { DatabaseIcon, InfoIcon } from 'lucide-react';

import { formatDate } from '@/components/raisonne/works/lib';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

export interface SnapshotMeta {
  /** ISO date-time the snapshot was taken, or null when there is none. */
  computedAt: string | null;
  /** True when ALCHEMY_API_KEY is set, so one signed-in wallet can also be read live. */
  live: boolean;
  /** Plain-words caveats the snapshot recorded about itself. */
  gaps: string[];
  /** Contracts the snapshot covers, and how many of them ran out of room. */
  contracts: number;
  truncated: number;
}

/**
 * Where the numbers on this page came from, and when.
 *
 * A dashboard whose figures have no date is a dashboard nobody can check.
 * This line is printed on every insights page, under the heading, and it
 * names the snapshot's own date rather than today's: the figures are as old
 * as the last `pnpm snapshot:chain`, and saying otherwise would be a lie by
 * layout.
 */
export function SnapshotNote({ meta, className }: { meta: SnapshotMeta; className?: string }) {
  const taken = formatDate(meta.computedAt);

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <DatabaseIcon aria-hidden className="size-4 shrink-0" />
        <span>
          {taken ? (
            <>
              On-chain figures from a snapshot taken <time dateTime={meta.computedAt ?? undefined}>{taken}</time>
            </>
          ) : (
            'No chain snapshot has been taken yet'
          )}
          {meta.contracts > 0 ? `, across ${meta.contracts} ${meta.contracts === 1 ? 'contract' : 'contracts'}` : null}.
        </span>
        <span className="text-muted-foreground/80">
          {meta.live ? 'Live reads are configured for a signed-in wallet.' : 'Live reads are not configured.'}
        </span>
      </p>

      {meta.gaps.length > 0 || meta.truncated > 0 ? (
        <Alert>
          <InfoIcon aria-hidden />
          <AlertTitle>What these figures do not include</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-4">
              {meta.truncated > 0 ? (
                <li>
                  {meta.truncated} of the {meta.contracts} contracts hit the snapshot&rsquo;s event cap, so their
                  earliest history is missing. Raise the cap and run <code className="font-mono">pnpm snapshot:chain</code>{' '}
                  again.
                </li>
              ) : null}
              {meta.gaps.map(gap => (
                <li key={gap}>{gap}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
