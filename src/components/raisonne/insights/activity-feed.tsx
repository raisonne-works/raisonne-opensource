import Link from 'next/link';
import { ArrowUpRightIcon } from 'lucide-react';

import { EMPTY_BLOCK_CLASS } from '@/components/raisonne/shell/measure';
import { formatDate, shortAddress, shortTokenId } from '@/components/raisonne/works/lib';
import { Badge } from '@/components/ui/badge';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { isZeroAddress } from '@/lib/chain/address';
import { formatTokenAmount } from '@/lib/money';
import { cn } from '@/lib/utils';

import { EVENT_LABELS, explorerHost, txExplorerUrl, type ActivityRowData } from './lib';

/**
 * The public on-chain feed: what happened, to which work, between which
 * wallets, for how much when the transaction said so, and a link to the
 * block explorer so any row can be checked against the chain itself.
 *
 * A wallet is shown as its address. No name, no avatar and no collector
 * record: an address is public on the chain, and anything else about the
 * person holding it is not this page's to publish.
 *
 * Below the medium breakpoint the same rows are stacked cards instead. Seven
 * columns crammed into 390 px put four of them on screen and the other three
 * behind a horizontal scroll inside the table that nothing signposted, and
 * made a work title wrap to four lines. A card carries every field, labelled,
 * in the order somebody reads them.
 */
export function ActivityFeed({ rows, caption }: { rows: ActivityRowData[]; caption?: string }) {
  if (rows.length === 0) {
    return (
      <Empty className={cn(EMPTY_BLOCK_CLASS, 'max-w-md')}>
        <EmptyHeader>
          <EmptyTitle>No events match</EmptyTitle>
          <EmptyDescription>Clear the filters, or take a newer snapshot with the chain command.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-3 md:hidden">
        {caption ? <li className="text-sm text-muted-foreground">{caption}</li> : null}
        {rows.map(row => (
          <li key={row.id}>
            <ActivityCard row={row} />
          </li>
        ))}
      </ul>

      <Table className="hidden md:table">
      {caption ? <TableCaption className="text-left">{caption}</TableCaption> : null}
      <TableHeader>
        <TableRow>
          <TableHead scope="col" className="whitespace-nowrap">
            When
          </TableHead>
          <TableHead scope="col">What</TableHead>
          <TableHead scope="col">Work</TableHead>
          <TableHead scope="col">From</TableHead>
          <TableHead scope="col">To</TableHead>
          <TableHead scope="col" className="text-right">
            Price
          </TableHead>
          <TableHead scope="col" className="text-right">
            Transaction
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(row => {
          const explorer = txExplorerUrl(row.chain, row.txHash);
          const host = explorerHost(row.chain, row.txHash);

          return (
            <TableRow key={row.id}>
              <TableCell className="py-2 align-top whitespace-nowrap tabular-nums">
                <time dateTime={row.at}>{formatDate(row.at)}</time>
              </TableCell>
              <TableCell className="py-2 align-top">
                <Badge variant={row.type === 'sale' ? 'default' : 'outline'}>{EVENT_LABELS[row.type]}</Badge>
                {row.quantity > 1 ? (
                  <span className="mt-1 block text-xs text-muted-foreground tabular-nums">
                    {row.quantity} editions
                  </span>
                ) : null}
              </TableCell>
              <TableHead scope="row" className="h-auto max-w-56 py-2 align-top font-normal text-pretty whitespace-normal">
                {row.work ? (
                  <Link
                    href={row.work.href}
                    className="rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {row.work.title}
                  </Link>
                ) : (
                  <span>
                    Token <span className="font-mono text-xs">{shortTokenId(row.tokenId)}</span>
                  </span>
                )}
                {row.seriesTitle ? (
                  <span className="block text-xs text-muted-foreground">{row.seriesTitle}</span>
                ) : (
                  <span className="block text-xs text-muted-foreground">Not in this catalogue</span>
                )}
              </TableHead>
              <TableCell className="py-2 align-top font-mono text-xs">
                <Wallet address={row.from} kind={row.type === 'mint' ? 'mint' : 'wallet'} />
              </TableCell>
              <TableCell className="py-2 align-top font-mono text-xs">
                <Wallet address={row.to} kind={row.type === 'burn' ? 'burn' : 'wallet'} />
              </TableCell>
              <TableCell className="py-2 text-right align-top tabular-nums">
                {row.price ? (
                  <span className="font-medium">{formatTokenAmount(row.price)}</span>
                ) : (
                  <span className="text-xs text-muted-foreground">No price on chain</span>
                )}
              </TableCell>
              <TableCell className="py-2 text-right align-top">
                {explorer ? (
                  <a
                    href={explorer}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-sm font-mono text-xs underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {shortAddress(row.txHash, 6, 4)}
                    <ArrowUpRightIcon aria-hidden className="ml-0.5 inline size-3 -translate-y-px text-muted-foreground" />
                    <span className="sr-only"> on {host} (opens in a new tab)</span>
                  </a>
                ) : (
                  <span className="font-mono text-xs text-muted-foreground">{shortAddress(row.txHash, 6, 4)}</span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
      </Table>
    </>
  );
}

/** One event as a card, for a screen too narrow to carry seven columns. */
function ActivityCard({ row }: { row: ActivityRowData }) {
  const explorer = txExplorerUrl(row.chain, row.txHash);
  const host = explorerHost(row.chain, row.txHash);

  return (
    <article className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="min-w-0 text-sm font-medium text-pretty">
          {row.work ? (
            <Link
              href={row.work.href}
              className="rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {row.work.title}
            </Link>
          ) : (
            <span>
              Token <span className="font-mono text-xs">{shortTokenId(row.tokenId)}</span>
            </span>
          )}
        </h3>
        <Badge variant={row.type === 'sale' ? 'default' : 'outline'} className="shrink-0">
          {EVENT_LABELS[row.type]}
        </Badge>
      </div>

      <p className="flex flex-wrap items-baseline gap-x-2 text-xs text-muted-foreground">
        <time dateTime={row.at} className="tabular-nums">
          {formatDate(row.at)}
        </time>
        <span>{row.seriesTitle ?? 'Not in this catalogue'}</span>
      </p>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div className="flex flex-col">
          <dt className="text-muted-foreground">From</dt>
          <dd className="font-mono">
            <Wallet address={row.from} kind={row.type === 'mint' ? 'mint' : 'wallet'} />
          </dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-muted-foreground">To</dt>
          <dd className="font-mono">
            <Wallet address={row.to} kind={row.type === 'burn' ? 'burn' : 'wallet'} />
          </dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-muted-foreground">Price</dt>
          <dd className="tabular-nums">
            {row.price ? <span className="font-medium">{formatTokenAmount(row.price)}</span> : 'No price on chain'}
          </dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-muted-foreground">Transaction</dt>
          <dd className="font-mono">
            {explorer ? (
              <a
                href={explorer}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {shortAddress(row.txHash, 6, 4)}
                <ArrowUpRightIcon aria-hidden className="ml-0.5 inline size-3 -translate-y-px text-muted-foreground" />
                <span className="sr-only"> on {host} (opens in a new tab)</span>
              </a>
            ) : (
              shortAddress(row.txHash, 6, 4)
            )}
          </dd>
        </div>
        {row.quantity > 1 ? (
          <div className="flex flex-col">
            <dt className="text-muted-foreground">Editions</dt>
            <dd className="tabular-nums">{row.quantity}</dd>
          </div>
        ) : null}
      </dl>
    </article>
  );
}

/**
 * An address, or the plain word for the zero address at either end of a mint
 * or a burn. Printing 0x0000…0000 there would be accurate and useless.
 */
function Wallet({ address, kind }: { address: string | null; kind: 'wallet' | 'mint' | 'burn' }) {
  if (!address || isZeroAddress(address)) {
    return <span className="font-sans text-xs text-muted-foreground">{kind === 'burn' ? 'Burned' : 'Newly minted'}</span>;
  }
  return <span title={address}>{shortAddress(address)}</span>;
}
