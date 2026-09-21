import { ImageResponse } from 'next/og';

import { getCounts, getSiteData } from '@/fixtures';
import { siteOrigin } from '@/lib/seo/urls';

/**
 * The share card a page falls back to when it has none of its own.
 *
 * It is drawn rather than uploaded, so a fresh install never ships a broken
 * preview: the artist's name, their one line, and what the catalogue holds.
 * Pages with a work or a cover of their own set that image in their metadata
 * and never reach this.
 *
 * Plain type on the theme's light background. No web font is loaded: the
 * built-in face renders everywhere, and a card that fails to build is worse
 * than a card in a different typeface.
 */

export const alt = 'Catalogue raisonne';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  const { artist, settings } = getSiteData();
  const counts = getCounts();
  const host = new URL(siteOrigin(settings)).host;

  const facts = [
    counts.works ? `${counts.works.toLocaleString('en-US')} works` : null,
    counts.series ? `${counts.series.toLocaleString('en-US')} series` : null,
    counts.exhibitions ? `${counts.exhibitions.toLocaleString('en-US')} exhibitions` : null,
  ].filter(Boolean) as string[];

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          height: '100%',
          padding: 72,
          backgroundColor: '#ffffff',
          color: '#171717',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              display: 'flex',
              width: 44,
              height: 44,
              borderRadius: 10,
              backgroundColor: '#171717',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ display: 'flex', width: 20, height: 20, border: '3px solid #ffffff', borderRadius: 2 }} />
          </div>
          <div style={{ display: 'flex', fontSize: 24, color: '#737373' }}>Catalogue raisonne</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', fontSize: artist.name.length > 24 ? 72 : 88, letterSpacing: -2 }}>
            {artist.name}
          </div>
          {artist.tagline ? (
            <div style={{ display: 'flex', fontSize: 36, color: '#525252' }}>{artist.tagline}</div>
          ) : null}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '2px solid #e5e5e5',
            paddingTop: 28,
            fontSize: 26,
            color: '#737373',
          }}
        >
          <div style={{ display: 'flex' }}>{facts.join('  ·  ')}</div>
          <div style={{ display: 'flex' }}>{host}</div>
        </div>
      </div>
    ),
    size,
  );
}
