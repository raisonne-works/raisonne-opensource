import 'server-only';

import { surfaceState } from '@/lib/config';
import type { SiteSettings } from '@/lib/types';

/**
 * Whether the shop can take money today.
 *
 * What is *missing* is deliberately not answered here any more. The variable
 * names are the installer's business and used to be printed on /shop, /cart
 * and /checkout for everyone; they are now served by /api/setup, which
 * answers the artist and a development server and nobody else. Every public
 * surface shows the same short sentence instead: see StoreSetupNotice.
 */
export function storeIsConfigured(settings: SiteSettings): boolean {
  return surfaceState(settings, 'store') === 'on';
}
