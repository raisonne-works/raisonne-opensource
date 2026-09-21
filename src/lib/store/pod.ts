import 'server-only';

import { podApiKey, podProviderId } from '@/lib/config';
import type { Order, PodProvider } from '@/lib/types';

/**
 * Print on demand.
 *
 * The flow and the pages are built: a product can be marked `fulfilment:
 * 'pod'`, an order records which provider it went to, and the order page has
 * somewhere to put a tracking number. The call to Prodigi, Printful or
 * Gelato is NOT built, and pretending otherwise would be worse than saying
 * so: an install would take money for a print nobody had told a printer
 * about.
 *
 * So this file is a stub with an honest shape. `dispatch` refuses, the order
 * stays in production, and the artist fulfils it by hand until an adapter
 * lands.
 *
 * TODO(wave-3-pod): implement one adapter per provider.
 *   - Prodigi:  POST https://api.prodigi.com/v4.0/Orders, header X-API-Key.
 *   - Printful: POST https://api.printful.com/orders, bearer token.
 *   - Gelato:   POST https://order.gelatoapis.com/v4/orders, header X-API-KEY.
 * Each needs: a product mapping (ProductVariant.podSku to the provider's own
 * sku), an idempotency key per order, and a signed webhook for shipment
 * updates. Do not accept a provider webhook without verifying its signature:
 * the endpoint that marks an order shipped is the one worth forging.
 */

export type PodDispatchResult =
  | { ok: true; providerOrderId: string }
  | { ok: false; reason: 'not-configured' | 'not-implemented' | 'no-mapping' | 'upstream'; detail: string };

export interface PodFulfilmentProvider {
  readonly id: string;
  readonly configured: boolean;
  /** Sends an order to the printer. */
  dispatch(order: Order): Promise<PodDispatchResult>;
  /** Reads a shipment update. Returns null when the signature does not check out. */
  readWebhook(rawBody: string, signature: string | null): { providerOrderId: string; status: string; trackingNumber: string | null; trackingUrl: string | null } | null;
}

/** The providers this theme knows the names of. None of them is implemented yet. */
export const KNOWN_POD_PROVIDERS: PodProvider[] = [
  { id: 'prodigi', name: 'Prodigi', apiBaseUrl: 'https://api.prodigi.com/v4.0', enabled: false, priority: 1 },
  { id: 'printful', name: 'Printful', apiBaseUrl: 'https://api.printful.com', enabled: false, priority: 2 },
  { id: 'gelato', name: 'Gelato', apiBaseUrl: 'https://order.gelatoapis.com/v4', enabled: false, priority: 3 },
];

/**
 * A provider that refuses, clearly. It exists so the ordering flow can be
 * built and tested end to end: an order is placed, paid and left in
 * production with a note saying dispatch is not wired up.
 */
function createStubProvider(id: string): PodFulfilmentProvider {
  return {
    id,
    configured: podApiKey() !== null,
    async dispatch() {
      return {
        ok: false,
        reason: 'not-implemented',
        detail: `Dispatch to ${id} is not implemented in this release. The order stays in production for the artist to fulfil by hand.`,
      };
    },
    readWebhook() {
      return null;
    },
  };
}

let provider: PodFulfilmentProvider | null = null;

export function setPodProvider(next: PodFulfilmentProvider): void {
  provider = next;
}

/** The configured provider, or null when the install has not named one. */
export function getPodProvider(): PodFulfilmentProvider | null {
  if (provider) return provider;
  const id = podProviderId();
  if (!id) return null;
  provider = createStubProvider(id);
  return provider;
}

/**
 * What an order page should say about fulfilment. Every branch is a real
 * state; none of them claims a print is on its way when it is not.
 */
export function podStatusNote(order: Order): string | null {
  const needsPrinting = order.lines.some(line => line.podSku);
  if (!needsPrinting) return null;
  const configured = getPodProvider()?.configured ?? false;
  if (!configured) return 'This order is printed to order. The artist sends it to the printer by hand.';
  return 'This order is printed to order. Provider dispatch is not implemented yet, so the artist sends it by hand.';
}
