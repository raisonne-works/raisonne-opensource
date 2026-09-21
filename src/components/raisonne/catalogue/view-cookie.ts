import { cookies } from 'next/headers';

import { VIEW_COOKIE } from './lib';

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
