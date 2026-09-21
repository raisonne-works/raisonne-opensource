import { requireSessionJson } from '@/lib/auth/guards';
import { isSameAddress } from '@/lib/chain/address';
import { notifyBuyer } from '@/lib/store/fulfilment';
import type { OrderNotice } from '@/lib/store/notify';
import { forBuyer, isCancellableByBuyer } from '@/lib/store/order-view';
import { canTransition, getOrderStore, type OrderPatch } from '@/lib/store/orders';
import type { Order, OrderStatus } from '@/lib/types';

/**
 * GET  /api/orders/<id>    the order, to whoever it belongs to
 * PATCH /api/orders/<id>   the artist changes its status; the buyer calls
 *                          off an order nobody has been paid for
 *
 * Both are gated on the session, and the gate is ownership rather than a
 * path: an order belongs to the wallet that was signed in when it was
 * placed, and to the artist. Anyone else gets a 404, not a 403, because a
 * 403 confirms the order exists.
 *
 * On orkhan.art this endpoint changes status and sends the buyer an email
 * with no authentication at all. Here every write goes through
 * requireSessionJson, and every status change goes through canTransition, so
 * an order cannot go from delivered back to pending however many times the
 * request is sent.
 */

export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string }>;

const MAX_TEXT = 200;

function text(value: unknown, max = MAX_TEXT): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, max);
  return trimmed ? trimmed : null;
}

const STATUSES: OrderStatus[] = ['pending', 'paid', 'in_production', 'shipped', 'delivered', 'cancelled', 'refunded', 'failed'];

function asStatus(value: unknown): OrderStatus | null {
  return typeof value === 'string' && (STATUSES as string[]).includes(value) ? (value as OrderStatus) : null;
}

/** Which status changes are worth telling the buyer about. */
const NOTICES: Partial<Record<OrderStatus, OrderNotice>> = {
  paid: 'paid',
  shipped: 'shipped',
  delivered: 'delivered',
  cancelled: 'cancelled',
  refunded: 'refunded',
};

/** The order, when this session may see it. Null covers both "no such order" and "not yours". */
async function readable(id: string, address: string, isOwner: boolean): Promise<Order | null> {
  const order = await getOrderStore().get(id);
  if (!order) return null;
  if (isOwner) return order;
  return order.address && isSameAddress(order.address, address) ? order : null;
}

export async function GET(_request: Request, { params }: { params: Params }) {
  const check = await requireSessionJson();
  if (!check.ok) return check.response;

  const { id } = await params;
  const isOwner = check.session.role === 'owner';
  const order = await readable(id, check.session.address, isOwner);
  if (!order) return Response.json({ error: 'No such order.' }, { status: 404 });

  return Response.json({ order: isOwner ? order : forBuyer(order) }, { headers: { 'cache-control': 'no-store' } });
}

export async function PATCH(request: Request, { params }: { params: Params }) {
  const check = await requireSessionJson();
  if (!check.ok) return check.response;

  const { id } = await params;
  const isOwner = check.session.role === 'owner';
  const order = await readable(id, check.session.address, isOwner);
  if (!order) return Response.json({ error: 'No such order.' }, { status: 404 });

  const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const status = asStatus(body.status);

  // The buyer's one write: calling off an order that has not been paid for.
  // Anything past that is a refund, which is the artist's decision.
  if (!isOwner) {
    if (status !== 'cancelled' || !isCancellableByBuyer(order)) {
      return Response.json({ error: 'That is the studio’s to change. Write to them and they will sort it out.' }, { status: 403 });
    }
    const cancelled = await getOrderStore().update(order.id, { status: 'cancelled' });
    return Response.json({ order: cancelled ? forBuyer(cancelled) : forBuyer(order) });
  }

  if (status && !canTransition(order.status, status)) {
    return Response.json(
      { error: `An order that is ${order.status} cannot become ${status}.`, status: order.status },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();
  const patch: OrderPatch = {};
  if (status) patch.status = status;

  const trackingNumber = text(body.trackingNumber, 64);
  const carrier = text(body.carrier, 64);
  const rawUrl = text(body.trackingUrl, 500);
  const trackingUrl = rawUrl && /^https?:\/\/\S+$/i.test(rawUrl) ? rawUrl : null;
  if (rawUrl && !trackingUrl) {
    return Response.json({ error: 'A tracking link has to start with http or https.' }, { status: 400 });
  }

  if (trackingNumber || trackingUrl || carrier || status === 'shipped' || status === 'delivered') {
    patch.fulfilment = {
      ...(trackingNumber ? { trackingNumber } : {}),
      ...(trackingUrl ? { trackingUrl } : {}),
      ...(carrier ? { carrier } : {}),
      // Recorded once, the first time the artist says it left or arrived, so
      // a later edit to the tracking number does not move the date.
      ...(status === 'shipped' && !order.fulfilment?.shippedAt ? { shippedAt: now } : {}),
      ...(status === 'delivered' && !order.fulfilment?.deliveredAt ? { deliveredAt: now } : {}),
    };
  }

  if (body.internalNote !== undefined) patch.internalNote = text(body.internalNote, 2000);
  if (status === 'refunded') patch.payment = { status: 'refunded' };

  const updated = await getOrderStore().update(order.id, patch);
  if (!updated) return Response.json({ error: 'That order could not be written.' }, { status: 500 });

  // The buyer is told when this install has something to tell them with. It
  // reports what happened rather than assuming it worked.
  const notice = status ? NOTICES[status] : undefined;
  const told = notice && updated.status === status ? await notifyBuyer(notice, updated) : 'no-notifier';

  return Response.json({ order: updated, notified: told });
}
