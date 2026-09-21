import 'server-only';

import { createHash } from 'node:crypto';

import { trustsProxyHeaders } from '@/lib/config';

/**
 * A fixed-window rate limit, in memory.
 *
 * Sign-in issues nonces and checks signatures, and checkout creates payment
 * sessions. Both are cheap for a visitor to ask for and not free for the
 * install to answer, so both are capped. This is the same shape the
 * newsletter route already uses, kept in one place now that more than one
 * route needs it.
 *
 * It counts in this process, which is right for one install on one box. It
 * is a speed bump, not a defence against a botnet: a host that needs more
 * should put a rate limit in front of the app, where one belongs.
 */

export interface RateLimit {
  /** True when the caller may proceed. */
  ok: boolean;
  /** How many are left in this window. */
  remaining: number;
  /** Unix milliseconds when the window resets. */
  resetAt: number;
}

interface Window {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Window>();
const MAX_BUCKETS = 10_000;

/**
 * Counts one hit against `key`. `limit` per `windowSeconds`.
 *
 * The key should name both the action and the client, e.g.
 * `signin:198.51.100.7`, so one limit cannot exhaust another.
 */
export function rateLimit(key: string, limit: number, windowSeconds: number, now = Date.now()): RateLimit {
  for (const [bucketKey, window] of buckets) {
    if (window.resetAt <= now) buckets.delete(bucketKey);
  }
  if (buckets.size > MAX_BUCKETS) buckets.clear();

  const window = buckets.get(key);
  if (!window || window.resetAt <= now) {
    const resetAt = now + windowSeconds * 1000;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt };
  }

  window.count += 1;
  return { ok: window.count <= limit, remaining: Math.max(0, limit - window.count), resetAt: window.resetAt };
}

/** Forgets a key, for a test or for an action that succeeded and should not be held against the caller. */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

/**
 * Who is asking.
 *
 * X-Forwarded-For is a header a client can write, so it is read only when
 * RAISONNE_TRUSTED_PROXY says a proxy this install controls sets it. Nearly
 * every real install is behind a proxy and should set it.
 *
 * What matters is what happens when it is not set. Returning one bucket per
 * action for the whole internet turns every limit into a site-wide kill
 * switch: twenty nonces a minute for everybody, ten checkouts per five
 * minutes for everybody. A drop with eleven buyers locks checkout for all of
 * them, and one looping script locks sign-in for the whole site,
 * permanently, for nothing. So when there is no client address to count, the
 * limit counts something the caller cannot trivially vary instead: the
 * wallet signing in, the cart being paid for, the session asking for a
 * re-sync. It is not per-visitor, but it is per-actor, and one actor can no
 * longer spend everybody else's budget.
 *
 * A global ceiling stays on top of that, an order of magnitude higher, so a
 * distributed flood still meets something.
 */

/** How much bigger the whole-site ceiling is than one caller's limit. */
export const CEILING_FACTOR = 25;

/** The client address, when the install has declared a proxy that sets one. */
function clientAddress(request: Request): string | null {
  if (!trustsProxyHeaders()) return null;
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const real = request.headers.get('x-real-ip')?.trim();
  return forwarded || real || null;
}

/**
 * The bucket one caller counts in.
 *
 * `identity` is whatever the route can name about the actor rather than the
 * connection: an address, a cart hash, a session. It is hashed, so a bucket
 * key never holds a wallet address or an email in clear.
 */
export function clientKey(request: Request, action: string, identity?: string | null): string {
  const address = clientAddress(request);
  if (address) return `${action}:ip:${address}`;
  const actor = identity?.trim().toLowerCase();
  if (actor) return `${action}:id:${createHash('sha256').update(actor).digest('base64url').slice(0, 16)}`;
  return `${action}:all`;
}

export interface LimitCheck extends RateLimit {
  /** The per-caller key, for resetRateLimit() after a success. */
  key: string;
}

/**
 * One hit against both the caller's bucket and the site-wide ceiling.
 *
 * Whichever refuses first is the answer, and the caller's own bucket is
 * checked first so a flood elsewhere does not report a nonsensical reason.
 */
export function checkLimit(
  request: Request,
  action: keyof typeof LIMITS,
  identity?: string | null,
  now = Date.now(),
): LimitCheck {
  const spec = LIMITS[action];
  const key = clientKey(request, action, identity);
  const mine = rateLimit(key, spec.limit, spec.windowSeconds, now);
  const ceiling = rateLimit(`${action}:ceiling`, spec.limit * CEILING_FACTOR, spec.windowSeconds, now);
  if (!mine.ok) return { ...mine, key };
  if (!ceiling.ok) return { ...ceiling, key };
  return { ...mine, key };
}

/** Seconds a refused caller should wait, for Retry-After. */
export function retryAfter(limit: RateLimit, now = Date.now()): string {
  return String(Math.max(1, Math.ceil((limit.resetAt - now) / 1000)));
}

/** The limits these waves use, in one place so they can be read at a glance. */
export const LIMITS = {
  /** Nonces are free to ask for and cost memory to keep. Counted per wallet. */
  nonce: { limit: 20, windowSeconds: 60 },
  /** A failed signature check is the expensive one. Counted per wallet. */
  signIn: { limit: 10, windowSeconds: 60 },
  /** Creating a payment session calls Stripe. Counted per cart. */
  checkout: { limit: 10, windowSeconds: 300 },
  /** A commission brief is an email to the artist. Counted per sender. */
  commission: { limit: 5, windowSeconds: 3600 },
  /** A collector pressing "re-sync my holdings" spends a chain read. Counted per wallet. */
  resync: { limit: 5, windowSeconds: 300 },
  /** Looking an order up by number. Counted per number asked about. */
  'order-lookup': { limit: 20, windowSeconds: 300 },
  /**
   * Applying a Raisonne app update. Counted per owner wallet. Three an hour is
   * plenty: each one is a git fetch + install, and a loop would thrash the box.
   */
  update: { limit: 3, windowSeconds: 3600 },
} as const;
