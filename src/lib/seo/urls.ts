import { DEFAULT_SETTINGS } from '@/lib/records';
import type { SiteSettings } from '@/lib/types';

/**
 * Where this install lives. Sitemap entries, canonical URLs, share cards and
 * structured data all have to be absolute, so every one of them starts here.
 *
 * Three sources, in order:
 *
 *  1. RAISONNE_SITE_URL. The deployment knows its own address, and it can
 *     differ from the data (a staging copy, a preview build), so the
 *     environment wins.
 *  2. settings.siteUrl in the fixture. This is what the artist wrote down and
 *     what ships with the data.
 *  3. http://localhost:PORT, so a fresh clone still renders.
 */

function clean(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    // The origin only: a path here would be prefixed onto every URL on the site.
    return url.origin;
  } catch {
    // A malformed address should not take the whole site down.
    return null;
  }
}

/** The origin without a trailing slash, e.g. "https://example.art". */
export function siteOrigin(settings?: SiteSettings | null): string {
  return (
    clean(process.env.RAISONNE_SITE_URL) ??
    clean(settings?.siteUrl) ??
    clean(DEFAULT_SETTINGS.siteUrl) ??
    `http://localhost:${process.env.PORT ?? 3000}`
  );
}

/** The base Next resolves relative metadata URLs against. */
export function metadataBase(settings?: SiteSettings | null): URL {
  return new URL(siteOrigin(settings));
}

/** An absolute URL for a site path. An address that is already absolute is returned as it is. */
export function absoluteUrl(pathOrUrl: string, settings?: SiteSettings | null): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(pathOrUrl)) return pathOrUrl;
  const origin = siteOrigin(settings);
  return `${origin}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

/** True when the install has no public address of its own yet, so nothing should be advertised. */
export function isLocalOrigin(settings?: SiteSettings | null): boolean {
  const { hostname } = new URL(siteOrigin(settings));
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}
