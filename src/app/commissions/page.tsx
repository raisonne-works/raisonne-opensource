import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ClientLogos } from '@/components/raisonne/commissions/client-logos';
import { FeaturedCollaborations } from '@/components/raisonne/commissions/featured-collaborations';
import { CommissionsHero, enquiryCta } from '@/components/raisonne/commissions/hero';
import { Services } from '@/components/raisonne/commissions/services';
import { groupLinks } from '@/components/raisonne/profile/artist-links';
import { Container, Section } from '@/components/raisonne/shell/page';
import { getArtist, getCollaborations, getCommissions, getSettings } from '@/fixtures';
import { isModuleEnabled } from '@/lib/records';
import { NO_INDEX, pageMetadata } from '@/lib/seo/metadata';
import type { Collaboration } from '@/lib/types';
import { slot } from '@/lib/theme';

/**
 * How to work with the artist: what the studio takes on, who it has worked
 * with, and the one way to ask.
 *
 * Commissions are an optional module. An install that has not written the
 * page, or has switched it off, answers 404 rather than showing an empty
 * pitch.
 */

function commissionsPage() {
  if (!isModuleEnabled(getSettings(), 'commissions')) return null;
  return getCommissions();
}

/** The collaborations the artist picked, in their order, or the newest when they picked none. */
function featured(slugs: string[]): Collaboration[] {
  const all = getCollaborations();
  if (slugs.length === 0) return all.slice(0, 6);
  const picked = slugs
    .map(slug => all.find(collaboration => collaboration.slug === slug))
    .filter((entry): entry is Collaboration => entry !== undefined);
  return picked.length > 0 ? picked : all.slice(0, 6);
}

export function generateMetadata(): Metadata {
  const page = commissionsPage();
  if (!page) return { title: 'Not found', robots: NO_INDEX };
  return pageMetadata('commissions', {
    title: page.title,
    description: page.description ?? `Commission work from ${getArtist().name}.`,
    path: '/commissions',
  });
}

export default function CommissionsPageRoute() {
  slot('commissions');
  const page = commissionsPage();
  if (!page) notFound();

  const collaborations = featured(page.featured);
  const artist = getArtist();
  // The artist's own address stands in when the CMS carried no call to
  // action, so this page always offers a way to start a conversation.
  const cta = enquiryCta(page.cta, artist);
  const elsewhere = groupLinks(artist.links).social;

  return (
    <Container className="pb-16 md:pb-24">
      <CommissionsHero title={page.title} description={page.description} cta={cta} elsewhere={elsewhere} />

      {page.services.length > 0 ? (
        <Section title="What the studio takes on" description="Tell the studio which of these a project needs.">
          <Services services={page.services} cta={cta} />
        </Section>
      ) : null}

      {collaborations.length > 0 ? (
        <Section
          title="Selected projects"
          description="Work made with brands, institutions and other studios."
          action={null}
        >
          <FeaturedCollaborations collaborations={collaborations} />
        </Section>
      ) : null}

      {page.clients.length > 0 ? (
        <Section title="Worked with">
          <ClientLogos clients={page.clients} />
        </Section>
      ) : null}
    </Container>
  );
}
