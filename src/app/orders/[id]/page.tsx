import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeftIcon } from 'lucide-react';

import { OrderDetail, type OwnerExtras } from '@/components/raisonne/orders/order-detail';
import { Container, PageHeader } from '@/components/raisonne/shell/page';
import { Button } from '@/components/ui/button';
import { getArtist, getStore } from '@/fixtures';
import { requireSession } from '@/lib/auth/guards';
import { isSameAddress } from '@/lib/chain/address';
import { NO_INDEX } from '@/lib/seo/metadata';
import { stockAdvisory } from '@/lib/store/fulfilment';
import { emailIsConfigured, emailStateNote, mailtoHref, orderMessage, type OrderNotice } from '@/lib/store/notify';
import { canTransition, getOrderStore } from '@/lib/store/orders';
import { podStatusNote } from '@/lib/store/pod';
import type { Order, OrderStatus } from '@/lib/types';

/**
 * One order.
 *
 * Signed in, and it is yours or you are the artist. Anything else answers
 * 404 rather than 403: a 403 on a random id confirms that the id exists,
 * which is how somebody works out how many orders a studio has taken.
 *
 * The artist gets the controls, the stock they now have to change, and the
 * message this install composed but has no way to send.
 */

export const metadata: Metadata = {
  title: 'Order',
  robots: NO_INDEX,
};

export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string }>;

const EVERY_STATUS: OrderStatus[] = [
  'pending',
  'paid',
  'in_production',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
  'failed',
];

/** The message the artist would send about this order, as it stands. */
function draftFor(order: Order): { label: string; href: string } | null {
  const notice: OrderNotice | null =
    order.status === 'shipped'
      ? 'shipped'
      : order.status === 'delivered'
        ? 'delivered'
        : order.status === 'cancelled'
          ? 'cancelled'
          : order.status === 'refunded'
            ? 'refunded'
            : order.payment.status === 'paid'
              ? 'paid'
              : null;
  if (!notice) return null;

  const message = orderMessage(notice, order, getArtist().name);
  if (!message) return null;
  return { label: `Write to ${message.to}`, href: mailtoHref(message) };
}

export default async function OrderPage({ params }: { params: Params }) {
  const { id } = await params;
  const session = await requireSession({ next: `/orders/${id}` });

  const order = await getOrderStore().get(id);
  const isOwner = session.role === 'owner';
  const mine = order?.address ? isSameAddress(order.address, session.address) : false;
  if (!order || (!isOwner && !mine)) notFound();

  const owner: OwnerExtras | undefined = isOwner
    ? {
        allowed: EVERY_STATUS.filter(status => status !== order.status && canTransition(order.status, status)),
        stock: order.payment.status === 'paid' ? stockAdvisory(getStore() ?? emptyStore(), order) : [],
        // With a mail adapter registered there is nothing to hand-send, so
        // the draft is only offered when there is not one.
        draft: emailIsConfigured() ? null : draftFor(order),
      }
    : undefined;

  return (
    <Container size="editorial" className="pb-16 md:pb-24">
      <PageHeader
        eyebrow={<span className="font-mono">{order.number}</span>}
        title={isOwner ? 'Order' : 'Your order'}
        actions={
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/orders" />}>
            <ArrowLeftIcon aria-hidden data-icon="inline-start" />
            All orders
          </Button>
        }
      />
      <OrderDetail
        order={order}
        isOwner={isOwner}
        owner={owner}
        podNote={podStatusNote(order)}
        emailNote={emailStateNote()}
      />
    </Container>
  );
}

/**
 * An install whose store data has gone missing still has to render the
 * orders it took. Nothing can be said about stock, so nothing is.
 */
function emptyStore() {
  return {
    currency: 'USD',
    products: [],
    phygitals: [],
    categories: [],
    collections: [],
    shippingMethods: [],
    podProviders: [],
  };
}
