import Link from 'next/link';
import { PackageIcon, PencilRulerIcon } from 'lucide-react';

import { formatDate, shortAddress } from '@/components/raisonne/works/lib';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { EMPTY_BLOCK_CLASS } from '@/components/raisonne/shell/measure';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatMoney } from '@/lib/money';
import { type BuyerRecord, orderItemCount, orderSummaryLine } from '@/lib/store/order-view';
import type { Commission, Order } from '@/lib/types';
import { countryName } from '@/lib/store/checkout';

import { CommissionStatusBadge, OrderStatusBadge } from './order-status';

/**
 * Lists of orders, commissions and buyers.
 *
 * A table, because these are records with the same fields and a person reads
 * them by scanning down one column. The order number leads, since that is
 * what a buyer quotes and what the artist searches for.
 */

export function OrderList({
  orders,
  emptyNote,
  emptyAction,
}: {
  orders: readonly Order[];
  emptyNote?: string;
  /** Where an empty state sends the reader. Every empty state here has one. */
  emptyAction?: { href: string; label: string };
}) {
  if (orders.length === 0) {
    return (
      <Empty className={EMPTY_BLOCK_CLASS}>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <PackageIcon aria-hidden />
          </EmptyMedia>
          <EmptyTitle>No orders yet</EmptyTitle>
          <EmptyDescription>
            {emptyNote ??
              'Orders placed with this wallet show up here, and so do orders placed as a guest with an email address this wallet has ordered with before.'}
          </EmptyDescription>
        </EmptyHeader>
        {emptyAction ? (
          <EmptyContent>
            <Button variant="outline" nativeButton={false} render={<Link href={emptyAction.href} />}>
              {emptyAction.label}
            </Button>
          </EmptyContent>
        ) : null}
      </Empty>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order</TableHead>
          <TableHead>Placed</TableHead>
          <TableHead className="hidden sm:table-cell">Items</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map(order => (
          <TableRow key={order.id}>
            <TableCell>
              <Button variant="link" size="sm" className="h-auto p-0" nativeButton={false} render={<Link href={`/orders/${order.id}`} />}>
                <span className="font-mono">{order.number}</span>
              </Button>
            </TableCell>
            <TableCell className="text-muted-foreground">
              <time dateTime={order.createdAt}>{formatDate(order.createdAt)}</time>
            </TableCell>
            <TableCell className="hidden max-w-[24rem] truncate text-muted-foreground sm:table-cell">
              {orderSummaryLine(order)}
              <span className="text-xs"> ({orderItemCount(order)})</span>
            </TableCell>
            <TableCell className="text-right tabular-nums">{formatMoney(order.total)}</TableCell>
            <TableCell>
              <OrderStatusBadge status={order.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function CommissionList({
  commissions,
  /** The artist's view: the address to reply to, since replying is the whole flow. */
  showContact = false,
  emptyAction,
}: {
  commissions: readonly Commission[];
  showContact?: boolean;
  emptyAction?: { href: string; label: string };
}) {
  if (commissions.length === 0) {
    return (
      <Empty className={EMPTY_BLOCK_CLASS}>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <PencilRulerIcon aria-hidden />
          </EmptyMedia>
          <EmptyTitle>No commissions yet</EmptyTitle>
          <EmptyDescription>A brief sent to the studio appears here with whatever the studio has answered.</EmptyDescription>
        </EmptyHeader>
        {emptyAction ? (
          <EmptyContent>
            <Button variant="outline" nativeButton={false} render={<Link href={emptyAction.href} />}>
              {emptyAction.label}
            </Button>
          </EmptyContent>
        ) : null}
      </Empty>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Reference</TableHead>
          <TableHead>Sent</TableHead>
          {showContact ? <TableHead>Reply to</TableHead> : null}
          <TableHead className="hidden sm:table-cell">Brief</TableHead>
          <TableHead className="text-right">Quote</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {commissions.map(commission => (
          <TableRow key={commission.id}>
            <TableCell className="font-mono">{commission.number}</TableCell>
            <TableCell className="text-muted-foreground">
              <time dateTime={commission.createdAt}>{formatDate(commission.createdAt)}</time>
            </TableCell>
            {showContact ? (
              <TableCell>
                {commission.email ? (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0"
                    nativeButton={false}
                    render={<a href={`mailto:${commission.email}?subject=${encodeURIComponent(`Commission ${commission.number}`)}`} />}
                  >
                    {commission.email}
                  </Button>
                ) : (
                  <span className="text-muted-foreground">No address</span>
                )}
              </TableCell>
            ) : null}
            <TableCell className="hidden max-w-[24rem] truncate text-muted-foreground sm:table-cell">
              {/* The artist sees whether the works this brief names were
                  actually in the sender's wallet, because the form accepts
                  any token id from anybody and an unchecked claim must not
                  read like a checked one. */}
              {showContact && commission.workIdsChecked ? (
                <Badge variant={commission.workIdsChecked === 'verified' ? 'secondary' : 'outline'} className="mr-2 align-middle">
                  {commission.workIdsChecked === 'verified' ? 'Holdings checked' : 'Holdings unchecked'}
                </Badge>
              ) : null}
              {commission.artefact ? `${commission.artefact}: ` : ''}
              {commission.brief}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {/* Absent until the artist has quoted. A blank is honest; a zero is not. */}
              {commission.quote ? formatMoney(commission.quote) : <span className="text-muted-foreground">Not yet</span>}
            </TableCell>
            <TableCell>
              <CommissionStatusBadge status={commission.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * The artist's buyers, worked out from the orders themselves.
 *
 * There is no customer table in this install, and there does not need to be:
 * the only reason it holds an address is that somebody ordered something.
 */
export function BuyerTable({ buyers }: { buyers: readonly BuyerRecord[] }) {
  if (buyers.length === 0) {
    return <p className="text-sm text-muted-foreground">Nobody has ordered yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Buyer</TableHead>
          <TableHead className="hidden sm:table-cell">Where</TableHead>
          <TableHead className="text-right">Orders</TableHead>
          <TableHead className="text-right">Paid</TableHead>
          <TableHead>Last order</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {buyers.map(buyer => (
          <TableRow key={buyer.email}>
            <TableCell>
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium">{buyer.name || shortAddress(buyer.email, 8, 6)}</span>
                <span className="truncate text-xs text-muted-foreground">{buyer.email}</span>
              </span>
            </TableCell>
            <TableCell className="hidden text-muted-foreground sm:table-cell">{countryName(buyer.country)}</TableCell>
            <TableCell className="text-right tabular-nums">{buyer.orders}</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatMoney({ amount: buyer.paidAmount, currency: buyer.currency })}
            </TableCell>
            <TableCell className="text-muted-foreground">
              <time dateTime={buyer.lastOrderAt}>{formatDate(buyer.lastOrderAt)}</time>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
