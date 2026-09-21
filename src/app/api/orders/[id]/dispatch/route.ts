import { requireOwnerJson } from '@/lib/auth/guards';
import { featureStatus } from '@/lib/config';
import { fulfilOrder } from '@/lib/store/fulfilment';
import { getOrderStore } from '@/lib/store/orders';
import { getPodProvider } from '@/lib/store/pod';

/**
 * POST /api/orders/<id>/dispatch
 *
 * The artist asking this install to fulfil an order: send it to the printer
 * if it is printed to order, and tell the buyer.
 *
 * This is the endpoint orkhan.art has with no authentication, no paid check
 * and no idempotency, reachable from the public internet. Here:
 *
 *  - requireOwnerJson: only an address on the install's owner allow-list.
 *  - An order that has not been paid for is refused. Fulfilling an unpaid
 *    order is how a studio gives work away to somebody who abandoned a
 *    checkout.
 *  - Running it twice is safe: the print provider is called with the order
 *    id as its idempotency key when an adapter exists, and the order store
 *    refuses a status that cannot follow the current one.
 *
 * Provider dispatch itself is a stub in this release (see
 * src/lib/store/pod.ts). The answer says so rather than reporting a success.
 */

export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string }>;

export async function POST(_request: Request, { params }: { params: Params }) {
  const check = await requireOwnerJson();
  if (!check.ok) return check.response;

  const { id } = await params;
  const order = await getOrderStore().get(id);
  if (!order) return Response.json({ error: 'No such order.' }, { status: 404 });

  if (order.payment.status !== 'paid') {
    return Response.json({ error: 'That order has not been paid for.', status: order.status }, { status: 409 });
  }

  const outcome = await fulfilOrder(order);
  const provider = getPodProvider();

  return Response.json({
    order: outcome.order,
    notes: outcome.notes,
    pod: {
      provider: provider?.id ?? null,
      configured: provider?.configured ?? false,
      missing: featureStatus('pod').missing,
      implemented: false,
    },
  });
}
