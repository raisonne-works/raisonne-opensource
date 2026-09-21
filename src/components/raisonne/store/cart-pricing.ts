'use client';

import { useCallback, useEffect, useState } from 'react';

import { serializeCart } from '@/lib/store/cart';
import type { CartLine } from '@/lib/types';

import { type CartPricing, requestCartPricing } from './cart-api';

export type CartPricingStatus = 'empty' | 'loading' | 'ready' | 'error';

export interface CartPricingState {
  pricing: CartPricing | null;
  status: CartPricingStatus;
  message: string | null;
  retry: () => void;
}

/** What came back, and what it was an answer to. */
interface Answer {
  key: string;
  shipping: string | null;
  attempt: number;
  pricing: CartPricing | null;
  message: string | null;
}

/**
 * What the cart is worth, according to the server.
 *
 * The browser never adds anything up. Whenever the lines or the chosen
 * shipping method change, the cart is posted to /api/store/cart and the
 * answer is what the panel and the cart page print.
 *
 * Whether the figures on screen are current is worked out while rendering,
 * by comparing the answer against the question, rather than by setting a
 * flag from inside the effect. So while a new answer is on its way the last
 * one stays visible, marked as updating, and the effect itself only ever
 * sets state from the response.
 *
 * A request that fails leaves no total at all: a cart that cannot be priced
 * says so and offers to try again, because a figure worked out locally would
 * be a figure nobody can stand behind.
 */
export function useCartPricing(lines: CartLine[], shippingMethodId: string | null): CartPricingState {
  const key = serializeCart(lines);
  const empty = lines.length === 0;

  const [attempt, setAttempt] = useState(0);
  const [answer, setAnswer] = useState<Answer | null>(null);

  const retry = useCallback(() => setAttempt(value => value + 1), []);

  useEffect(() => {
    if (empty) return;

    const controller = new AbortController();
    const parsed = JSON.parse(key) as CartLine[];

    void requestCartPricing({ lines: parsed, shippingMethodId }, controller.signal).then(result => {
      if (controller.signal.aborted) return;
      setAnswer({
        key,
        shipping: shippingMethodId,
        attempt,
        pricing: result.ok ? result.pricing : null,
        message: result.ok ? null : result.message,
      });
    });

    return () => controller.abort();
  }, [key, shippingMethodId, attempt, empty]);

  if (empty) return { pricing: null, status: 'empty', message: null, retry };

  const current =
    answer !== null && answer.key === key && answer.shipping === shippingMethodId && answer.attempt === attempt;

  if (!current) {
    // An older answer is better than a spinner over numbers that are about
    // to come back almost the same: it is shown, and marked as updating.
    return { pricing: answer?.pricing ?? null, status: 'loading', message: null, retry };
  }

  if (!answer.pricing) return { pricing: null, status: 'error', message: answer.message, retry };
  return { pricing: answer.pricing, status: 'ready', message: null, retry };
}
