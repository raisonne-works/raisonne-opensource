import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowDownLeftIcon, ArrowUpRightIcon, ExternalLinkIcon, HistoryIcon } from 'lucide-react';

import { EMPTY_BLOCK_CLASS } from '@/components/raisonne/shell/measure';
import { formatDate, shortAddress, workHref, workTitle } from '@/components/raisonne/works/lib';
import { Badge } from '@/components/ui/badge';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { formatTokenAmount } from '@/lib/money';
import type { ActivityRow } from '@/lib/collectors';
import { cn } from '@/lib/utils';

import { collectorHref, eventCounterparty, eventDirection, eventVerb, txExplorerUrl } from './lib';

/**
 * One wallet's history, newest first.
 *
 * Every row is an event that is public on-chain, written from this wallet's
 * side: what happened, to which work, with whom, when, and for how much when
 * the transaction carried a price. A sale the install could not price is a
 * transfer in the data, and it says transfer here, because inventing a sale
 * with no number is worse than admitting a transfer.
 */

export function ActivityList({
  rows,
  address,
  emptyLabel = 'Nothing on-chain yet',
  linkProfiles = true,
  note,
  className,
}: {
  rows: ActivityRow[];
  /** The wallet the list is written from. */
  address: string;
  emptyLabel?: string;
  /** Whether this install publishes a page per wallet (settings.publicCollectorProfiles). */
  linkProfiles?: boolean;
  /**
   * What this list does not cover, directly above it. It used to live in a
   * right-hand rail a long way from the rows it was about, so a wallet
   * holding four works beside a list of two events looked like a fault
   * rather than the edge of the snapshot.
   */
  note?: ReactNode;
  className?: string;
}) {
  if (rows.length === 0) {
    return (
      <Empty className={EMPTY_BLOCK_CLASS}>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HistoryIcon />
          </EmptyMedia>
          <EmptyTitle>{emptyLabel}</EmptyTitle>
          <EmptyDescription>
            Mints, sales and transfers appear here once a chain snapshot has covered them.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
      <ol className="flex flex-col divide-y divide-border border-y border-border">
        {rows.map(row => (
          <ActivityRowItem key={row.event.id} row={row} address={address} linkProfiles={linkProfiles} />
        ))}
      </ol>
    </div>
  );
}

function ActivityRowItem({ row, address, linkProfiles }: { row: ActivityRow; address: string; linkProfiles: boolean }) {
  const { event, work } = row;
  const direction = eventDirection(event, address);
  const verb = eventVerb(event, address);
  const counterparty = eventCounterparty(event, address);
  const price = formatTokenAmount(event.price);
  const when = formatDate(event.at);
  const explorer = txExplorerUrl(event.chain, event.txHash);
  const title = work ? workTitle(work) : `Token ${event.tokenId}`;

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm">
      <span className="flex min-w-0 flex-1 items-center gap-2.5">
        <span
          aria-hidden
          className={cn(
            'inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground',
          )}
        >
          {direction === 'out' ? (
            <ArrowUpRightIcon className="size-3.5" />
          ) : (
            <ArrowDownLeftIcon className="size-3.5" />
          )}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="flex min-w-0 items-center gap-2">
            <span className="font-medium">{verb}</span>
            {work ? (
              <Link href={workHref(work)} className="min-w-0 truncate underline-offset-4 hover:underline">
                {title}
              </Link>
            ) : (
              <span className="min-w-0 truncate font-mono text-xs" title={event.tokenId}>
                {title}
              </span>
            )}
          </span>
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            {counterparty ? (
              linkProfiles ? (
                <Link href={collectorHref(counterparty)} className="font-mono underline-offset-4 hover:underline">
                  {direction === 'out' ? 'to' : 'from'} {shortAddress(counterparty)}
                </Link>
              ) : (
                <span className="font-mono">
                  {direction === 'out' ? 'to' : 'from'} {shortAddress(counterparty)}
                </span>
              )
            ) : null}
            {row.series ? <span className="truncate">{row.series.name}</span> : null}
          </span>
        </span>
      </span>

      <span className="flex shrink-0 items-center gap-3">
        {price ? <span className="font-medium tabular-nums">{price}</span> : null}
        {event.type === 'transfer' && !price ? <Badge variant="outline">No price on-chain</Badge> : null}
        {when ? <span className="text-xs text-muted-foreground tabular-nums">{when}</span> : null}
        {explorer ? (
          <a
            href={explorer}
            target="_blank"
            rel="noreferrer noopener"
            className="text-muted-foreground hover:text-foreground"
            aria-label={`Transaction ${event.txHash} on the explorer (opens in a new tab)`}
          >
            <ExternalLinkIcon aria-hidden className="size-3.5" />
          </a>
        ) : null}
      </span>
    </li>
  );
}
