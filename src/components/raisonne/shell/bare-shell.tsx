'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

/**
 * The routes that get no site chrome around them.
 *
 * A maintenance page says the catalogue is being updated; offering working
 * links to every section of that catalogue in the header and the footer
 * contradicts it. These routes keep the wordmark and the theme toggle and
 * nothing else.
 */
const BARE_ROUTES = ['/maintenance'];

export function isBareRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return BARE_ROUTES.includes(pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname);
}

/**
 * Renders its children everywhere except on a bare route. A named export
 * rather than a property on an object, because only a plain named export
 * crosses the client boundary as a component.
 */
export function HideOnBareRoute({ children }: { children: ReactNode }) {
  return isBareRoute(usePathname()) ? null : <>{children}</>;
}
