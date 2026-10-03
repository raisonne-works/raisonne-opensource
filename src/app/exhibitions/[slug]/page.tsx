import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { AboutSection } from '@/components/raisonne/records/about-section';
import { exhibitionFacts, exhibitionFactsByStanding, statusLabel } from '@/components/raisonne/records/facts';
import { RecordBreadcrumb } from '@/components/raisonne/records/record-breadcrumb';
import { RecordFacts } from '@/components/raisonne/records/record-facts';
import { RecordHero } from '@/components/raisonne/records/record-hero';
import { RecordIntro } from '@/components/raisonne/records/record-intro';
import { BreadcrumbJsonLd, JsonLd } from '@/components/raisonne/seo/json-ld';
import { EXHIBITION_KIND_LABEL } from '@/components/raisonne/profile/format';
import { Container } from '@/components/raisonne/shell/page';
import { StoryBlocks } from '@/components/raisonne/story/story-blocks';
import { decodeParam } from '@/components/raisonne/works/lib';
import { Badge } from '@/components/ui/badge';
import { getExhibition, getExhibitions, getSettings } from '@/fixtures';
import { exhibitionStatus } from '@/lib/records';
import { exhibitionJsonLd } from '@/lib/seo/json-ld';
import { NO_INDEX, seoMetadata } from '@/lib/seo/metadata';
import { siteOrigin } from '@/lib/seo/urls';
import { slot } from '@/lib/theme';

/**
 * One exhibition: what it was, where and when, who curated it, and the
 * documentation the artist kept.
 *
 * Only a show with its own page has a slug; every other show in the CV is a
 * row on the list, which is why this route is generated from the ones that
 * do.
 */

type Params = Promise<{ slug: string }>;

export const dynamicParams = false;

export function generateStaticParams() {
  return getExhibitions()
    .filter(exhibition => Boolean(exhibition.slug))
    .map(exhibition => ({ slug: exhibition.slug as string }));
}

async function resolve(params: Params) {
  const { slug } = await params;
  return getExhibition(decodeParam(slug)) ?? getExhibition(slug);
}

function pathFor(slug: string): string {
  return `/exhibitions/${encodeURIComponent(slug)}`;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const exhibition = await resolve(params);
  if (!exhibition) return { title: 'Not found', robots: NO_INDEX };
  const place = [exhibition.venue, exhibition.city].filter(Boolean).join(', ');
  return seoMetadata(exhibition.seo, {
    title: place ? `${exhibition.title}, ${place}` : exhibition.title,
    description: exhibition.description,
    image: exhibition.cover?.kind === 'video' ? exhibition.cover.poster : exhibition.cover?.src,
    path: pathFor(exhibition.slug ?? ''),
    keywords: exhibition.tags,
  });
}

export default async function ExhibitionPage({ params }: { params: Params }) {
  slot('exhibition');
  const exhibition = await resolve(params);
  if (!exhibition) notFound();

  const facts = exhibitionFacts(exhibition);
  const status = statusLabel(exhibitionStatus(exhibition));
  const hasAbout = Boolean(exhibition.about && exhibition.about.length > 0);

  const factsNode = (
    <RecordFacts
      facts={facts}
      alternate={exhibitionFactsByStanding(exhibition)}
      highlights={exhibition.highlights}
      title="The show"
    />
  );

  return (
    <Container className="flex flex-col gap-10 pt-6 pb-16 md:gap-12 md:pb-24">
      <RecordBreadcrumb parents={[{ href: '/exhibitions', label: 'Exhibitions' }]} current={exhibition.title} />
      <BreadcrumbJsonLd
        items={[{ name: 'Exhibitions', path: '/exhibitions' }, { name: exhibition.title, path: pathFor(exhibition.slug ?? '') }]}
      />
      <JsonLd
        data={exhibitionJsonLd({ exhibition, origin: siteOrigin(getSettings()), path: pathFor(exhibition.slug ?? '') })}
      />

      <RecordHero
        eyebrow={exhibition.format ?? `${EXHIBITION_KIND_LABEL[exhibition.kind]} exhibition`}
        title={exhibition.title}
        subtitle={[exhibition.venue, exhibition.city, exhibition.country].filter(Boolean).join(', ') || null}
        description={exhibition.description}
        cover={exhibition.cover}
        tags={exhibition.tags}
        badges={
          status ? (
            <Badge
              variant={status === 'On now' ? 'default' : 'secondary'}
              data-venue={exhibition.venue || undefined}
              data-place={[exhibition.city, exhibition.country].filter(Boolean).join(', ') || undefined}
            >
              {status}
            </Badge>
          ) : null
        }
      />

      {hasAbout ? (
        <RecordIntro aside={factsNode}>
          <AboutSection title={exhibition.aboutTitle ?? 'About the show'} body={exhibition.about} />
        </RecordIntro>
      ) : null}

      <StoryBlocks blocks={exhibition.story ?? []} aside={hasAbout ? undefined : factsNode} />
    </Container>
  );
}
