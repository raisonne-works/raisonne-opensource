import 'server-only';

/**
 * A small in-memory cache with a time to live.
 *
 * Chain reads cost money and take a second; a collector reloading their
 * dashboard should not spend either. So a read is held for a short while
 * (RAISONNE_CHAIN_CACHE_SECONDS, five minutes by default) and two requests
 * that arrive together share one call rather than making two.
 *
 * It is deliberately a map in one process, not Redis: an install is one
 * artist on one box, and a cache that needs its own service would be one
 * more thing to run. On a serverless host each instance keeps its own, which
 * is fine: the worst case is a few more reads, never a wrong answer.
 *
 * Nothing personal goes in here. The keys are addresses and contracts, which
 * are public, and the values are what the chain already says.
 */

interface Entry<T> {
  value: T;
  expiresAt: number;
}

export interface TtlCache<T> {
  /** The cached value, or undefined when there is none or it has expired. */
  peek(key: string): T | undefined;
  /** Runs `load` unless a fresh value is already there, or already on its way. */
  fetch(key: string, load: () => Promise<T>): Promise<T>;
  set(key: string, value: T): void;
  delete(key: string): void;
  clear(): void;
  readonly size: number;
}

/**
 * `ttlSeconds` is how long a value stays fresh; `max` caps how many are kept
 * so a crawler asking about ten thousand addresses cannot grow the process
 * without limit. The oldest entry goes first.
 */
export function createTtlCache<T>(ttlSeconds: number, max = 500): TtlCache<T> {
  const entries = new Map<string, Entry<T>>();
  const inFlight = new Map<string, Promise<T>>();

  function evict(): void {
    while (entries.size > max) {
      const oldest = entries.keys().next();
      if (oldest.done) break;
      entries.delete(oldest.value);
    }
  }

  function peek(key: string): T | undefined {
    const hit = entries.get(key);
    if (!hit) return undefined;
    if (hit.expiresAt <= Date.now()) {
      entries.delete(key);
      return undefined;
    }
    // Touch, so a key in use is the last to be evicted.
    entries.delete(key);
    entries.set(key, hit);
    return hit.value;
  }

  function set(key: string, value: T): void {
    entries.delete(key);
    entries.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    evict();
  }

  return {
    peek,
    set,
    delete(key) {
      entries.delete(key);
      inFlight.delete(key);
    },
    clear() {
      entries.clear();
      inFlight.clear();
    },
    get size() {
      return entries.size;
    },
    async fetch(key, load) {
      const hit = peek(key);
      if (hit !== undefined) return hit;

      const pending = inFlight.get(key);
      if (pending) return pending;

      const promise = load()
        .then(value => {
          set(key, value);
          return value;
        })
        .finally(() => {
          inFlight.delete(key);
        });
      inFlight.set(key, promise);
      return promise;
    },
  };
}
