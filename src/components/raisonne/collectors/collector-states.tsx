import Link from 'next/link';
import { ImagesIcon, UserSearchIcon } from 'lucide-react';

import { EMPTY_BLOCK_CLASS } from '@/components/raisonne/shell/measure';
import { formatDateTime, shortAddress } from '@/components/raisonne/works/lib';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import type { HoldingsSource } from '@/lib/chain/holdings';
import { cn } from '@/lib/utils';

/**
 * The states a collector page is in when it is not simply showing a
 * collection: nothing held, nobody at this address, and where the figures on
 * screen came from.
 *
 * Two states these pages share with the rest of the install are not here.
 * The "not configured" panel is the auth package's SetupPanel, and the
 * "no chain snapshot" panel is the insights package's NoChainData, so an
 * install shows one of each rather than four that almost agree.
 *
 * Each state is designed rather than blank, says what is true, and says what
 * would change it. None of them is an error: an install with no Alchemy key
 * is a working install whose collector pages have nothing to read yet, and
 * it should read that way.
 */

/** A wallet that holds none of this artist's work. The most common honest answer. */
export function NoHoldings({ mine = false, className }: { mine?: boolean; className?: string }) {
  return (
    <Empty className={cn(EMPTY_BLOCK_CLASS, className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ImagesIcon />
        </EmptyMedia>
        <EmptyTitle>{mine ? 'You do not hold any works by this artist yet' : 'No works held'}</EmptyTitle>
        <EmptyDescription>
          {mine
            ? 'Anything you acquire on the artist’s own contracts appears here, with its place in the catalogue.'
            : 'This wallet held work by the artist at some point, but holds none at the last snapshot.'}
        </EmptyDescription>
      </EmptyHeader>
      {mine ? (
        <EmptyContent>
          <Button nativeButton={false} render={<Link href="/works" />}>
            Browse the catalogue
          </Button>
        </EmptyContent>
      ) : null}
    </Empty>
  );
}

/** An address nobody has a record of, on the public profile route. */
export function UnknownCollector({ address, className }: { address: string; className?: string }) {
  return (
    <Empty className={cn(EMPTY_BLOCK_CLASS, className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <UserSearchIcon />
        </EmptyMedia>
        <EmptyTitle>Nothing recorded for this wallet</EmptyTitle>
        <EmptyDescription>
          The last chain snapshot has no holdings and no events for{' '}
          <span className="font-mono">{shortAddress(address, 10, 8)}</span>. That is not the same as saying it holds
          nothing: a work acquired since the snapshot was taken is not in it yet.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" nativeButton={false} render={<Link href="/collectors" />}>
          All collectors
        </Button>
      </EmptyContent>
    </Empty>
  );
}

/**
 * Where the numbers on this page came from, and what they cannot see. Every
 * page that prints a count prints this too, so nobody has to guess whether
 * they are reading the chain or a file from last week.
 */
export function SourceNote({
  source,
  snapshotAt,
  gaps = [],
  error,
  className,
}: {
  source: HoldingsSource;
  snapshotAt: string | null;
  gaps?: string[];
  error?: string | null;
  className?: string;
}) {
  const taken = formatDateTime(snapshotAt);
  const lead =
    source === 'live'
      ? 'Holdings read from the chain just now.'
      : source === 'snapshot'
        ? 'Holdings read from this install’s chain snapshot.'
        : 'No chain source is configured, so no holdings could be read.';

  return (
    <div className={cn('flex flex-col gap-1 text-xs text-muted-foreground', className)}>
      <p>
        {lead}
        {taken ? ` Ranks, events and prices come from the snapshot taken ${taken}.` : ''}
      </p>
      {error ? <p>The live read failed: {error}. The snapshot is shown instead where there is one.</p> : null}
      {gaps.length > 0 ? (
        <ul className="flex flex-col gap-0.5">
          {gaps.map(gap => (
            <li key={gap}>{gap}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
