import 'server-only';

import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { ordersDir, reportOrderStoreFailure } from '@/lib/config';
import type { Commission, Order, OrderStatus } from '@/lib/types';

/**
 * Where orders live.
 *
 * Raisonne has no database, and adding one to sell a handful of prints would
 * be the wrong trade for an artist self-hosting a catalogue. So the default
 * is a directory of JSON files, one per order, under RAISONNE_ORDERS_DIR
 * (`.data/orders`). It is honest about what it is: good for the volume an
 * artist's store sees, on one machine, with the directory on a disk that
 * survives a deploy.
 *
 * Everything above this file goes through the OrderStore interface, so
 * swapping in Postgres, SQLite or a hosted service is one new adapter and
 * one call to setOrderStore() at start up. Nothing else changes.
 *
 * An order holds a postal address and an email, which is personal data. It
 * is never written into the fixtures, never reaches the public catalogue API
 * and never appears in a snapshot.
 */

export interface OrderPatch {
  status?: OrderStatus;
  payment?: Partial<Order['payment']>;
  fulfilment?: Partial<NonNullable<Order['fulfilment']>>;
  internalNote?: string | null;
}

export interface OrderQuery {
  status?: OrderStatus;
  /** Newest first. */
  limit?: number;
}

export interface OrderStore {
  readonly id: string;
  /**
   * Whether this store can actually be written to right now. Null means yes;
   * a string is the sentence the setup panel prints. An adapter that cannot
   * fail may leave it out.
   */
  probe?(): Promise<string | null>;
  create(order: Order): Promise<Order>;
  get(id: string): Promise<Order | null>;
  getByNumber(number: string): Promise<Order | null>;
  /** The order a payment provider's session or intent id belongs to. */
  getByPaymentReference(reference: string): Promise<Order | null>;
  listForAddress(address: string): Promise<Order[]>;
  listForEmail(email: string): Promise<Order[]>;
  list(query?: OrderQuery): Promise<Order[]>;
  update(id: string, patch: OrderPatch): Promise<Order | null>;
  /** Commissions live beside orders: same store, same guarantees. */
  createCommission(commission: Commission): Promise<Commission>;
  getCommission(id: string): Promise<Commission | null>;
  listCommissions(query?: { limit?: number }): Promise<Commission[]>;
}

// ---------------------------------------------------------------------------
// Numbers and ids
// ---------------------------------------------------------------------------

export function newOrderId(): string {
  return randomUUID();
}

/**
 * "R-2026-4F2A". Short enough to read down a phone, unguessable enough that
 * knowing one order number tells you nothing about the next. Order pages are
 * behind the session anyway; this is the second lock, not the first.
 */
export function newOrderNumber(prefix = 'R', now = new Date()): string {
  const random = randomUUID().replace(/-/g, '').slice(0, 4).toUpperCase();
  return `${prefix}-${now.getUTCFullYear()}-${random}`;
}

export function newCommissionNumber(now = new Date()): string {
  return newOrderNumber('C', now);
}

/** Which status may follow which, so a webhook arriving late cannot un-ship an order. */
const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['paid', 'cancelled', 'failed'],
  paid: ['in_production', 'shipped', 'cancelled', 'refunded'],
  in_production: ['shipped', 'cancelled', 'refunded'],
  shipped: ['delivered', 'refunded'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
  failed: ['pending', 'cancelled'],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return from === to || (NEXT_STATUS[from]?.includes(to) ?? false);
}

// ---------------------------------------------------------------------------
// The JSON file adapter
// ---------------------------------------------------------------------------

function isOrder(value: unknown): value is Order {
  const order = value as Partial<Order> | null;
  return typeof order === 'object' && order !== null && typeof order.id === 'string' && Array.isArray(order.lines);
}

function isCommission(value: unknown): value is Commission {
  const commission = value as Partial<Commission> | null;
  return typeof commission === 'object' && commission !== null && typeof commission.id === 'string' && typeof commission.brief === 'string';
}

/**
 * One JSON file per record, written to a temporary name and renamed into
 * place, so a process that dies mid-write leaves the previous version
 * intact rather than half a file.
 */
export function createJsonOrderStore(directory = ordersDir()): OrderStore {
  const root = path.isAbsolute(directory) ? directory : path.join(process.cwd(), directory);
  const ordersPath = path.join(root, 'orders');
  const commissionsPath = path.join(root, 'commissions');

  async function writeJson(file: string, value: unknown): Promise<void> {
    await fs.mkdir(path.dirname(file), { recursive: true });
    const temporary = `${file}.${process.pid}.tmp`;
    await fs.writeFile(temporary, JSON.stringify(value, null, 2), 'utf8');
    await fs.rename(temporary, file);
  }

  async function readJson(file: string): Promise<unknown> {
    try {
      return JSON.parse(await fs.readFile(file, 'utf8')) as unknown;
    } catch {
      return null;
    }
  }

  async function readAll<T>(directoryPath: string, guard: (value: unknown) => value is T): Promise<T[]> {
    let names: string[];
    try {
      names = await fs.readdir(directoryPath);
    } catch {
      return [];
    }
    const records: T[] = [];
    for (const name of names) {
      if (!name.endsWith('.json')) continue;
      const value = await readJson(path.join(directoryPath, name));
      if (guard(value)) records.push(value);
    }
    return records;
  }

  function newestFirst<T extends { createdAt: string }>(records: T[]): T[] {
    return records.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }

  return {
    id: 'json-file',

    /**
     * A write-and-delete against the real directory.
     *
     * The default is a relative `.data/orders`, which works on a laptop and
     * fails on a read-only container filesystem. Without this the install
     * reports orders as "configured", `orders.create()` throws at the moment
     * of payment, and the buyer meets an unhandled 500 while the panel
     * written for exactly this case never renders.
     */
    async probe() {
      const file = path.join(root, `.probe.${process.pid}`);
      try {
        await fs.mkdir(root, { recursive: true });
        await fs.writeFile(file, 'ok', 'utf8');
        await fs.rm(file, { force: true });
        return null;
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'the directory could not be written to';
        return `Orders would be written to ${root}, and that failed: ${reason}`;
      }
    },

    async create(order) {
      await writeJson(path.join(ordersPath, `${order.id}.json`), order);
      return order;
    },

    async get(id) {
      const value = await readJson(path.join(ordersPath, `${sanitize(id)}.json`));
      return isOrder(value) ? value : null;
    },

    async getByNumber(number) {
      return (await readAll(ordersPath, isOrder)).find(order => order.number === number) ?? null;
    },

    async getByPaymentReference(reference) {
      if (!reference) return null;
      // Either id the provider might use for this payment: the session it
      // was created with, or the intent a refund names instead.
      return (
        (await readAll(ordersPath, isOrder)).find(
          order => order.payment.reference === reference || order.payment.intent === reference,
        ) ?? null
      );
    },

    async listForAddress(address) {
      const owner = address.toLowerCase();
      return newestFirst((await readAll(ordersPath, isOrder)).filter(order => order.address?.toLowerCase() === owner));
    },

    async listForEmail(email) {
      const target = email.trim().toLowerCase();
      return newestFirst((await readAll(ordersPath, isOrder)).filter(order => order.email?.toLowerCase() === target));
    },

    async list(query = {}) {
      const orders = newestFirst((await readAll(ordersPath, isOrder)).filter(order => !query.status || order.status === query.status));
      return query.limit ? orders.slice(0, query.limit) : orders;
    },

    async update(id, patch) {
      const file = path.join(ordersPath, `${sanitize(id)}.json`);
      const current = await readJson(file);
      if (!isOrder(current)) return null;

      // A status that cannot follow the current one is ignored rather than
      // applied: a webhook that arrives twice, or out of order, must not turn
      // a shipped order back into a paid one.
      const status = patch.status && canTransition(current.status, patch.status) ? patch.status : current.status;

      const next: Order = {
        ...current,
        status,
        updatedAt: new Date().toISOString(),
        payment: { ...current.payment, ...patch.payment },
        fulfilment: patch.fulfilment ? { ...(current.fulfilment ?? {}), ...patch.fulfilment } : current.fulfilment,
        internalNote: patch.internalNote === undefined ? current.internalNote : patch.internalNote,
      };
      await writeJson(file, next);
      return next;
    },

    async createCommission(commission) {
      await writeJson(path.join(commissionsPath, `${commission.id}.json`), commission);
      return commission;
    },

    async getCommission(id) {
      const value = await readJson(path.join(commissionsPath, `${sanitize(id)}.json`));
      return isCommission(value) ? value : null;
    },

    async listCommissions(query = {}) {
      const commissions = newestFirst(await readAll(commissionsPath, isCommission));
      return query.limit ? commissions.slice(0, query.limit) : commissions;
    },
  };
}

/** An id only ever goes into a filename after this: no slashes, no dots, no traversal. */
function sanitize(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
}

// ---------------------------------------------------------------------------
// The one the app uses
// ---------------------------------------------------------------------------

let store: OrderStore | null = null;

/** Swaps the adapter. Call it once at start up, before anything places an order. */
export function setOrderStore(next: OrderStore): void {
  store = next;
}

export function getOrderStore(): OrderStore {
  store ??= createJsonOrderStore();
  return store;
}

/**
 * Asks the store whether it can be written to, and records the answer where
 * featureStatus('orders') reads it.
 *
 * Cached, because it touches the disk and every store page would otherwise
 * ask on every render. A page that is about to take money should pass
 * `{ fresh: true }`.
 */
const PROBE_TTL_MS = 30_000;
let probedAt = 0;
let probing: Promise<string | null> | null = null;

export async function probeOrderStore({ fresh = false }: { fresh?: boolean } = {}): Promise<string | null> {
  const now = Date.now();
  if (!fresh && probing && now - probedAt < PROBE_TTL_MS) return probing;

  probedAt = now;
  probing = (async () => {
    const target = getOrderStore();
    const reason = target.probe ? await target.probe() : null;
    reportOrderStoreFailure(reason);
    return reason;
  })();
  return probing;
}
