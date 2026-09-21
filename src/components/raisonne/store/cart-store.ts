'use client';

import { useSyncExternalStore } from 'react';

import {
  CART_STORAGE_KEY,
  addLine,
  cartCount,
  parseCart,
  removeLine,
  serializeCart,
  setQuantity,
} from '@/lib/store/cart';
import type { CartLine } from '@/lib/types';

/**
 * The cart in the browser: slugs, variant ids and quantities, and nothing
 * else. No price, no title, no image, because none of those are the
 * browser's to decide. The server prices a cart from the install's own
 * fixtures every time one is shown (see /api/store/cart), so a cart edited
 * in the developer tools can ask for a different product but never for a
 * different price.
 *
 * It is one module-level store read through useSyncExternalStore rather than
 * a context, for two reasons: the header's button, the panel, a product page
 * and the cart page all show the same count without a provider anywhere in
 * the tree, and nothing has to be added to the root layout for the cart to
 * work on a route that has one.
 *
 * Local storage is per browser and can throw (private windows, blocked site
 * data), so every read and write is guarded and an unreadable store simply
 * means an empty cart rather than a broken page.
 */

/** A stable empty array: a new [] on every read would loop useSyncExternalStore. */
const EMPTY: CartLine[] = [];

let lines: CartLine[] = EMPTY;
let loaded = false;
let panelOpen = false;

/**
 * Which shipping method the visitor picked, for this visit only. It is not
 * persisted on purpose: what a basket can be sent by depends on the address,
 * which checkout asks for, so remembering a choice made without one would be
 * a promise the next page cannot keep.
 */
let shippingMethodId: string | null = null;

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function readStored(): CartLine[] {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const stored = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) return EMPTY;
    const parsed = parseCart(stored);
    return parsed.length ? parsed : EMPTY;
  } catch {
    // A private window, or site data the visitor blocked. An empty cart is
    // the honest answer, and the shop keeps working.
    return EMPTY;
  }
}

function writeStored(): void {
  if (typeof window === 'undefined') return;
  try {
    if (lines.length === 0) window.localStorage.removeItem(CART_STORAGE_KEY);
    else window.localStorage.setItem(CART_STORAGE_KEY, serializeCart(lines));
  } catch {
    // Nothing to tell the visitor: the cart still works for this page view.
  }
}

function load(): void {
  if (loaded) return;
  lines = readStored();
  loaded = true;
}

/**
 * Read local storage again and tell everyone if it has moved.
 *
 * Something other than this module writes the same key: checkout empties the
 * basket when an order is placed, and another tab can change it at any time.
 * A storage event covers the other tab, and this covers the rest, so the
 * count in the header is never left describing a basket that is gone.
 */
export function syncCart(): void {
  if (typeof window === 'undefined') return;
  const next = readStored();
  loaded = true;
  if (serializeCart(next) === serializeCart(lines)) return;
  lines = next;
  emit();
}

function onStorage(event: StorageEvent): void {
  if (event.key !== null && event.key !== CART_STORAGE_KEY) return;
  syncCart();
}

function onVisible(): void {
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
  syncCart();
}

function subscribe(listener: () => void): () => void {
  load();
  if (listeners.size === 0 && typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== 'undefined') {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
    }
  };
}

function commit(next: CartLine[]): void {
  lines = next.length ? next : EMPTY;
  writeStored();
  emit();
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

function getLines(): CartLine[] {
  return lines;
}

function getServerLines(): CartLine[] {
  return EMPTY;
}

function getLoaded(): boolean {
  return loaded;
}

function getServerLoaded(): boolean {
  return false;
}

function getPanelOpen(): boolean {
  return panelOpen;
}

function getServerPanelOpen(): boolean {
  return false;
}

function getShipping(): string | null {
  return shippingMethodId;
}

function getServerShipping(): string | null {
  return null;
}

/**
 * The cart, and whether it has been read yet.
 *
 * `ready` is false on the server and on the first client render, so anything
 * that would differ between them (a count, an empty state) waits one paint
 * rather than mismatching the HTML.
 */
export function useCart(): { lines: CartLine[]; count: number; ready: boolean } {
  const current = useSyncExternalStore(subscribe, getLines, getServerLines);
  const ready = useSyncExternalStore(subscribe, getLoaded, getServerLoaded);
  return { lines: current, count: cartCount(current), ready };
}

/** Whether the slide-in cart is open. */
export function useCartPanel(): { open: boolean; setOpen: (open: boolean) => void } {
  const open = useSyncExternalStore(subscribe, getPanelOpen, getServerPanelOpen);
  return { open, setOpen: setCartOpen };
}

/** The shipping method the panel and the cart page share within a visit. */
export function useShippingChoice(): { shippingMethodId: string | null; setShippingMethodId: (id: string | null) => void } {
  const current = useSyncExternalStore(subscribe, getShipping, getServerShipping);
  return { shippingMethodId: current, setShippingMethodId: setShippingChoice };
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

export function addToCart(line: CartLine): void {
  load();
  commit(addLine(lines, line));
}

export function setCartQuantity(line: Pick<CartLine, 'productSlug' | 'variantId' | 'workId'>, quantity: number): void {
  load();
  commit(setQuantity(lines, line, quantity));
}

export function removeFromCart(line: Pick<CartLine, 'productSlug' | 'variantId' | 'workId'>): void {
  load();
  commit(removeLine(lines, line));
}

export function clearCart(): void {
  load();
  commit([]);
}

export function setShippingChoice(id: string | null): void {
  if (shippingMethodId === id) return;
  shippingMethodId = id;
  emit();
}

export function setCartOpen(open: boolean): void {
  if (panelOpen === open) return;
  panelOpen = open;
  emit();
}

export function openCart(): void {
  setCartOpen(true);
}
