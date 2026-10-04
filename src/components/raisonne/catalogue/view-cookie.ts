import { cookies } from 'next/headers';

import { getWornPack } from '@/lib/theme';

import { VIEW_COOKIE, type ViewId } from './lib';

/**
 * The view this visitor last chose, read on the server so their list renders
 * that way from the first paint. Only pages import this: it reaches for the
 * request's headers, which a component shared with the browser cannot do.
 *
 * A URL that names a view always wins over the remembered one.
 */
export async function storedView(): Promise<string | null> {
  try {
    const store = await cookies();
    return store.get(VIEW_COOKIE)?.value ?? null;
  } catch {
    // Rendered outside a request (a static page, a test): no preference.
    return null;
  }
}

/**
 * The view a worn pack opens a list in, when it names one. A pack says so in
 * its stylesheet, with the other switches the app reads from it:
 * --catalogue-default-view-index: table. Skin zero names none, so every list
 * keeps the default its page gives it.
 */
export function packDefaultView(list: string, views: ViewId[], fallback: ViewId): ViewId {
  const css = getWornPack()?.css;
  if (!css) return fallback;
  const named = new RegExp(`--catalogue-default-view-${list}\\s*:\\s*([a-z]+)`).exec(css)?.[1];
  return views.find(id => id === named) ?? fallback;
}
