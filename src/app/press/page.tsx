import type { Metadata } from 'next';

import { PressFeatured, PressKit, PressPodcasts, PressTable, PressVideos } from '@/components/raisonne/catalogue/press-index';
import { Container, PageHeader, Section } from '@/components/raisonne/shell/page';
import { getPress, getSiteData } from '@/fixtures';
import { pageMetadata } from '@/lib/seo/metadata';

/**
 * The press page: the pieces the artist leads with, then the interviews on
 * video, the podcast appearances, and the table of every mention.
 *
 * Nothing plays on this page. A piece the catalogue keeps a copy of opens on
 * its own page, where the player loads when the visitor asks for it;
 * everything else links out to the outlet.
 */

export function generateMetadata(): Metadata {
  const { artist } = getSiteData();
  return pageMetadata('press', {
    title: 'Press',
    description: `Articles, interviews and podcasts about ${artist.name}.`,
    path: '/press',
  });
}

export default function PressPage() {
  const { artist } = getSiteData();
  const press = getPress();

  const featured = press.filter(item => item.featured);
  const videos = press.filter(item => item.kind === 'video');
  const podcasts = press.filter(item => item.kind === 'podcast');

  return (
    <Container className="pb-16 md:pb-24">
      <PageHeader
        title="Press"
        description={`What has been written, filmed and recorded about ${artist.name}, kept here so it survives the link rot.`}
      />

      <PressKit artist={artist} />

      {featured.length > 0 ? (
        <Section title="Featured" description="The pieces that say the most about the work.">
          <PressFeatured press={press} />
        </Section>
      ) : null}

      {videos.length > 0 ? (
        <Section title="Video interviews" description="Conversations and features on film.">
          <PressVideos press={press} />
        </Section>
      ) : null}

      {podcasts.length > 0 ? (
        <Section title="Podcasts" description="Episodes the artist appeared on.">
          <PressPodcasts press={press} />
        </Section>
      ) : null}

      <Section
        id="mentions"
        title="Every mention"
        description="Publication, headline and date, newest first."
      >
        <PressTable press={press} />
      </Section>
    </Container>
  );
}
