import Link from 'next/link';
import { DownloadIcon } from 'lucide-react';

import { NewsletterForm } from '@/components/raisonne/landing/newsletter-form';
import { type HeadingLevel, nextHeadingLevel } from '@/components/raisonne/shell/heading';
import { Container, PageHeader, Section } from '@/components/raisonne/shell/page';
import { Button } from '@/components/ui/button';
import { newsletterState } from '@/lib/newsletter';
import type { CatalogueCounts, SiteData } from '@/lib/types';

import { ArtistLinkList, groupLinks } from './artist-links';
import { BioWithCounts } from './bio-with-counts';
import { paragraphs } from './format';
import { Highlights, highlightsFor } from './highlights';
import { MintingAddresses } from './minting-addresses';
import { PartnerGroups } from './partner-groups';
import { ResearchAreas } from './research-areas';
import { StudioCarousel } from './studio-carousel';

/**
 * The About page: the artist in their own words, with the catalogue's
 * numbers written into the biography, the studio, what the practice is
 * asking, the addresses a collector should check against, and everyone the
 * work is made with.
 *
 * Every block is optional. An install with a name and a sentence renders a
 * short, complete page rather than a page of empty headings.
 */
export function AboutPage({
  data,
  counts,
  headingLevel = 2,
  className,
}: {
  data: SiteData;
  counts: CatalogueCounts;
  /** 2 under the page's own h1. */
  headingLevel?: HeadingLevel;
  className?: string;
}) {
  const { artist } = data;
  const entryLevel = nextHeadingLevel(headingLevel);
  const statement = paragraphs(artist.statement);
  const images = artist.images ?? [];
  const research = artist.researchAreas ?? [];
  const partners = artist.partners ?? [];
  const highlights = highlightsFor(data, counts);
  const { social, marketplace } = groupLinks(artist.links);
  const newsletter = data.landing?.newsletter ?? null;
  // The CV page is only worth pointing at once there is a CV to read.
  const hasCv =
    data.cv !== null ||
    data.exhibitions.length > 0 ||
    data.awards.length > 0 ||
    data.press.length > 0 ||
    Boolean(artist.bio) ||
    statement.length > 0;
  const signUp = newsletter === null ? 'off' : newsletterState(data.settings);

  const pressKitUrl = artist.pressKit?.fileUrl ?? null;
  return (
    <Container size="editorial" className={className}>
      <PageHeader
        eyebrow="About"
        title={artist.name}
        description={artist.description ?? artist.tagline ?? undefined}
        actions={
          hasCv || pressKitUrl ? (
            <>
              {hasCv ? (
                <Button variant="outline" nativeButton={false} render={<Link href="/cv" />}>
                  Read the full CV
                </Button>
              ) : null}
              {/* The press kit is the PDF set on the About page in the editor. */}
              {pressKitUrl ? (
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<a href={pressKitUrl} download target="_blank" rel="noopener noreferrer" />}
                >
                  <DownloadIcon aria-hidden data-icon="inline-start" />
                  Download the press kit
                  <span className="sr-only"> (opens in a new tab)</span>
                </Button>
              ) : null}
            </>
          ) : undefined
        }
      />

      <div className="grid gap-x-12 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,32rem)] xl:items-start xl:gap-x-16">
        <div className="min-w-0">
          {artist.bio ? (
            <Section id="biography" title="Biography" headingLevel={headingLevel}>
              <BioWithCounts text={artist.bio} counts={counts} />
            </Section>
          ) : null}

          {statement.length > 0 ? (
            <Section id="statement" title="Statement" headingLevel={headingLevel}>
              <div className="flex flex-col gap-4 text-base/7 text-pretty">
                {statement.map((block, index) => (
                  <p key={index}>{block}</p>
                ))}
              </div>
            </Section>
          ) : null}
        </div>

        {images.length > 0 ? (
          <div className="min-w-0">
            <Section
              id="studio"
              title={artist.imagesTitle?.trim() || 'The studio'}
              headingLevel={headingLevel}
              size="small"
              className="xl:sticky xl:top-20"
            >
              <StudioCarousel images={images} label={`${artist.name} in the studio`} />
            </Section>
          </div>
        ) : null}
      </div>

      {highlights.length > 0 ? (
        <Section
          id="highlights"
          title="The catalogue so far"
          description="Every number is a way into the records behind it."
          headingLevel={headingLevel}
        >
          <Highlights highlights={highlights} />
        </Section>
      ) : null}

      {research.length > 0 ? (
        <Section id="research" title="Areas of research" headingLevel={headingLevel}>
          <ResearchAreas areas={research} headingLevel={entryLevel} />
        </Section>
      ) : null}

      {artist.wallets.length > 0 ? (
        <Section
          id="minting-addresses"
          title="Official minting addresses"
          description="These are the minting addresses this install lists for the artist. Check a listing against them before you collect. Addresses not on this list are outside what this catalogue claims."
          headingLevel={headingLevel}
        >
          <MintingAddresses wallets={artist.wallets} notice={artist.securityNotice} />
        </Section>
      ) : null}

      {partners.length > 0 ? (
        <Section id="partners" title="Partners and platforms" headingLevel={headingLevel}>
          <PartnerGroups groups={partners} headingLevel={entryLevel} />
        </Section>
      ) : null}

      {social.length > 0 || marketplace.length > 0 || artist.email || signUp !== 'off' ? (
        <Section id="contact" title="Elsewhere" headingLevel={headingLevel}>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {social.length > 0 ? (
              <div className="flex flex-col gap-2">
                <h3 id="about-social" className="text-sm font-medium">
                  Follow the work
                </h3>
                <ArtistLinkList links={social} labelledBy="about-social" className="flex flex-col gap-0.5" />
              </div>
            ) : null}
            {marketplace.length > 0 ? (
              <div className="flex flex-col gap-2">
                <h3 id="about-collect" className="text-sm font-medium">
                  Where to collect
                </h3>
                <ArtistLinkList links={marketplace} labelledBy="about-collect" className="flex flex-col gap-0.5" />
              </div>
            ) : null}
            {artist.email ? (
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium">Get in touch</h3>
                <a
                  href={`mailto:${artist.email}`}
                  className="rounded-sm text-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {artist.email}
                </a>
              </div>
            ) : null}
          </div>
          {signUp !== 'off' && newsletter ? (
            <NewsletterForm
              title={newsletter.title}
              description={newsletter.description}
              source="about"
              setupNote={signUp === 'unconfigured'}
              className="pt-2"
            />
          ) : null}
        </Section>
      ) : null}
    </Container>
  );
}
