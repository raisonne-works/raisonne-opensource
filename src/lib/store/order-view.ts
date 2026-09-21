import type { Commission, CommissionStatus, Order, OrderStatus } from '@/lib/types';

/**
 * How an order reads to the person looking at it.
 *
 * Pure and client safe, so the page, the list and the artist's own controls
 * all describe a status the same way. Every sentence here is about something
 * the install actually knows: there is no "arriving Tuesday" because nothing
 * in this install can work that out.
 */

export interface StatusCopy {
  label: string;
  /** One sentence for the buyer. */
  detail: string;
  /** Which Badge variant carries it. */
  tone: 'default' | 'secondary' | 'outline' | 'destructive';
}

export const ORDER_STATUS_COPY: Record<OrderStatus, StatusCopy> = {
  pending: {
    label: 'Awaiting payment',
    detail: 'The order is held. Nothing has been charged and nothing is being made yet.',
    tone: 'outline',
  },
  paid: {
    label: 'Paid',
    detail: 'The payment went through. The studio has the order.',
    tone: 'default',
  },
  in_production: {
    label: 'Being made',
    detail: 'The studio is making it. There is nothing to track until it leaves.',
    tone: 'secondary',
  },
  shipped: {
    label: 'Shipped',
    detail: 'It has left the studio.',
    tone: 'secondary',
  },
  delivered: {
    label: 'Delivered',
    detail: 'The carrier recorded it as delivered.',
    tone: 'secondary',
  },
  cancelled: {
    label: 'Cancelled',
    detail: 'This order was cancelled. Nothing will be made or sent.',
    tone: 'outline',
  },
  refunded: {
    label: 'Refunded',
    detail: 'The payment was returned.',
    tone: 'outline',
  },
  failed: {
    label: 'Payment failed',
    detail: 'The payment did not go through, so nothing was charged. You can order again.',
    tone: 'destructive',
  },
};

export const COMMISSION_STATUS_COPY: Record<CommissionStatus, StatusCopy> = {
  new: { label: 'Sent', detail: 'The studio has the brief and has not replied yet.', tone: 'outline' },
  reviewing: { label: 'Being read', detail: 'The studio is reading the brief.', tone: 'secondary' },
  quoted: { label: 'Quoted', detail: 'The studio has answered with a price.', tone: 'default' },
  accepted: { label: 'Accepted', detail: 'The commission is agreed.', tone: 'default' },
  declined: { label: 'Declined', detail: 'The studio is not taking this one on.', tone: 'outline' },
  in_progress: { label: 'In progress', detail: 'The work is being made.', tone: 'secondary' },
  delivered: { label: 'Delivered', detail: 'The work has been handed over.', tone: 'secondary' },
};

// ---------------------------------------------------------------------------
// The timeline
// ---------------------------------------------------------------------------

export interface TimelineStep {
  id: OrderStatus;
  label: string;
  /** ISO date-time, when this install recorded one. Absent is absent, not guessed. */
  at: string | null;
  state: 'done' | 'current' | 'todo';
}

/** The ordinary path an order takes. Cancelled, refunded and failed leave it. */
const PATH: OrderStatus[] = ['pending', 'paid', 'in_production', 'shipped', 'delivered'];

const STOPPED: OrderStatus[] = ['cancelled', 'refunded', 'failed'];

export function hasStopped(order: Pick<Order, 'status'>): boolean {
  return STOPPED.includes(order.status);
}

/**
 * Where the order is along the ordinary path.
 *
 * Only two moments carry a real time: when the order was placed, and when
 * the payment settled. The rest show the step without a date rather than
 * borrowing `updatedAt`, which is the time of the last edit and not the time
 * the parcel left.
 */
export function orderTimeline(order: Order): TimelineStep[] {
  if (hasStopped(order)) {
    return [
      { id: 'pending', label: 'Placed', at: order.createdAt, state: 'done' },
      { id: order.status, label: ORDER_STATUS_COPY[order.status].label, at: order.updatedAt, state: 'current' },
    ];
  }

  const reached = PATH.indexOf(order.status);
  const at: Partial<Record<OrderStatus, string | null>> = {
    pending: order.createdAt,
    paid: order.payment.paidAt ?? null,
    shipped: order.fulfilment?.shippedAt ?? null,
    delivered: order.fulfilment?.deliveredAt ?? null,
  };

  return PATH.map((id, index) => ({
    id,
    label: id === 'pending' ? 'Placed' : ORDER_STATUS_COPY[id].label,
    at: at[id] ?? null,
    state: index < reached ? 'done' : index === reached ? 'current' : 'todo',
  }));
}

// ---------------------------------------------------------------------------
// What each side may do
// ---------------------------------------------------------------------------

/**
 * A buyer may call off an order nobody has been paid for. Once money has
 * changed hands, cancelling is a refund, and a refund is the artist's
 * decision, so the page asks them to write instead of offering a button that
 * would lie.
 */
export function isCancellableByBuyer(order: Pick<Order, 'status'>): boolean {
  return order.status === 'pending' || order.status === 'failed';
}

/** True while it is still worth telling the buyer where the parcel is. */
export function showsTracking(order: Order): boolean {
  return Boolean(order.fulfilment?.trackingNumber || order.fulfilment?.trackingUrl);
}

/** The tracking link, when the artist recorded one. A number alone is shown as text. */
export function trackingHref(order: Order): string | null {
  const url = order.fulfilment?.trackingUrl?.trim();
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? url : null;
}

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

export function orderItemCount(order: Order): number {
  return order.lines.reduce((total, line) => total + line.quantity, 0);
}

/** "Ground I (Plum), print and 2 more" for a list row. */
export function orderSummaryLine(order: Order): string {
  const [first, ...rest] = order.lines;
  if (!first) return 'No items';
  return rest.length ? `${first.title} and ${rest.length} more` : first.title;
}

export function isCommission(record: Order | Commission): record is Commission {
  return 'brief' in record;
}

/**
 * The order as the buyer may see it: everything except what the artist wrote
 * to themselves. `internalNote` is where a studio writes "chase the framer"
 * or "this one is a friend, no rush", and it is not for the buyer.
 */
export function forBuyer(order: Order): Order {
  return { ...order, internalNote: null };
}

// ---------------------------------------------------------------------------
// Buyers
// ---------------------------------------------------------------------------

/**
 * The artist's buyer list, worked out from the orders themselves.
 *
 * There is no customer table, and there should not be one: the only reason
 * this install holds an email address is that somebody ordered something, so
 * the orders are the record. Delete the order and the buyer goes with it.
 */
export interface BuyerRecord {
  email: string;
  name: string;
  country: string;
  orders: number;
  /** Paid orders only: what this install has actually taken from them. */
  paidAmount: number;
  currency: string;
  lastOrderAt: string;
}

export function buyersFromOrders(orders: readonly Order[]): BuyerRecord[] {
  const buyers = new Map<string, BuyerRecord>();

  for (const order of orders) {
    const email = order.email?.trim().toLowerCase();
    if (!email) continue;
    const paid = order.payment.status === 'paid' ? order.total.amount : 0;
    const existing = buyers.get(email);

    if (!existing) {
      buyers.set(email, {
        email,
        name: order.shippingAddress?.name ?? '',
        country: order.shippingAddress?.country ?? '',
        orders: 1,
        paidAmount: paid,
        currency: order.total.currency,
        lastOrderAt: order.createdAt,
      });
      continue;
    }

    existing.orders += 1;
    existing.paidAmount += order.total.currency === existing.currency ? paid : 0;
    if (Date.parse(order.createdAt) > Date.parse(existing.lastOrderAt)) {
      existing.lastOrderAt = order.createdAt;
      existing.name = order.shippingAddress?.name || existing.name;
      existing.country = order.shippingAddress?.country || existing.country;
    }
  }

  return [...buyers.values()].sort((a, b) => Date.parse(b.lastOrderAt) - Date.parse(a.lastOrderAt));
}
