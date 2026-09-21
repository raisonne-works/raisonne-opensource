import 'server-only';

import { randomBytes } from 'node:crypto';

/**
 * The nonce a sign-in message carries.
 *
 * A wallet signature proves control of a key, not that the person is signing
 * in right now. Without a nonce the install issued, a signature captured
 * anywhere (a Discord bot, a phishing page, an old session log) could be
 * replayed here forever. So: the server issues a random nonce, the wallet
 * signs a message containing it, and the server destroys it the moment it is
 * used. One nonce, one sign-in, five minutes.
 *
 * The store is a map in this process, which is right for a one-artist
 * install on one box. A deployment behind more than one instance needs a
 * shared store: implement NonceStore against Redis or a table and pass it to
 * setNonceStore() at start up. The interface exists so that is a new file
 * rather than a change here.
 */

export interface NonceStore {
  /** Creates and remembers a nonce. */
  issue(): Promise<string>;
  /** True exactly once per nonce, and only before it expires. */
  consume(nonce: string): Promise<boolean>;
}

/** How long an unused nonce lives. Long enough to unlock a hardware wallet, short enough to be useless later. */
export const NONCE_TTL_SECONDS = 300;

/** The most nonces held at once. Beyond this the oldest are dropped, which only costs a retry. */
const MAX_NONCES = 5000;

/** EIP-4361 wants at least 8 alphanumeric characters. This gives 32. */
export function generateNonce(): string {
  return randomBytes(24).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').slice(0, 32);
}

function createMemoryNonceStore(): NonceStore {
  const issued = new Map<string, number>();

  function sweep(now: number): void {
    for (const [nonce, expiresAt] of issued) {
      if (expiresAt <= now) issued.delete(nonce);
    }
    while (issued.size > MAX_NONCES) {
      const oldest = issued.keys().next();
      if (oldest.done) break;
      issued.delete(oldest.value);
    }
  }

  return {
    async issue() {
      const now = Date.now();
      sweep(now);
      const nonce = generateNonce();
      issued.set(nonce, now + NONCE_TTL_SECONDS * 1000);
      return nonce;
    },
    async consume(nonce) {
      const now = Date.now();
      sweep(now);
      const expiresAt = issued.get(nonce);
      if (expiresAt === undefined) return false;
      // Deleted whether or not it had expired: a nonce is used once, full stop.
      issued.delete(nonce);
      return expiresAt > now;
    },
  };
}

let store: NonceStore = createMemoryNonceStore();

/** Swaps the store, for an install running more than one instance. Call it once, at start up. */
export function setNonceStore(next: NonceStore): void {
  store = next;
}

export function nonceStore(): NonceStore {
  return store;
}

/** Issues a nonce for a sign-in message. */
export function issueNonce(): Promise<string> {
  return store.issue();
}

/** True the first time this nonce is presented, false every time after. */
export function consumeNonce(nonce: string): Promise<boolean> {
  return typeof nonce === 'string' && nonce.length >= 8 ? store.consume(nonce) : Promise.resolve(false);
}
