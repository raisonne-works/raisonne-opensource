/**
 * Social previews. Stills on-chain can be 20 MB PNGs, which scrapers refuse,
 * so og:image points at the app's own image optimizer instead of the
 * original: same picture, a size a scraper will fetch.
 */

/** Width for a social card. It must be one of next/image's device sizes. */
const OG_WIDTH = 1200;

export function ogImageUrl(src: string, width: number = OG_WIDTH): string {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=75`;
}

/**
 * The absolute base a relative og:image is resolved against. Set
 * RAISONNE_SITE_URL to the site's own address when it is deployed; without
 * it, previews only work locally.
 */
export function metadataBase(): URL {
  const raw = process.env.RAISONNE_SITE_URL?.trim();
  if (raw) {
    try {
      return new URL(raw);
    } catch {
      // A malformed value should not take the whole site down.
    }
  }
  return new URL(`http://localhost:${process.env.PORT ?? 3000}`);
}
