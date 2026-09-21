import 'server-only';

import { formatDate } from '@/components/raisonne/works/lib';
import { formatMoney } from '@/lib/money';
import type { Commission, Order } from '@/lib/types';

import { formatAddressLines } from './checkout';
import { ORDER_STATUS_COPY } from './order-view';

/**
 * Telling the buyer what happened.
 *
 * Raisonne does not send email. It has no mail provider, no API key for one,
 * and adding a required one would mean an install that cannot sell anything
 * until the artist has signed up to a service. So this file does the half it
 * honestly can: it writes the message.
 *
 * Every state that would send an email composes one here. With no notifier
 * registered, the artist's own order page shows the text and a link that
 * opens it in their mail app, already addressed. Nothing anywhere claims a
 * message was sent that was not.
 *
 * TODO(wave-3-email): register an adapter at start up with
 * setOrderNotifier(). The interface is one method. An SMTP adapter, a Resend
 * adapter or a Postmark adapter are each about thirty lines, and they need a
 * key, which is why none of them is the default.
 */

export type OrderNotice = 'received' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

export interface NotificationMessage {
  to: string;
  subject: string;
  body: string;
}

export interface OrderNotifier {
  readonly id: string;
  readonly configured: boolean;
  /** True when the message was accepted by whatever sends it. */
  send(message: NotificationMessage): Promise<boolean>;
}

let notifier: OrderNotifier | null = null;

/** Registers the adapter that actually sends. Call once at start up. */
export function setOrderNotifier(next: OrderNotifier | null): void {
  notifier = next;
}

/** The registered adapter, or null when this install sends nothing. */
export function getOrderNotifier(): OrderNotifier | null {
  return notifier?.configured ? notifier : null;
}

export function emailIsConfigured(): boolean {
  return getOrderNotifier() !== null;
}

/** The line an order page prints about messages, whichever state the install is in. */
export function emailStateNote(): string {
  return emailIsConfigured()
    ? 'The studio sends a message at each step.'
    : 'This install does not send email. Keep your order number: it is how the studio finds this order.';
}

// ---------------------------------------------------------------------------
// The messages
// ---------------------------------------------------------------------------

function lines(...parts: (string | null | undefined)[]): string {
  return parts.filter(part => part !== null && part !== undefined).join('\n');
}

function orderLines(order: Order): string {
  return order.lines
    .map(line => `  ${line.quantity} x ${line.title}${line.variantName ? ` (${line.variantName})` : ''}  ${formatMoney(line.lineTotal) ?? ''}`)
    .join('\n');
}

/**
 * What to say about one order at one moment, or null when there is nobody to
 * say it to.
 *
 * Written as plain text with no marketing around it, because the artist may
 * well end up sending it by hand.
 */
export function orderMessage(notice: OrderNotice, order: Order, artistName: string): NotificationMessage | null {
  if (!order.email) return null;

  const total = formatMoney(order.total) ?? '';
  const heading = `${artistName}: order ${order.number}`;
  const tracking = order.fulfilment?.trackingNumber
    ? lines('', `Tracking: ${order.fulfilment.trackingNumber}`, order.fulfilment.trackingUrl ?? null)
    : '';

  const subjects: Record<OrderNotice, string> = {
    received: `${heading} received`,
    paid: `${heading} confirmed`,
    shipped: `${heading} is on its way`,
    delivered: `${heading} was delivered`,
    cancelled: `${heading} cancelled`,
    refunded: `${heading} refunded`,
  };

  const openings: Record<OrderNotice, string> = {
    received: 'Thank you. Your order has been placed and is waiting on payment.',
    paid: 'Thank you. Your payment went through and the studio has your order.',
    shipped: 'Your order has left the studio.',
    delivered: 'Your order was recorded as delivered.',
    cancelled: 'Your order has been cancelled. Nothing will be made or sent.',
    refunded: 'Your payment has been returned.',
  };

  const body = lines(
    openings[notice],
    '',
    `Order ${order.number}, placed ${formatDate(order.createdAt) ?? order.createdAt}`,
    orderLines(order),
    '',
    `Shipping: ${formatMoney(order.shipping) ?? ''}`,
    `Total: ${total}`,
    order.shippingAddress ? lines('', 'Going to:', ...formatAddressLines(order.shippingAddress).map(line => `  ${line}`)) : null,
    tracking || null,
    '',
    ORDER_STATUS_COPY[order.status].detail,
    '',
    artistName,
  );

  return { to: order.email, subject: subjects[notice], body };
}

/** The same, for a commission brief the studio has just received. */
export function commissionMessage(commission: Commission, artistName: string): NotificationMessage | null {
  if (!commission.email) return null;
  return {
    to: commission.email,
    subject: `${artistName}: commission ${commission.number}`,
    body: lines(
      'Thank you. Your brief is with the studio.',
      '',
      `Reference ${commission.number}`,
      commission.artefact ? `Kind: ${commission.artefact}` : null,
      '',
      'Nothing has been charged and nothing is agreed yet. The studio will read the brief and write back.',
      '',
      artistName,
    ),
  };
}

// ---------------------------------------------------------------------------
// Sending, when there is anything to send with
// ---------------------------------------------------------------------------

export type NotifyResult = 'sent' | 'no-notifier' | 'no-recipient' | 'failed';

/**
 * Sends a composed message, if this install can. It never throws: a mail
 * server being down is not a reason to fail a webhook and have the payment
 * provider retry the whole order.
 */
export async function sendNotification(message: NotificationMessage | null): Promise<NotifyResult> {
  if (!message) return 'no-recipient';
  const adapter = getOrderNotifier();
  if (!adapter) return 'no-notifier';
  try {
    return (await adapter.send(message)) ? 'sent' : 'failed';
  } catch (error) {
    console.warn(`[raisonne] the order notifier refused a message: ${error instanceof Error ? error.message : 'unknown'}`);
    return 'failed';
  }
}

/** A mailto: link for a message the artist sends by hand. */
export function mailtoHref(message: NotificationMessage): string {
  const params = new URLSearchParams({ subject: message.subject, body: message.body });
  return `mailto:${encodeURIComponent(message.to)}?${params.toString()}`;
}
