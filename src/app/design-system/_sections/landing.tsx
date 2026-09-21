import { FeaturedGrid, FeaturedGridSkeleton, resolveFeatured } from '@/components/raisonne/landing/featured';
import { LandingHero, LandingHeroSkeleton } from '@/components/raisonne/landing/hero';
import { News, NewsEmpty, NewsSkeleton } from '@/components/raisonne/landing/news';
import { NewsletterForm } from '@/components/raisonne/landing/newsletter-form';
import { Partners, PartnersSkeleton } from '@/components/raisonne/landing/partners';
import { Showreel, ShowreelSkeleton } from '@/components/raisonne/landing/showreel';
import { Stats, StatsSkeleton } from '@/components/raisonne/landing/stats';
import { Ticker } from '@/components/raisonne/landing/ticker';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getCounts, getSiteData } from '@/fixtures';
import { newsletterState } from '@/lib/newsletter';
import { isModuleEnabled } from '@/lib/records';
import type { Landing } from '@/lib/types';

import { Specimen, SpecimenGrid } from '../_foundations/specimen';

/**
 * Landing: the home page, block by block, with this install's own data.
 *
 * Every block here is optional in the data, so each one is shown twice: once
 * with what the artist has written, and once in the state a fresh install is
 * in. The order of the blocks on the real page comes from
 * Landing.sections, not from this list.
 */

export const LANDING_TOPICS = [
  { id: 'landing-hero', label: 'Hero and ticker' },
  { id: 'landing-showreel', label: 'Showreel' },
  { id: 'landing-stats', label: 'Stats' },
  { id: 'landing-featured', label: 'Featured' },
  { id: 'landing-partners', label: 'Partners' },
  { id: 'landing-news', label: 'News and events' },
  { id: 'landing-newsletter', label: 'Sign-up' },
] as const;

function Group({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="flex scroll-mt-20 flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        <p className="max-w-prose text-sm text-pretty text-muted-foreground">{description}</p>
      </div>
      <SpecimenGrid>{children}</SpecimenGrid>
    </section>
  );
}

/** The hero a site with no landing data would still need to show something. */
const SAMPLE_HERO: Landing['hero'] = {
  eyebrow: 'Sample',
  headline: 'A headline the artist writes,\nline breaks and all',
  subtitle: 'One sentence under it, capped at reading width however wide the screen is.',
  primaryCta: { label: 'View the catalogue', href: '/works', kind: 'site' },
  secondaryCta: { label: 'About the artist', href: '/about', kind: 'site' },
};

export function LandingSection() {
  const data = getSiteData();
  const counts = getCounts();
  const landing = data.landing;
  const featured = landing ? resolveFeatured(data, landing.featured) : [];
  const newsletter = landing?.newsletter ?? { title: 'Hear about new work', description: 'One note a month.' };
  const signUp = newsletterState(data.settings);

  return (
    <div className="flex flex-col gap-16">
      <Group
        id="landing-hero"
        title="Hero and ticker"
        description="The first screen. The headline keeps the line breaks the artist typed; the eyebrow, the subtitle and both buttons are optional. The ticker under it is the studio clock, where the studio is, and what is on the bench."
      >
        <Specimen
          title="LandingHero"
          source="raisonne/landing/hero"
          span="full"
          stageClassName="block"
          note="With this install's own hero when it has one, and a sample when it does not."
        >
          <LandingHero
            hero={landing?.hero ?? SAMPLE_HERO}
            ticker={landing?.ticker ?? null}
            headingLevel={5}
          />
        </Specimen>
        <Specimen
          title="LandingHero, headline only"
          source="raisonne/landing/hero"
          span={2}
          stageClassName="block"
          note="Every field but the headline can be missing."
        >
          <LandingHero
            hero={{ eyebrow: null, headline: 'Headline only', subtitle: null, primaryCta: null, secondaryCta: null }}
            headingLevel={5}
          />
        </Specimen>
        <Specimen
          title="Ticker"
          source="raisonne/landing/ticker"
          stageClassName="block"
          note="The clock is the studio's zone, not the visitor's, and it appears only once the browser has one. Phrases hold still for a visitor who asks for less motion."
        >
          <Ticker
            ticker={
              landing?.ticker ?? {
                timezone: 'Europe/Lisbon',
                city: 'Lisbon',
                coordinates: '38.72 N, 9.14 W',
                phrases: ['Paste paper', 'Repeat and drift'],
              }
            }
          />
        </Specimen>
        <Specimen title="LandingHero, loading" source="LandingHeroSkeleton" span={2} stageClassName="block">
          <LandingHeroSkeleton />
        </Specimen>
      </Group>

      <Group
        id="landing-showreel"
        title="Showreel"
        description="A still until someone asks for the video. Hovering starts a muted preview, clicking loads the real thing with controls, and Expand asks for fullscreen. Nothing plays by itself, and a visitor who asks for less motion never sees the preview."
      >
        {landing?.showreel ? (
          <Specimen title="Showreel" source="raisonne/landing/showreel" span="full" stageClassName="block">
            <Showreel showreel={landing.showreel} />
          </Specimen>
        ) : (
          <Specimen
            title="Showreel, none set"
            source="raisonne/landing/showreel"
            span={2}
            stageClassName="block"
            note="This install has no reel, so the home page leaves the block out entirely rather than showing an empty frame."
          >
            <Alert>
              <AlertTitle>No showreel</AlertTitle>
              <AlertDescription>
                {isModuleEnabled(data.settings, 'showreel')
                  ? 'The module is on, but the landing data carries no video.'
                  : 'The showreel module is switched off in settings.'}
              </AlertDescription>
            </Alert>
          </Specimen>
        )}
        <Specimen title="Showreel, loading" source="ShowreelSkeleton" span={2} stageClassName="block">
          <ShowreelSkeleton />
        </Specimen>
      </Group>

      <Group
        id="landing-stats"
        title="Stats"
        description="Free text with tokens in it: {{artworks}} becomes the live count, a plain number stays a plain number, and a token nobody recognises is left as it was written so the mistake is visible."
      >
        <Specimen title="Stats" source="raisonne/landing/stats" span="full" stageClassName="block">
          <Stats stats={landing?.stats ?? []} counts={counts} />
        </Specimen>
        <Specimen
          title="Stats, tokens"
          source="raisonne/landing/stats"
          span={2}
          stageClassName="block"
          note="The last one is a typo on purpose: it prints as it was typed instead of becoming a zero."
        >
          <Stats
            stats={[
              { label: 'Works', value: '{{artworks}}', description: 'Every token in the catalogue' },
              { label: 'Series', value: '{{series}}', description: null },
              { label: 'Years', value: '7', description: 'In the studio' },
              { label: 'Unknown', value: '{{artwrks}}', description: 'A token nobody recognises' },
            ]}
            counts={counts}
          />
        </Specimen>
        <Specimen title="Stats, loading" source="StatsSkeleton" span={2} stageClassName="block">
          <StatsSkeleton />
        </Specimen>
      </Group>

      <Group
        id="landing-featured"
        title="Featured"
        description="Hand-picked records of any type: a series, one token, a show, an installation, a collaboration, a paper. A reference to something this install does not have is dropped rather than rendered as a dead tile."
      >
        <Specimen
          title="FeaturedGrid"
          source="raisonne/landing/featured"
          span="full"
          stageClassName="block"
          note="The first tile takes two columns and two rows from md, so the page opens on one work rather than a row of thumbnails."
        >
          <FeaturedGrid items={featured} />
        </Specimen>
        <Specimen title="FeaturedGrid, loading" source="FeaturedGridSkeleton" span={2} stageClassName="block">
          <FeaturedGridSkeleton items={3} />
        </Specimen>
      </Group>

      <Group
        id="landing-partners"
        title="Partners"
        description="Institutions and studios, on the page's own background at one height. A partner with no logo is shown as its name, because a logo is a name."
      >
        <Specimen title="Partners" source="raisonne/landing/partners" span="full" stageClassName="block">
          <Partners partners={landing?.partners ?? []} />
        </Specimen>
        <Specimen title="Partners, loading" source="PartnersSkeleton" span={2} stageClassName="block">
          <PartnersSkeleton />
        </Specimen>
      </Group>

      <Group
        id="landing-news"
        title="News and events"
        description="An event reads upcoming, on now or past from its dates every time the page is built, so a show that closed in April cannot still read 'upcoming'. A row with a picture shows it on hover and on focus."
      >
        <Specimen title="News" source="raisonne/landing/news" span="full" stageClassName="block">
          <News
            announcements={landing?.announcements ?? []}
            events={landing?.events ?? []}
            headingLevel={5}
          />
        </Specimen>
        <Specimen
          title="News, event statuses"
          source="raisonne/landing/news"
          span={2}
          stageClassName="block"
          note="The same three events, read against a fixed date."
        >
          <News
            announcements={[]}
            headingLevel={5}
            now={Date.parse('2026-06-15T12:00:00.000Z')}
            events={[
              {
                id: 'past',
                title: 'A show that has closed',
                description: null,
                location: 'Lisbon',
                startDate: '2026-02-01',
                endDate: '2026-03-01',
                image: null,
                url: null,
              },
              {
                id: 'current',
                title: 'A show that is open',
                description: null,
                location: 'Rotterdam',
                startDate: '2026-06-01',
                endDate: '2026-07-01',
                image: null,
                url: null,
              },
              {
                id: 'upcoming',
                title: 'A show that opens later',
                description: null,
                location: 'Berlin',
                startDate: '2026-09-01',
                endDate: null,
                image: null,
                url: null,
              },
            ]}
          />
        </Specimen>
        <Specimen title="News, empty" source="raisonne/landing/news" stageClassName="block">
          <NewsEmpty />
        </Specimen>
        <Specimen title="News, loading" source="NewsSkeleton" span={2} stageClassName="block">
          <NewsSkeleton />
        </Specimen>
      </Group>

      <Group
        id="landing-newsletter"
        title="Sign-up"
        description="The only write in Wave 1. With no endpoint configured the form is switched off rather than rendered live, because a box that quietly drops addresses is worse than no box, and a specimen whose button answers 503 is worse than either. It reports what the route actually answered, never a success it did not get."
      >
        <Specimen
          title="NewsletterForm"
          source="raisonne/landing/newsletter-form"
          span={2}
          stageClassName="block"
          note="This specimen follows the install: with an endpoint set it posts for real, and without one it renders the switched-off state the artist sees while setting the site up."
        >
          <NewsletterForm
            title={newsletter.title}
            description={newsletter.description}
            source="design-system"
            setupNote={signUp !== 'on'}
          />
        </Specimen>
      </Group>
    </div>
  );
}
