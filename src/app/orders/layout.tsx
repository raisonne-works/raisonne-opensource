import { notFound } from 'next/navigation';

import { getSettings } from '@/fixtures';
import { surfaceState } from '@/lib/config';
import { isModuleEnabled } from '@/lib/records';

/**
 * Orders exist when this install sells something or takes commissions. With
 * neither switched on there is nothing an order could be, so the route is
 * not there at all.
 *
 * The gate is held above the loading boundary so a 404 is a real 404.
 *
 * There is no loading.tsx beside this file, on purpose. A loading.tsx here
 * would open a streamed shell over the whole of /orders, including
 * /orders/<id>, and the shell's 200 goes out before that route's own gate
 * runs, which turned an unknown order id into a soft 404 and a signed-out
 * visitor into a 200 carrying a redirect. The list's skeleton lives in the
 * (list) group with the list, so the boundary covers the list alone and
 * /orders/<id> keeps a real status line. Anything added here that needs a
 * loading state should go in a route group for the same reason.
 */
export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  const settings = getSettings();
  const sells = surfaceState(settings, 'store') !== 'off';
  const commissions = isModuleEnabled(settings, 'commissions');
  if (!sells && !commissions) notFound();
  return children;
}
