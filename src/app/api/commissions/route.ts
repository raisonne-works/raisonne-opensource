import { getSettings, getStore } from '@/fixtures';
import { getSessionAddress } from '@/lib/auth/guards';
import { checkLimit, retryAfter } from '@/lib/auth/rate-limit';
import { getHoldings } from '@/lib/chain/holdings';
import { isModuleEnabled } from '@/lib/records';
import { COMMISSION_HONEYPOT_FIELD, parseCommissionRequest } from '@/lib/store/commission-request';
import { notifyCommission, uniqueNumber } from '@/lib/store/fulfilment';
import { getOrderStore, newCommissionNumber, newOrderId } from '@/lib/store/orders';
import type { Commission } from '@/lib/types';

/**
 * POST /api/commissions  { kind, artefact?, brief, specs, references?, workIds?, budget?, deadline?, email, shippingAddress? }
 *
 * A brief for the artist. No money moves, nothing is reserved, and no
 * payment keys are needed: an install can take commission enquiries with
 * nothing configured but the module switch.
 *
 * The brief is written to the same store the orders live in, so the artist
 * has one place to look and one thing to back up. It holds an email address
 * and sometimes a postal address, which is personal data: it never reaches a
 * fixture, a snapshot or the public catalogue API.
 *
 * Five an hour per sender, counted on the wallet when there is one and the
 * email address otherwise. Per sender rather than per process: a brief is a
 * message to a person, nobody writes six in an hour, and one person who does
 * must not close the form for everybody else.
 */

export const dynamic = 'force-dynamic';

function refuse(error: string, status: number, extra: Record<string, unknown> = {}) {
  return Response.json({ error, ...extra }, { status });
}

/**
 * Whether the works this brief names are really in the sender's wallet.
 *
 * The form takes any workId anyone posts, and it has to: a visitor who is
 * not signed in still has to be able to say which piece they own. So the
 * claim is not refused, it is labelled, and the artist reads "this wallet
 * was signed in and does hold these" or "nobody checked" rather than an
 * unchecked sentence that looks like a fact.
 */
async function checkClaimedWorks(address: string | null, workIds: readonly string[]): Promise<'verified' | 'unverified' | null> {
  if (workIds.length === 0) return null;
  if (!address) return 'unverified';

  const result = await getHoldings(address);
  if (result.error || result.source === 'none') return 'unverified';

  const held = new Set(result.holdings.map(holding => holding.workId.toLowerCase()));
  return workIds.every(workId => held.has(workId.toLowerCase())) ? 'verified' : 'unverified';
}

export async function POST(request: Request) {
  if (!isModuleEnabled(getSettings(), 'commissions')) {
    return refuse('This site does not take commissions.', 404);
  }

  const store = getStore();
  const form = store?.commissionForm ?? null;
  if (!form || form.kinds.length === 0) {
    return refuse('This install has not set up a commission form. Write to the studio instead.', 404);
  }

  const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;

  const sender = (await getSessionAddress()) ?? (typeof body.email === 'string' ? body.email : null);
  const limit = checkLimit(request, 'commission', sender);
  if (!limit.ok) {
    return Response.json(
      { error: 'That is several briefs in an hour. Write to the studio directly instead.' },
      { status: 429, headers: { 'Retry-After': retryAfter(limit) } },
    );
  }

  const trap = body[COMMISSION_HONEYPOT_FIELD];
  if (typeof trap === 'string' && trap.trim() !== '') {
    // Answered the way a person is answered, with nothing written.
    return Response.json({ number: null, ok: true });
  }

  const parsed = parseCommissionRequest(body, { form, currency: store?.currency ?? 'USD' });
  if (!parsed.ok) return refuse(parsed.message, 400, { errors: parsed.errors });

  const orders = getOrderStore();
  const existing = await orders.listCommissions();
  const number = await uniqueNumber(
    () => newCommissionNumber(),
    async candidate => existing.some(entry => entry.number === candidate),
  );

  // Recorded when the visitor was signed in, so the artist can see which of
  // their collectors this is and the brief shows up on that collector's own
  // page.
  const signedIn = await getSessionAddress();

  const now = new Date().toISOString();
  const commission: Commission = {
    ...parsed.request,
    address: signedIn,
    id: newOrderId(),
    number,
    status: 'new',
    createdAt: now,
    updatedAt: now,
    quote: null,
    internalNote: null,
    workIdsChecked: await checkClaimedWorks(signedIn, parsed.request.workIds ?? []),
  };

  await orders.createCommission(commission);
  const told = await notifyCommission(commission);

  return Response.json({
    ok: true,
    number: commission.number,
    // The page says "keep this reference" rather than "check your email"
    // when nothing was sent.
    acknowledged: told === 'sent',
  });
}
