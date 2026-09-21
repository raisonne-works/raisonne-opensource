import type { Metadata } from 'next';

import { AboutPage } from '@/components/raisonne/profile/about-page';
import { JsonLd } from '@/components/raisonne/seo/json-ld';
import { getCounts, getSiteData } from '@/fixtures';
import { fillTokens } from '@/lib/records';
import { profilePageJsonLd } from '@/lib/seo/json-ld';
import { pageMetadata } from '@/lib/seo/metadata';
import { siteOrigin } from '@/lib/seo/urls';

export function generateMetadata(): Metadata {
  const { artist } = getSiteData();
  const counts = getCounts();
  // The biography's tokens are resolved before it becomes a description, so
  // a share card never carries "{{artworks}}".
  const summary = fillTokens(artist.description ?? artist.bio ?? artist.statement, counts);

  return pageMetadata('about', {
    title: `About ${artist.name}`,
    description: summary?.split('\n\n')[0] ?? artist.tagline,
    image: artist.images?.[0]?.src ?? artist.portrait,
    path: '/about',
    type: 'profile',
  });
}

export default function About() {
  const data = getSiteData();
  const counts = getCounts();

  return (
    <>
      <JsonLd data={profilePageJsonLd({ artist: data.artist, origin: siteOrigin(data.settings) })} />
      <AboutPage data={data} counts={counts} className="pb-12 md:pb-16" />
    </>
  );
}
