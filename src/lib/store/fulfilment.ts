import 'server-only';

import { getArtist } from '@/fixtures';
import type { CartTotals, Commission, Order, OrderLine, StoreData } from '@/lib/types';

import { findProduct, findVariant } from './cart';
import type { CheckoutRequest } from './checkout';
import { commissionMessage, orderMessage, sendNotification, type NotifyResult, type OrderNotice } from './notify';
import { getOrderStore, newOrderId, newOrderNumber } from './orders';
import { amountsAgree, type PaymentEvent } from './payments';
import { getPodProvider, podStatusNote } from './pod';

/**
 * What happens to an order after the buyer has pressed the button.
 *
 * One place, so the checkout route, the payment webhook and the artist's own
 * controls all move an order the same way and leave the same record behind.
 *
 * The three rules this file exists to hold:
 *
 *  1. An order is written before a payment is asked for, so a webhook always
 *     has something to update and a payment can never arrive for an order
 *     this install has never heard of.
 *  2. Nothing is marked paid until the amount the provider reports matches
 *     the amount this install computed. A mismatch is logged and left alone:
 *     a half-paid order is the artist's to look at, not the webhook's to
 *     decide about.
 *  3. Nothing claims a print was sent to a printer, or a message to a buyer,
 *     unless it was. Both are stubs in this release and both say so.
 */

// ---------------------------------------------------------------------------
// Writing the order down
// ---------------------------------------------------------------------------

/**
 * The order, built from what the server priced and what the buyer typed.
 *
 * Every money field comes from `totals`, which came from priceCart, which
 * came from the fixtures. Nothing in `request` carries a price.
 */
export function buildOrder({
  store,
  totals,
  request,
  walletAddress = null,
  paymentProvider,
  number,
  now = new Date(),
}: {
  store: StoreData;
  totals: CartTotals;
  request: CheckoutRequest;
  /** The wallet that was signed in, when one was. Guests order too. */
  walletAddress?: string | null;
  paymentProvider: string;
  /** A number already checked against the store. Left out, one is made here. */
  number?: string;
  now?: Date;
}): Order {
  const timestamp = now.toISOString();

  const lines: OrderLine[] = totals.lines
    .filter(entry => !entry.problem)
    .map(entry => {
      const product = findProduct(store, entry.line.productSlug);
      const variant = product ? findVariant(product, entry.line.variantId) : null;
      return {
        productSlug: entry.line.productSlug,
        variantId: entry.line.variantId,
        title: entry.title,
        variantName: entry.variantName,
        quantity: entry.line.quantity,
        unitPrice: entry.unitPrice,
        lineTotal: entry.lineTotal,
        workId: entry.line.workId ?? null,
        // Copied onto the order rather than looked up later: what the buyer
        // bought should still read correctly after the artist edits the
        // product.
        podSku: variant?.podSku ?? null,
      };
    });

  return {
    id: newOrderId(),
    number: number ?? newOrderNumber('R', now),
    status: 'pending',
    createdAt: timestamp,
    updatedAt: timestamp,
    lines,
    subtotal: totals.subtotal,
    shipping: totals.shipping,
    total: totals.total,
    shippingMethodId: request.shippingMethodId,
    shippingAddress: request.shippingAddress,
    email: request.email,
    address: walletAddress,
    payment: { provider: paymentProvider, reference: null, status: 'unpaid' },
    fulfilment: null,
    note: request.note,
    internalNote: null,
  };
}

/**
 * A number no record already has.
 *
 * An order number is four hex characters on a year, which is 65,536 of them:
 * plenty to be unguessable, not so many that a studio taking a few hundred
 * orders a year can assume no two will ever collide. Buyers quote the number
 * and the guest lookup finds an order by it, so a duplicate is a real
 * problem rather than a tidy one. Asking the store first costs one read per
 * checkout and removes it.
 *
 * After a few tries it gives up and returns the last one rather than
 * blocking a sale: at that point something else is wrong, and the order
 * store is still keyed on its id.
 */
export async function uniqueNumber(make: () => string, taken: (value: string) => Promise<boolean>): Promise<string> {
  let candidate = make();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (!(await taken(candidate))) return candidate;
    candidate = make();
  }
  console.warn('[raisonne] could not find an unused order number in five tries');
  return candidate;
}

// ---------------------------------------------------------------------------
// Payment events
// ---------------------------------------------------------------------------

export interface PaymentOutcome {
  /** True when this install did something, or had already done it. */
  handled: boolean;
  /** For the webhook's log line and its answer body. */
  reason: string;
  order: Order | null;
}

/**
 * One event from the payment provider, applied once.
 *
 * Idempotency is structural rather than a table of seen event ids: the order
 * store refuses a status that cannot follow the current one, so the same
 * `checkout.session.completed` arriving three times moves the order once and
 * the other two are no-ops. A late `expired` cannot un-pay a paid order for
 * the same reason.
 */
export async function applyPaymentEvent(event: PaymentEvent): Promise<PaymentOutcome> {
  if (event.type === 'ignored') return { handled: false, reason: 'event ignored', order: null };

  // Every id the event names, tried in turn. A refund names a charge and a
  // payment intent and never the checkout session, so matching on one id
  // alone loses every refund made from the provider's dashboard.
  const references = event.references?.length ? event.references : event.reference ? [event.reference] : [];
  if (references.length === 0) return { handled: false, reason: 'event carried no reference', order: null };

  const store = getOrderStore();
  let order: Order | null = null;
  for (const reference of references) {
    order = await store.getByPaymentReference(reference);
    if (order) break;
  }

  // Still nothing is not an error and must not be answered with a failure,
  // or the provider will retry it every hour for three days.
  if (!order) return { handled: false, reason: 'no order for that reference', order: null };

  switch (event.type) {
    case 'paid': {
      if (order.payment.status === 'paid') return { handled: true, reason: 'already paid', order };
      if (!amountsAgree(order.total, event.amount)) {
        console.warn(
          `[raisonne] order ${order.number}: the provider reported ${event.amount?.amount ?? 'nothing'} ${event.amount?.currency ?? ''} against ${order.total.amount} ${order.total.currency}. Left unpaid for the artist to look at.`,
        );
        return { handled: false, reason: 'amount does not match the order', order };
      }
      // The intent is written down here because this is the only event that
      // carries both it and the session: a refund weeks later knows the
      // intent and nothing else, and this is what it will be found by.
      const intent = references.find(reference => reference !== order?.payment.reference) ?? order.payment.intent ?? null;
      const paid = await store.update(order.id, {
        status: 'paid',
        payment: { status: 'paid', intent, paidAt: new Date().toISOString() },
      });
      if (paid) await fulfilOrder(paid);
      return { handled: true, reason: 'marked paid', order: paid ?? order };
    }

    case 'failed': {
      const failed = await store.update(order.id, { status: 'failed', payment: { status: 'failed' } });
      return { handled: true, reason: 'marked failed', order: failed ?? order };
    }

    case 'expired': {
      if (order.status !== 'pending') return { handled: true, reason: 'not pending, left alone', order };
      const cancelled = await store.update(order.id, { status: 'cancelled' });
      return { handled: true, reason: 'checkout expired, order cancelled', order: cancelled ?? order };
    }

    case 'refunded': {
      const refunded = await store.update(order.id, { status: 'refunded', payment: { status: 'refunded' } });
      if (refunded) await notifyBuyer('refunded', refunded);
      return { handled: true, reason: 'marked refunded', order: refunded ?? order };
    }

    default:
      return { handled: false, reason: 'unknown event', order };
  }
}

// ---------------------------------------------------------------------------
// Fulfilment
// ---------------------------------------------------------------------------

export interface FulfilmentOutcome {
  /** Plain sentences for the artist's own view. Each one is something that happened. */
  notes: string[];
  order: Order;
}

/**
 * What this install does the moment an order is paid: tell the buyer, and
 * try the printer when there is one.
 *
 * Stock is not touched, and the note says so: the catalogue's products live
 * in a fixture the install reads, not a database it writes, so decrementing
 * a count here would be overwritten by the next `pnpm snapshot`. The artist
 * gets the figures to change instead.
 */
export async function fulfilOrder(order: Order): Promise<FulfilmentOutcome> {
  const notes: string[] = [];
  let current = order;

  const told = await notifyBuyer('paid', order);
  notes.push(noticeNote(told));

  const printed = order.lines.filter(line => line.podSku);
  if (printed.length > 0) {
    const provider = getPodProvider();
    if (!provider) {
      notes.push('This order has print-on-demand items and no provider is named, so the studio prints it.');
    } else {
      const result = await provider.dispatch(order);
      if (result.ok) {
        const updated = await getOrderStore().update(order.id, {
          status: 'in_production',
          fulfilment: { provider: provider.id, providerOrderId: result.providerOrderId },
        });
        if (updated) current = updated;
        notes.push(`Sent to ${provider.id}, their reference ${result.providerOrderId}.`);
      } else {
        notes.push(`${provider.id} was not called: ${result.detail}`);
      }
    }
  }

  const podNote = podStatusNote(current);
  if (podNote) notes.push(podNote);

  return { notes, order: current };
}

function noticeNote(result: NotifyResult): string {
  switch (result) {
    case 'sent':
      return 'The buyer was sent a confirmation.';
    case 'no-notifier':
      return 'No confirmation was sent: this install has no mail adapter registered. The message is on the order page, ready to send by hand.';
    case 'no-recipient':
      return 'No confirmation was sent: the order carries no email address.';
    default:
      return 'The confirmation could not be sent. The message is on the order page, ready to send by hand.';
  }
}

/** Tells the buyer about a change, when this install can. Never throws. */
export async function notifyBuyer(notice: OrderNotice, order: Order): Promise<NotifyResult> {
  return sendNotification(orderMessage(notice, order, getArtist().name));
}

export async function notifyCommission(commission: Commission): Promise<NotifyResult> {
  return sendNotification(commissionMessage(commission, getArtist().name));
}

// ---------------------------------------------------------------------------
// Stock
// ---------------------------------------------------------------------------

export interface StockChange {
  title: string;
  variantName: string;
  sku: string | null;
  sold: number;
  /** What the fixture says is left, before this order. Null when stock is not tracked. */
  recorded: number | null;
}

/**
 * What the artist should change in their own data now this order is paid.
 *
 * An install that keeps its products in a CMS changes them there and runs
 * `pnpm snapshot` again; one that edits the fixture edits the fixture. Either
 * way it is a decision, not something a webhook should do behind them.
 */
export function stockAdvisory(store: StoreData, order: Order): StockChange[] {
  return order.lines.map(line => {
    const product = findProduct(store, line.productSlug);
    const variant = product ? findVariant(product, line.variantId) : null;
    return {
      title: line.title,
      variantName: line.variantName,
      sku: variant?.sku ?? null,
      sold: line.quantity,
      recorded: typeof variant?.stock === 'number' ? variant.stock : null,
    };
  });
}
