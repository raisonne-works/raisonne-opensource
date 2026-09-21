'use client';

import { useEffect } from 'react';

import { CART_STORAGE_KEY } from '@/lib/store/cart';

/**
 * Empties the basket once an order exists for it.
 *
 * Rendered only on the completion page, and only when this install has found
 * the order the payment belongs to. A cart cleared any earlier is a cart a
 * buyer loses by closing the payment page, which is the one moment they are
 * most likely to close it.
 *
 * The storage event is dispatched by hand because the browser only fires it
 * in *other* tabs. Anything on this page counting the basket, a header
 * badge for instance, is listening for it.
 */
export function ClearCart() {
  useEffect(() => {
    try {
      window.localStorage.removeItem(CART_STORAGE_KEY);
      window.dispatchEvent(new StorageEvent('storage', { key: CART_STORAGE_KEY, newValue: null }));
    } catch {
      // Blocked storage. There was nothing to clear.
    }
  }, []);

  return null;
}
