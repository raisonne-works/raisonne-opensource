import { notFound } from 'next/navigation';

import { requireSession } from '@/lib/auth/guards';
import { isSameAddress } from '@/lib/chain/address';
import { getOrderStore } from '@/lib/store/orders';

/**
 * Who may see one order, decided above the loading boundary.
 *
 * loading.tsx makes this segment a streamed shell, and the shell's 200 goes
 * out before the page runs, so a redirect() or notFound() inside the page
 * arrives too late to change the status. An unknown order id answered 200
 * with the not-found body inside the stream, which is a soft 404: a crawler
 * or a monitor is told the page exists. Decided here, a missing order is a
 * real 404 and a visitor with no session gets a real 307.
 *
 * The rule is the page's rule, unchanged: signed in, and the order is yours
 * or you are the artist. Anything else is 404 and never 403, because a 403
 * on a random id confirms that the id exists, which is how somebody counts
 * a studio's orders.
 *
 * This reads the order and so does the page. That is one small JSON read
 * twice on a page nobody loads in bulk, and it buys a correct status line.
 */
export default async function OrderLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession({ next: `/orders/${id}` });

  const order = await getOrderStore().get(id);
  const mine = order?.address ? isSameAddress(order.address, session.address) : false;
  if (!order || (session.role !== 'owner' && !mine)) notFound();

  return children;
}
