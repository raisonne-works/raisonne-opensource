import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { physicalWorkFacts } from '@/components/raisonne/records/facts';
import { RecordBreadcrumb } from '@/components/raisonne/records/record-breadcrumb';
import { RecordFacts } from '@/components/raisonne/records/record-facts';
import { RecordHero } from '@/components/raisonne/records/record-hero';
import { BreadcrumbJsonLd, JsonLd } from '@/components/raisonne/seo/json-ld';
import { Container, Section } from '@/components/raisonne/shell/page';
import { StoryBlocks } from '@/components/raisonne/story/story-blocks';
import { decodeParam, seriesTitle } from '@/components/raisonne/works/lib';
import { WorkGrid } from '@/components/raisonne/works/work-grid';
import { getArtist, getPhysicalWork, getPhysicalWorks, getSeries, getSettings, getWorkById } from '@/fixtures';
import { productJsonLd } from '@/lib/seo/json-ld';
import { NO_INDEX, seoMetadata } from '@/lib/seo/metadata';
import { siteOrigin } from '@/lib/seo/urls';
import type { Work } from '@/lib/types';
import { slot } from '@/lib/theme';

/**
 * One physical or phygital work: the object, what it is made of, where it
 * is, and the digital works it comes from.
 *
 * The link back to the tokens is the point of the page: a phygital work is
 * only half a record without the other half.
 */

type Params = Promise<{ slug: string }>;

export const dynamicParams = true;

export function generateStaticParams() {
  return getPhysicalWorks().map(record => ({ slug: record.slug }));
}

async function resolve(params: Params) {
  const { slug } = await params;
  return getPhysicalWork(decodeParam(slug)) ?? getPhysicalWork(slug);
}

function pathFor(slug: string): string {
  return `/physical-works/${encodeURIComponent(slug)}`;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const physical = await resolve(params);
  if (!physical) return { title: 'Not found', robots: NO_INDEX };
  return seoMetadata(physical.seo, {
    title: physical.title,
    description: physical.description ?? physical.subtitle,
    image: physical.cover?.kind === 'video' ? physical.cover.poster : physical.cover?.src,
    path: pathFor(physical.slug),
    keywords: physical.tags,
  });
}

export default async function PhysicalWorkPage({ params }: { params: Params }) {
  slot('physical-work');
  const physical = await resolve(params);
  if (!physical) notFound();

  const series = physical.seriesSlug ? getSeries(physical.seriesSlug) : null;
  const facts = physicalWorkFacts(physical, series ? seriesTitle(series) : null);
  const works = physical.workIds
    .map(id => getWorkById(id))
    .filter((work): work is Work => work !== null);

  return (
    <Container className="flex flex-col gap-10 pt-6 pb-16 md:gap-12 md:pb-24">
      <RecordBreadcrumb parents={[{ href: '/physical-works', label: 'Physical works' }]} current={physical.title} />
      <BreadcrumbJsonLd
        items={[{ name: 'Physical works', path: '/physical-works' }, { name: physical.title, path: pathFor(physical.slug) }]}
      />
      <JsonLd
        data={productJsonLd({
          work: physical,
          artist: getArtist(),
          origin: siteOrigin(getSettings()),
          path: pathFor(physical.slug),
        })}
      />

      <RecordHero
        eyebrow="Physical work"
        title={physical.title}
        subtitle={physical.subtitle}
        description={physical.description}
        cover={physical.cover}
        tags={physical.tags}
      />

      <StoryBlocks blocks={physical.story} aside={<RecordFacts facts={facts} title="The object" />} />

      {works.length > 0 ? (
        <Section
          title="Made from"
          description="The digital works this object comes from."
          className="py-0 md:py-0"
        >
          <WorkGrid works={works} />
        </Section>
      ) : null}
    </Container>
  );
}
