import { ExternalLinkIcon, InfoIcon, MailIcon, PrinterIcon, TruckIcon } from 'lucide-react';

import { SummaryLines, SummaryTotals, TAX_NOTE, linesFromOrder } from '@/components/raisonne/checkout/order-summary';
import { formatDateTime } from '@/components/raisonne/works/lib';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatAddressLines } from '@/lib/store/checkout';
import { ORDER_STATUS_COPY, isCancellableByBuyer, showsTracking, trackingHref } from '@/lib/store/order-view';
import type { Order, OrderStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

import { CancelOrderButton, OwnerOrderControls } from './order-actions';
import { OrderStatusBadge, OrderTimeline } from './order-status';

/**
 * One order, as its buyer sees it and as the artist sees it.
 *
 * The same component for both, because two components drift and a buyer
 * being shown a different total from the artist is the worst kind of bug to
 * find out about. What the artist gets extra is additive and clearly theirs:
 * the note they wrote to themselves, the stock they now have to change, the
 * message this install could not send, and the controls.
 *
 * Everything the server knows is passed in. This file reads no data, no
 * environment and no session, so it also renders inside the client-side
 * lookup form for somebody who ordered as a guest.
 */

export interface OwnerExtras {
  /** Statuses the order store will accept, computed with canTransition. */
  allowed: readonly OrderStatus[];
  /** What the artist now has to change in their own product data. */
  stock: { title: string; variantName: string; sku: string | null; sold: number; recorded: number | null }[];
  /** A message this install composed and could not send. */
  draft: { label: string; href: string } | null;
}

export function OrderDetail({
  order,
  isOwner = false,
  owner,
  /** podStatusNote(order), worked out on the server. */
  podNote = null,
  /** emailStateNote(), so the page never implies an email that was not sent. */
  emailNote = null,
  className,
}: {
  order: Order;
  isOwner?: boolean;
  owner?: OwnerExtras;
  podNote?: string | null;
  emailNote?: string | null;
  className?: string;
}) {
  const status = ORDER_STATUS_COPY[order.status];
  const address = formatAddressLines(order.shippingAddress);
  const link = trackingHref(order);
  const hasPodLines = order.lines.some(line => line.podSku);

  return (
    <div className={cn('grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]', className)}>
      <div className="flex min-w-0 flex-col gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-3">
              <span className="font-mono">{order.number}</span>
              <OrderStatusBadge status={order.status} />
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-pretty text-muted-foreground">{status.detail}</p>
            <OrderTimeline order={order} />
          </CardContent>
        </Card>

        {showsTracking(order) ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TruckIcon aria-hidden className="size-4 text-muted-foreground" />
                On its way
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {order.fulfilment?.carrier ? <Detail label="Carrier" value={order.fulfilment.carrier} /> : null}
              {order.fulfilment?.trackingNumber ? (
                <Detail label="Tracking number" value={order.fulfilment.trackingNumber} mono />
              ) : null}
              {link ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  nativeButton={false}
                  render={<a href={link} target="_blank" rel="noopener noreferrer" />}
                >
                  Track the parcel
                  <ExternalLinkIcon aria-hidden data-icon="inline-end" />
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>What was ordered</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <SummaryLines lines={linesFromOrder(order)} />
            <Separator />
            <SummaryTotals
              subtotal={order.subtotal}
              shipping={order.shipping}
              total={order.total}
              note={TAX_NOTE}
            />
          </CardContent>
        </Card>

        {podNote ? (
          <Alert>
            <PrinterIcon aria-hidden />
            <AlertTitle>Printed to order</AlertTitle>
            <AlertDescription>{podNote}</AlertDescription>
          </Alert>
        ) : null}

        {isOwner && owner ? (
          <Card>
            <CardHeader>
              <CardTitle>The studio&rsquo;s controls</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <OwnerOrderControls order={order} allowed={owner.allowed} hasPodLines={hasPodLines} />

              {owner.stock.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-medium">Stock to change</h3>
                  <p className="text-sm text-pretty text-muted-foreground">
                    Products are read from this install&rsquo;s own data, not written to it, so nothing has been
                    decremented. Change these where you keep them and run the snapshot again.
                  </p>
                  <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                    {owner.stock.map(entry => (
                      <li key={`${entry.sku ?? entry.title}-${entry.variantName}`}>
                        {entry.sold} x {entry.title}
                        {entry.variantName ? `, ${entry.variantName}` : ''}
                        {entry.sku ? ` (${entry.sku})` : ''}
                        {entry.recorded === null ? ', stock not tracked' : `, recorded as ${entry.recorded}`}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {owner.draft ? (
                <div className="flex flex-col items-start gap-2">
                  <h3 className="text-sm font-medium">Tell the buyer</h3>
                  <p className="text-sm text-pretty text-muted-foreground">
                    This install has no mail adapter, so it wrote the message instead of sending it.
                  </p>
                  <Button variant="outline" size="sm" nativeButton={false} render={<a href={owner.draft.href} />}>
                    <MailIcon aria-hidden data-icon="inline-start" />
                    {owner.draft.label}
                  </Button>
                </div>
              ) : null}

              {order.internalNote ? <Detail label="Your note" value={order.internalNote} /> : null}
            </CardContent>
          </Card>
        ) : null}
      </div>

      <aside className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Detail label="Placed" value={formatDateTime(order.createdAt) ?? order.createdAt} />
            {order.email ? <Detail label="Contact" value={order.email} /> : null}
            {address.length > 0 ? (
              <div className="flex flex-col gap-1">
                <p className="text-xs font-medium text-muted-foreground uppercase">Going to</p>
                <address className="text-sm not-italic">
                  {address.map(line => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </address>
              </div>
            ) : null}
            <Detail
              label="Payment"
              value={`${order.payment.provider}, ${order.payment.status}${
                order.payment.paidAt ? ` on ${formatDateTime(order.payment.paidAt)}` : ''
              }`}
            />
            {order.note ? <Detail label="Note with the order" value={order.note} /> : null}
          </CardContent>
        </Card>

        {emailNote ? (
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <InfoIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span className="text-pretty">{emailNote}</span>
          </p>
        ) : null}

        {!isOwner && isCancellableByBuyer(order) ? <CancelOrderButton orderId={order.id} /> : null}
      </aside>
    </div>
  );
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-medium text-muted-foreground uppercase">{label}</p>
      <p className={cn('text-sm text-pretty', mono && 'font-mono')}>{value}</p>
    </div>
  );
}
