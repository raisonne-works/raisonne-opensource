import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { CatalogueSections } from '@/components/raisonne/catalogue/catalogue-sections';
import { FeaturedGrid, resolveFeatured } from '@/components/raisonne/landing/featured';
import { LandingHero } from '@/components/raisonne/landing/hero';
import { News } from '@/components/raisonne/landing/news';
import { Partners } from '@/components/raisonne/landing/partners';
import { Showreel } from '@/components/raisonne/landing/showreel';
import { Stats } from '@/components/raisonne/landing/stats';
import { ArtistHero } from '@/components/raisonne/profile/artist-hero';
import { JsonLd } from '@/components/raisonne/seo/json-ld';
import { Container, Section } from '@/components/raisonne/shell/page';
import { seriesHref, seriesTitle, TWO_ROWS, wholeRowTileClass } from '@/components/raisonne/works/lib';
import { MediaStill } from '@/components/raisonne/works/media-still';
import { SeriesGrid } from '@/components/raisonne/works/series-grid';
import { Button } from '@/components/ui/button';
import { getCounts, getFeaturedSeries, getSiteData } from '@/fixtures';
import { homePageJsonLd } from '@/lib/seo/json-ld';
import { pageMetadata } from '@/lib/seo/metadata';
import { siteOrigin } from '@/lib/seo/urls';
import { isModuleEnabled, worksLabel } from '@/lib/records';
import type { Landing, LandingSectionId, Series } from '@/lib/types';
import { slot } from '@/lib/theme';

export function generateMetadata(): Metadata {
  const { artist } = getSiteData();
  return pageMetadata('home', {
    title: artist.name,
    description: artist.tagline ?? `The catalogue raisonne of ${artist.name}.`,
    image: artist.portrait,
    path: '/',
  });
}

/** The order the home page falls back to when the artist has set none. */
const DEFAULT_ORDER: LandingSectionId[] = ['hero', 'showreel', 'stats', 'featured', 'catalogue', 'partners', 'news'];

/** The module a section needs, where it needs one. */
const SECTION_MODULE = {
  showreel: 'showreel',
  partners: 'partners',
  news: 'news',
} as const;

/** A quiet "see the rest of this" link, flush with the heading above it. */
function SectionLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button
      variant="link"
      size="sm"
      className="h-auto px-0 has-data-[icon=inline-end]:pr-0"
      nativeButton={false}
      render={<Link href={href} />}
    >
      {children}
      <ArrowRight aria-hidden data-icon="inline-end" />
    </Button>
  );
}

/** One work, large, beside the artist's name: the first thing a site with no landing data shows. */
function HeroWork({ series }: { series: Series }) {
  return (
    <Link
      href={seriesHref(series)}
      className="group/hero flex min-w-0 flex-col gap-3 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <MediaStill
        media={series.cover}
        alt={`From ${seriesTitle(series)}`}
        sizes="(min-width: 1280px) 45vw, 100vw"
        priority
        className="aspect-[4/3] lg:aspect-auto lg:h-[min(60svh,700px)]"
      />
      <span className="text-sm text-muted-foreground">
        From{' '}
        <span className="font-medium text-foreground underline-offset-4 group-hover/hero:underline">
          {seriesTitle(series)}
        </span>
      </span>
    </Link>
  );
}

/**
 * The home page. Its sections, their order and their titles come from the
 * landing data, and every one of them is optional: an install with no
 * landing block at all still gets the artist, the featured series and the
 * way into the catalogue, which is what the page is for.
 */
export default function HomePage() {
  slot('home');
  const data = getSiteData();
  const { artist, series, landing, settings } = data;
  const counts = getCounts();
  const origin = siteOrigin(settings);

  const order = orderedSections(landing);
  const enabled = (id: LandingSectionId) => {
    if (!order.includes(id)) return false;
    const needs = SECTION_MODULE[id as keyof typeof SECTION_MODULE];
    return needs ? isModuleEnabled(settings, needs) : true;
  };
  const titleOf = (id: LandingSectionId, fallback: string) =>
    landing?.sections.find(section => section.id === id)?.title ?? fallback;

  const featured = landing ? resolveFeatured(data, landing.featured) : [];
  const ticker = landing?.ticker && isModuleEnabled(settings, 'ticker') ? landing.ticker : null;
  const showreel = enabled('showreel') ? (landing?.showreel ?? null) : null;
  const stats = enabled('stats') ? (landing?.stats ?? []) : [];
  const partners = enabled('partners') ? (landing?.partners ?? []) : [];
  const announcements = enabled('news') ? (landing?.announcements ?? []) : [];
  const events = enabled('news') ? (landing?.events ?? []) : [];

  // With no landing data the page opens on the artist and one large work,
  // the same way it did before the home page became editable.
  const fallbackSeries = getFeaturedSeries(TWO_ROWS + 1);
  const fallbackPool = fallbackSeries.length > 0 ? fallbackSeries : series.slice(0, TWO_ROWS + 1);
  const fallbackHero = landing ? null : (fallbackPool.find(item => item.cover?.still) ?? null);
  const fallbackGrid = landing ? [] : fallbackPool.filter(item => item !== fallbackHero).slice(0, TWO_ROWS);

  return (
    <>
      <JsonLd data={homePageJsonLd({ artist, counts, origin, worksLabel: worksLabel(settings) })} />

      <Container className="pt-10 pb-2 md:pt-16 md:pb-4">
        {landing && enabled('hero') ? (
          <LandingHero hero={landing.hero} ticker={ticker} />
        ) : (
          <div
            className={
              fallbackHero
                ? 'grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-12 xl:gap-16'
                : 'grid items-center gap-8'
            }
          >
            <ArtistHero artist={artist} />
            {fallbackHero ? <HeroWork series={fallbackHero} /> : null}
          </div>
        )}
      </Container>

      <Container>
        {/* The artist's own order, section by section. */}
        {order
          .filter(id => id !== 'hero')
          .map(id => {
            switch (id) {
              case 'showreel':
                return showreel ? (
                  <Section key={id} id="showreel" title={titleOf('showreel', 'Showreel')}>
                    <Showreel showreel={showreel} title={titleOf('showreel', 'Showreel')} />
                  </Section>
                ) : null;

              case 'stats':
                return stats.length > 0 ? (
                  <Section key={id} id="stats" title={titleOf('stats', 'The catalogue in numbers')}>
                    <Stats stats={stats} counts={counts} />
                  </Section>
                ) : null;

              case 'featured':
                if (featured.length > 0) {
                  return (
                    <Section
                      key={id}
                      id="featured"
                      title={titleOf('featured', 'Selected work')}
                      action={<SectionLink href="/works">All works</SectionLink>}
                    >
                      <FeaturedGrid items={featured} />
                    </Section>
                  );
                }
                return fallbackGrid.length > 0 ? (
                  <Section
                    key={id}
                    id="featured"
                    title="Featured series"
                    description="Selected bodies of work from the catalogue."
                    action={<SectionLink href="/works">All works</SectionLink>}
                  >
                    <SeriesGrid
                      series={fallbackGrid}
                      priorityCount={4}
                      itemClassName={wholeRowTileClass(fallbackGrid.length)}
                    />
                  </Section>
                ) : null;

              case 'catalogue':
                return (
                  <Section
                    key={id}
                    id="catalogue"
                    title={titleOf('catalogue', 'The whole catalogue')}
                    description="Every kind of record this catalogue holds, with what is in it."
                    action={<SectionLink href="/works">Browse everything</SectionLink>}
                  >
                    <CatalogueSections data={data} />
                  </Section>
                );

              case 'partners':
                return partners.length > 0 ? (
                  <Section key={id} id="partners" title={titleOf('partners', 'Shown and made with')}>
                    <Partners partners={partners} />
                  </Section>
                ) : null;

              case 'news':
                return announcements.length > 0 || events.length > 0 ? (
                  <Section key={id} id="news" title={titleOf('news', 'News and dates')}>
                    <News announcements={announcements} events={events} />
                  </Section>
                ) : null;

              default:
                return null;
            }
          })}
      </Container>
    </>
  );
}

/** The sections the artist switched on, in their order, or the default order. */
function orderedSections(landing: Landing | null): LandingSectionId[] {
  if (!landing || landing.sections.length === 0) return DEFAULT_ORDER;
  const chosen = landing.sections.filter(section => section.enabled).map(section => section.id);
  return chosen.length > 0 ? chosen : DEFAULT_ORDER;
}
