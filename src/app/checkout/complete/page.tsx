import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2Icon, ClockIcon, HelpCircleIcon, TriangleAlertIcon } from 'lucide-react';

import { ClearCart } from '@/components/raisonne/checkout/clear-cart';
import { SummaryLines, SummaryTotals, TAX_NOTE, linesFromOrder } from '@/components/raisonne/checkout/order-summary';
import { OrderStatusBadge, OrderTimeline } from '@/components/raisonne/orders/order-status';
import { Container, PageHeader } from '@/components/raisonne/shell/page';
import { SHOP_PATH } from '@/components/raisonne/store/lib';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Separator } from '@/components/ui/separator';
import { getSettings } from '@/fixtures';
import { surfaceState } from '@/lib/config';
import { NO_INDEX } from '@/lib/seo/metadata';
import { emailStateNote } from '@/lib/store/notify';
import { getOrderStore } from '@/lib/store/orders';
import { podStatusNote } from '@/lib/store/pod';
import type { Order } from '@/lib/types';

/**
 * Where the payment provider sends the buyer back to.
 *
 * The provider substitutes its own session id into the URL, and this page
 * reads the order back by it. That means it works for somebody who ordered
 * without signing in, and it means nothing personal travels in the address
 * bar: the id names a payment attempt, not a person.
 *
 * What it says depends on what this install actually knows. A payment the
 * webhook has already confirmed reads as paid; one it has not reads as
 * waiting, with the order number, rather than a thank-you this install
 * cannot yet stand behind.
 */

export const metadata: Metadata = {
  title: 'Order',
  robots: NO_INDEX,
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function CheckoutCompletePage({ searchParams }: { searchParams: SearchParams }) {
  if (surfaceState(getSettings(), 'store') === 'off') notFound();

  const params = await searchParams;
  const reference = first(params.session);
  const cancelled = first(params.cancelled) === '1';

  if (cancelled) {
    return (
      <Container size="text" className="pb-16 md:pb-24">
        <PageHeader title="The payment was not finished" />
        <Alert>
          <TriangleAlertIcon aria-hidden />
          <AlertTitle>Nothing has been charged</AlertTitle>
          <AlertDescription>Your basket is as you left it, so you can pick up where you stopped.</AlertDescription>
        </Alert>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button nativeButton={false} render={<Link href="/checkout" />}>
            Back to checkout
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href={SHOP_PATH} />}>
            Back to the shop
          </Button>
        </div>
      </Container>
    );
  }

  const order = reference ? await getOrderStore().getByPaymentReference(reference) : null;

  if (!order) {
    return (
      <Container size="text" className="pb-16 md:pb-24">
        <PageHeader title="Order" />
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HelpCircleIcon aria-hidden />
            </EmptyMedia>
            <EmptyTitle>This install has no record of that payment</EmptyTitle>
            <EmptyDescription>
              If you have just paid, nothing is lost: find the order with its number and the email address you used.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" nativeButton={false} render={<Link href="/orders" />}>
              Find an order
            </Button>
          </EmptyContent>
        </Empty>
      </Container>
    );
  }

  const paid = order.payment.status === 'paid';
  const failed = order.status === 'failed' || order.status === 'cancelled';

  return (
    <Container size="editorial" className="pb-16 md:pb-24">
      {/* The order exists, so the basket has done its job. */}
      <ClearCart />

      <PageHeader
        eyebrow={<span className="font-mono">{order.number}</span>}
        title={paid ? 'Thank you' : failed ? 'That payment did not go through' : 'Payment received, waiting on confirmation'}
        description={
          paid
            ? 'The studio has your order. Keep the number above: it is how the studio finds this order and how you find it again.'
            : failed
              ? 'Nothing has been charged. You can order again whenever you like.'
              : 'The payment provider has not confirmed it yet. This usually takes a few seconds.'
        }
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {paid ? (
            <Alert>
              <CheckCircle2Icon aria-hidden />
              <AlertTitle>Paid</AlertTitle>
              <AlertDescription>{emailStateNote()}</AlertDescription>
            </Alert>
          ) : failed ? null : (
            <Alert>
              <ClockIcon aria-hidden />
              <AlertTitle>Still waiting</AlertTitle>
              <AlertDescription>
                Reload this page in a moment. The order is already recorded under the number above, whatever happens
                next, so nothing is lost by closing this tab.
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-3">
                What was ordered
                <OrderStatusBadge status={order.status} />
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <SummaryLines lines={linesFromOrder(order)} />
              <Separator />
              <SummaryTotals subtotal={order.subtotal} shipping={order.shipping} total={order.total} note={TAX_NOTE} />
            </CardContent>
          </Card>

          <PodNote order={order} />
        </div>

        <aside className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>What happens now</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderTimeline order={order} />
            </CardContent>
          </Card>

          <div className="flex flex-col items-start gap-2">
            <Button variant="outline" nativeButton={false} render={<Link href="/orders" />}>
              Your orders
            </Button>
            <p className="text-xs text-pretty text-muted-foreground">
              Signed in with the wallet you ordered with, this order is already there. Otherwise look it up with the
              number and your email address.
            </p>
          </div>
        </aside>
      </div>
    </Container>
  );
}

function PodNote({ order }: { order: Order }) {
  const note = podStatusNote(order);
  if (!note) return null;
  return (
    <Alert>
      <ClockIcon aria-hidden />
      <AlertTitle>Printed to order</AlertTitle>
      <AlertDescription>{note}</AlertDescription>
    </Alert>
  );
}
