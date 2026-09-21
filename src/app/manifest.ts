import type { MetadataRoute } from 'next';

import { getSiteData } from '@/fixtures';

/**
 * The web app manifest, so the catalogue can be installed and so a phone that
 * saves it to the home screen gets the artist's name rather than the URL.
 *
 * Everything comes from the install's own data. The icon is the theme's
 * app icon (src/app/icon.svg), which adapts to light and dark on its own; an
 * install that wants a raster set can drop them in /public and they will be
 * used instead.
 */
export default function manifest(): MetadataRoute.Manifest {
  const { artist } = getSiteData();

  return {
    name: `${artist.name}, catalogue raisonne`,
    short_name: artist.name,
    description: artist.tagline ?? `The catalogue raisonne of ${artist.name}.`,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    // The theme's light background. The browser chrome matches the default theme.
    background_color: '#ffffff',
    theme_color: '#ffffff',
    categories: ['art', 'education', 'reference'],
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
}
