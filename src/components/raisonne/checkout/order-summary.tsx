import Image from 'next/image';
import { ImageOffIcon, TriangleAlertIcon } from 'lucide-react';

import { formatMoney, formatMoneyOrFree } from '@/lib/money';
import type { Asset, CartTotals, Money, Order } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * What is in the basket, and what it comes to.
 *
 * One component for the cart at checkout, the order page and the
 * confirmation, because those three showing the same order differently is
 * how a buyer stops trusting the total. It takes plain rows rather than
 * either type, so a cart being priced and an order already placed both read
 * the same.
 *
 * Client safe: no data reading, no environment, no server imports.
 */

export interface SummaryLine {
  key: string;
  title: string;
  variantName: string;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
  image: Asset | null;
  /** Set when the line could not be priced. It is shown, not hidden. */
  problem?: string | null;
  /** e.g. the work a phygital object is made from. */
  note?: string | null;
}

/** The rows of a cart the server has just priced. */
export function linesFromTotals(totals: CartTotals): SummaryLine[] {
  return totals.lines.map(entry => ({
    key: `${entry.line.productSlug}::${entry.line.variantId}::${entry.line.workId ?? ''}`,
    title: entry.title,
    variantName: entry.variantName,
    quantity: entry.line.quantity,
    unitPrice: entry.unitPrice,
    lineTotal: entry.lineTotal,
    image: entry.image,
    problem: entry.problem ?? null,
    note: workNote(entry.line.workId),
  }));
}

/** The rows of an order that has been placed. Its prices are the ones that were charged. */
export function linesFromOrder(order: Order): SummaryLine[] {
  return order.lines.map(line => ({
    key: `${line.productSlug}::${line.variantId}::${line.workId ?? ''}`,
    title: line.title,
    variantName: line.variantName,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    lineTotal: line.lineTotal,
    image: null,
    note: workNote(line.workId),
  }));
}

/**
 * A phygital line says which of the buyer's own works it is made from. The
 * id is chain:contract:tokenId, which is exact and unreadable, so the token
 * number is what the line shows.
 */
function workNote(workId: string | null | undefined): string | null {
  if (!workId) return null;
  const tokenId = workId.split(':').pop();
  return tokenId && tokenId !== workId ? `Made from your token ${tokenId}` : `Made from ${workId}`;
}

export function SummaryLines({ lines, className }: { lines: readonly SummaryLine[]; className?: string }) {
  if (lines.length === 0) {
    return <p className={cn('text-sm text-muted-foreground', className)}>Nothing in the basket.</p>;
  }

  return (
    <ul className={cn('flex flex-col gap-4', className)}>
      {lines.map(line => (
        <li key={line.key} className="flex items-start gap-3">
          <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-muted dark:bg-muted/40">
            {line.image?.src ? (
              <Image src={line.image.src} alt="" fill sizes="56px" className="object-cover" />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <ImageOffIcon aria-hidden className="size-4" />
              </span>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-sm font-medium text-pretty">{line.title}</p>
            {line.variantName ? <p className="text-xs text-muted-foreground">{line.variantName}</p> : null}
            <p className="text-xs text-muted-foreground">
              {line.quantity} x {formatMoney(line.unitPrice)}
            </p>
            {line.note ? <p className="truncate font-mono text-xs text-muted-foreground">{line.note}</p> : null}
            {line.problem ? (
              <p className="flex items-start gap-1.5 text-xs text-destructive">
                <TriangleAlertIcon aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                <span className="text-pretty">{line.problem}</span>
              </p>
            ) : null}
          </div>

          <p className="shrink-0 text-sm tabular-nums">{formatMoney(line.lineTotal)}</p>
        </li>
      ))}
    </ul>
  );
}

/**
 * Subtotal, shipping, total.
 *
 * There is no tax line. This install has no tax rules and cannot work out
 * what is owed where, and a line reading "Tax: $0.00" is a claim it has no
 * business making. The note under the total says so instead.
 */
export function SummaryTotals({
  subtotal,
  shipping,
  total,
  shippingLabel,
  note,
  className,
}: {
  subtotal: Money;
  shipping: Money;
  total: Money;
  /** The method's name, when one is chosen. */
  shippingLabel?: string | null;
  note?: string | null;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Row label="Subtotal" value={formatMoney(subtotal)} />
      <Row label={shippingLabel ? `Shipping, ${shippingLabel.toLowerCase()}` : 'Shipping'} value={formatMoneyOrFree(shipping)} />
      <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-border pt-3">
        <span className="text-sm font-medium">Total</span>
        <span className="text-base font-medium tabular-nums">{formatMoney(total)}</span>
      </div>
      {note ? <p className="text-xs text-pretty text-muted-foreground">{note}</p> : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

/**
 * The one sentence every total carries. Duty and import tax are real and
 * this install cannot compute them, so it says which is which rather than
 * quietly leaving the buyer to find out at the door.
 */
export const TAX_NOTE =
  'Prices are as shown. Any import duty or local tax is charged by the destination country and is not included here.';
