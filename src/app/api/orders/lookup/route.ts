import { checkLimit, retryAfter } from '@/lib/auth/rate-limit';
import { isValidEmail } from '@/lib/store/checkout';
import { forBuyer } from '@/lib/store/order-view';
import { getOrderStore } from '@/lib/store/orders';

/**
 * POST /api/orders/lookup  { number, email }
 *
 * How somebody who ordered without signing in finds their order again.
 *
 * Two facts are needed, not one. orkhan.art looks an order up by email
 * alone, which means knowing somebody's address is enough to read what they
 * bought and where they live; here the order number has to match as well,
 * and the number is random rather than sequential, so holding one tells you
 * nothing about the next.
 *
 * The refusal is the same sentence whether the number is unknown or the
 * address does not match it, so this endpoint cannot be used to find out
 * which order numbers exist.
 *
 * It is a POST because an email address has no business in a URL, a query
 * string or a server log.
 */

export const dynamic = 'force-dynamic';

const NOT_FOUND = 'No order matches that number and email address.';

export async function POST(request: Request) {
  const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const number = typeof body.number === 'string' ? body.number.trim().toUpperCase().slice(0, 32) : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 254) : '';

  // Counted per email address asked about, so one person hammering the form
  // cannot stop everybody else finding their order. Guessing is not the
  // threat here anyway: a caller needs the random order number and the
  // address it was placed with, together.
  const limit = checkLimit(request, 'order-lookup', email || null);
  if (!limit.ok) {
    return Response.json(
      { error: 'Too many attempts. Try again in a few minutes.' },
      { status: 429, headers: { 'Retry-After': retryAfter(limit) } },
    );
  }

  if (!number || !isValidEmail(email)) {
    return Response.json({ error: 'Enter both the order number and the email address it was placed with.' }, { status: 400 });
  }

  const order = await getOrderStore().getByNumber(number);
  if (!order || order.email?.trim().toLowerCase() !== email) {
    return Response.json({ error: NOT_FOUND }, { status: 404 });
  }

  return Response.json({ order: forBuyer(order) }, { headers: { 'cache-control': 'no-store' } });
}
