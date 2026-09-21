import type { Metadata } from 'next';
import Link from 'next/link';
import { LogInIcon } from 'lucide-react';

import { SetupNotice } from '@/components/raisonne/checkout/setup-notice';
import { BuyerTable, CommissionList, OrderList } from '@/components/raisonne/orders/order-list';
import { OrderLookup } from '@/components/raisonne/orders/order-lookup';
import { Container, PageHeader, Section } from '@/components/raisonne/shell/page';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getSettings } from '@/fixtures';
import { getSession, signInHref } from '@/lib/auth/guards';
import { isSameAddress } from '@/lib/chain/address';
import { ENV_DOCS, featureStatus, isConfigured } from '@/lib/config';
import { isModuleEnabled } from '@/lib/records';
import { NO_INDEX } from '@/lib/seo/metadata';
import { buyersFromOrders } from '@/lib/store/order-view';
import { getOrderStore } from '@/lib/store/orders';
import type { Commission, Order } from '@/lib/types';

/**
 * A buyer's own orders, and the artist's view of everyone's.
 *
 * Who sees what is decided by the session and nothing else. A signed-in
 * collector sees the orders placed with their wallet; the artist sees them
 * all, plus the buyers those orders imply. Anybody else sees a form that
 * needs both an order number and the address it was placed with, because
 * either one alone should not open somebody's post.
 *
 * Never indexed, and never cached: this page is different for every visitor.
 */

export const metadata: Metadata = {
  title: 'Orders',
  robots: NO_INDEX,
};

export const dynamic = 'force-dynamic';

/** Where the empty state sends a collector whose order was placed as a guest. */
const GUEST_LOOKUP_ID = 'find-an-order';

/**
 * A collector's orders: the ones placed with this wallet, plus the ones
 * placed as a guest with an email address this wallet has ordered with.
 *
 * The second half is what makes "one place to look" true. Somebody who
 * bought a print before they ever connected a wallet, and then signed in and
 * bought another, should not have to keep the first order's number in a
 * drawer. The link between the two is an email address this wallet has
 * already proved it uses, so nothing is exposed that the wallet did not
 * already have: an address nobody ordered with from here matches nothing.
 */
async function ordersForCollector(address: string): Promise<Order[]> {
  const store = getOrderStore();
  const mine = await store.listForAddress(address);

  const emails = [...new Set(mine.map(order => order.email?.trim().toLowerCase()).filter((email): email is string => Boolean(email)))];
  if (emails.length === 0) return mine;

  const guest = (await Promise.all(emails.map(email => store.listForEmail(email)))).flat();

  const seen = new Set(mine.map(order => order.id));
  const merged = [...mine];
  for (const order of guest) {
    if (seen.has(order.id)) continue;
    seen.add(order.id);
    merged.push(order);
  }
  return merged.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export default async function OrdersPage() {
  const settings = getSettings();
  const session = await getSession();
  const accounts = isConfigured('accounts');
  const takesCommissions = isModuleEnabled(settings, 'commissions');

  if (!session) {
    return (
      <Container size="editorial" className="pb-16 md:pb-24">
        <PageHeader
          title="Orders"
          description="Sign in with the wallet you ordered with, or look an order up with its number."
        />

        {accounts ? (
          <Section title="Signed in" description="Everything ordered with that wallet, in one place.">
            <Button className="w-fit" nativeButton={false} render={<Link href={signInHref('/orders')} />}>
              <LogInIcon aria-hidden data-icon="inline-start" />
              Sign in with a wallet
            </Button>
          </Section>
        ) : (
          <Section title="Signing in is not set up on this install">
            <SetupNotice
              title="Sign-in is not configured"
              description="Orders can still be found with a number and an email address, below."
              statuses={[featureStatus('accounts')]}
              docs={ENV_DOCS}
            />
          </Section>
        )}

        <Section title="Ordered as a guest">
          <OrderLookup />
        </Section>
      </Container>
    );
  }

  const store = getOrderStore();
  const isOwner = session.role === 'owner';

  const [allOrders, allCommissions] = await Promise.all([
    isOwner ? store.list() : ordersForCollector(session.address),
    store.listCommissions(),
  ]);

  const commissions: Commission[] = isOwner
    ? allCommissions
    : allCommissions.filter(entry => entry.address && isSameAddress(entry.address, session.address));

  if (isOwner) return <OwnerView orders={allOrders} commissions={commissions} takesCommissions={takesCommissions} />;

  return (
    <Container size="editorial" className="pb-16 md:pb-24">
      {/* One heading for one list. "Your orders" over a section called
          "Orders" said the same thing twice and made the empty state read as
          though it belonged to neither. */}
      <PageHeader
        title="Your orders"
        description="Everything ordered with this wallet, and anything ordered as a guest with an email address this wallet has used. Anything else is found by its number, below."
      />

      <Section>
        <OrderList orders={allOrders} emptyAction={{ href: `#${GUEST_LOOKUP_ID}`, label: 'Find an order by number' }} />
      </Section>

      {takesCommissions ? (
        <Section title="Commissions" description="Briefs you have sent the studio, and where each one has got to.">
          <CommissionList commissions={commissions} emptyAction={{ href: '/commissions', label: 'What the studio takes on' }} />
        </Section>
      ) : null}

      <Section
        id={GUEST_LOOKUP_ID}
        title="Ordered without signing in?"
        description="Find it with the order number and the email address it was placed with."
      >
        <OrderLookup />
      </Section>
    </Container>
  );
}

/** Everything, for the one person who owns the install. */
function OwnerView({
  orders,
  commissions,
  takesCommissions,
}: {
  orders: Order[];
  commissions: Commission[];
  takesCommissions: boolean;
}) {
  const buyers = buyersFromOrders(orders);
  const open = orders.filter(order => order.status === 'paid' || order.status === 'in_production');

  return (
    <Container size="editorial" className="pb-16 md:pb-24">
      <PageHeader
        title="Orders"
        description={`${orders.length} in all, ${open.length} waiting to be made or sent.`}
      />

      <Tabs defaultValue="orders" className="w-full">
        <TabsList variant="line">
          <TabsTrigger value="orders">Orders</TabsTrigger>
          {takesCommissions ? <TabsTrigger value="commissions">Commissions</TabsTrigger> : null}
          <TabsTrigger value="buyers">Buyers</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="pt-6">
          <OrderList orders={orders} emptyNote="Nothing has been ordered yet." />
        </TabsContent>

        {takesCommissions ? (
          <TabsContent value="commissions" className="flex flex-col gap-4 pt-6">
            <p className="max-w-[48rem] text-sm text-pretty text-muted-foreground">
              Briefs sent to the studio. A commission is answered by writing back, so the address to reply to is here.
              This release records a brief and the status it was filed under; moving a commission along is not built
              yet.
            </p>
            <CommissionList commissions={commissions} showContact />
          </TabsContent>
        ) : null}

        <TabsContent value="buyers" className="flex flex-col gap-4 pt-6">
          <p className="max-w-[48rem] text-sm text-pretty text-muted-foreground">
            Worked out from the orders themselves. This install keeps no separate customer list: the only reason it
            holds an address is that somebody ordered something, and deleting the order deletes the record.
          </p>
          <BuyerTable buyers={buyers} />
        </TabsContent>
      </Tabs>
    </Container>
  );
}
