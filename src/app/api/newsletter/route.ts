import { NextResponse } from 'next/server';

import { getSiteData } from '@/fixtures';
import { isModuleEnabled } from '@/lib/records';
import {
  EMAIL_MAX_LENGTH,
  NEWSLETTER_HONEYPOT_FIELD,
  isValidEmail,
  newsletterEndpoint,
  normalizeSource,
} from '@/lib/newsletter';

/**
 * POST /api/newsletter  { email, source?, company? }
 *
 * The single write in Wave 1. Raisonne keeps no list of its own: the address
 * is forwarded to RAISONNE_NEWSLETTER_URL, whatever the install already uses.
 *
 * Four rules:
 *
 *  - No endpoint, no route. It answers 503 and says so, and pages do not
 *    render the form at all (see newsletterEnabled). Nothing ever reports a
 *    success it did not have.
 *  - The honeypot is answered, not argued with. A submission carrying the
 *    hidden field gets the same 200 a person gets, and nothing is forwarded.
 *  - Five a minute per address seen by the server. Enough for a person who
 *    mistyped their address twice, not enough for a script.
 *  - A failure upstream is a failure here. 502, with the reason, so the form
 *    can tell the visitor the truth.
 */

export const dynamic = 'force-dynamic';

const RATE_LIMIT = { windowMs: 60_000, max: 5 };

/**
 * The whole-site ceiling, when there is no client address to count.
 *
 * It has to be far above the per-address limit, because without a trusted
 * proxy every caller would otherwise share the per-address budget and one
 * script could close the newsletter form for everybody.
 */
const CEILING = { windowMs: 60_000, max: 200 };

/** Per server process, cleared on restart. A speed bump, not a firewall. */
const hits = new Map<string, number[]>();

function rateLimited(key: string, max = RATE_LIMIT.max): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter(time => now - time < RATE_LIMIT.windowMs);
  recent.push(now);
  hits.set(key, recent);

  // Keep the map from growing without bound on a long-running server.
  if (hits.size > 5000) {
    for (const [other, times] of hits) {
      if (times.every(time => now - time >= RATE_LIMIT.windowMs)) hits.delete(other);
    }
  }

  return recent.length > max;
}

/**
 * Who is asking, for the rate limit.
 *
 * X-Forwarded-For is written by the client unless something trusted rewrites
 * it, so it is read only when RAISONNE_TRUSTED_PROXY says there is a proxy
 * that sets it. With no proxy declared there is no client address, and the
 * answer is null rather than one shared bucket: a bucket everybody shares is
 * not a rate limit, it is a switch one script can flip to close the form for
 * the whole site. The per-address bucket does the real work, and a much
 * larger ceiling catches a flood.
 */
function clientKey(request: Request): string | null {
  const trustProxy = /^(1|true)$/i.test(process.env.RAISONNE_TRUSTED_PROXY?.trim() ?? '');
  if (!trustProxy) return null;
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return `ip:${forwarded || request.headers.get('x-real-ip') || 'unknown'}`;
}

function error(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function POST(request: Request) {
  const { settings } = getSiteData();

  if (!isModuleEnabled(settings, 'newsletter')) {
    return error('The newsletter is switched off on this site.', 404);
  }

  const endpoint = newsletterEndpoint();
  if (!endpoint) {
    return error('No sign-up endpoint is configured, so nothing was stored. Set RAISONNE_NEWSLETTER_URL.', 503);
  }

  const body: unknown = await request.json().catch(() => null);
  const payload = (body ?? {}) as Record<string, unknown>;

  // A filled honeypot is a bot. It is told the same thing a person is told.
  const honeypot = payload[NEWSLETTER_HONEYPOT_FIELD];
  if (typeof honeypot === 'string' && honeypot.trim() !== '') {
    return NextResponse.json({ ok: true, message: 'Thank you, you are on the list.' });
  }

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  if (!isValidEmail(email)) {
    return error(
      email.length > EMAIL_MAX_LENGTH ? 'That address is too long.' : 'That does not look like an email address.',
      400,
    );
  }

  // Three buckets: the address itself, the client address when a proxy
  // gives us one, and a whole-site ceiling far above both, so rotating a
  // header cannot replay a sign-up and one caller cannot spend everybody
  // else's budget.
  const client = clientKey(request);
  if (rateLimited(`email:${email}`) || (client && rateLimited(client)) || rateLimited('all', CEILING.max)) {
    return error('Too many attempts. Try again in a minute.', 429);
  }

  const source = normalizeSource(payload.source);

  const upstream = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(source ? { email, source } : { email }),
    cache: 'no-store',
  }).catch(() => null);

  if (!upstream) {
    return error('The sign-up service could not be reached. Please try again later.', 502);
  }

  if (!upstream.ok) {
    // Pass the upstream's own words through when it sent any: a duplicate
    // address and a rejected domain need different things said to the visitor.
    const text = await upstream.text().catch(() => '');
    const message = upstreamMessage(text) ?? 'The sign-up service refused the address.';
    return NextResponse.json({ ok: false, message }, { status: upstream.status === 429 ? 429 : 502 });
  }

  return NextResponse.json({ ok: true, message: 'Thank you, you are on the list.' });
}

/** The first human-readable line an endpoint sent back, whatever shape it used. */
function upstreamMessage(text: string): string | null {
  if (!text) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed === 'string') return parsed.slice(0, 200);
    if (parsed && typeof parsed === 'object') {
      const record = parsed as Record<string, unknown>;
      const direct = record.message ?? record.error ?? record.detail;
      if (typeof direct === 'string' && direct.trim()) return direct.trim().slice(0, 200);
      const errors = record.errors;
      if (Array.isArray(errors) && errors.length) {
        const first = errors[0] as { message?: unknown };
        if (typeof first?.message === 'string' && first.message.trim()) return first.message.trim().slice(0, 200);
      }
    }
  } catch {
    // Not JSON. A short plain-text reason is still useful.
    const trimmed = text.trim();
    if (trimmed && trimmed.length <= 200 && !trimmed.startsWith('<')) return trimmed;
  }
  return null;
}
