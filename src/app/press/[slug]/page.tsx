import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PressDetail } from '@/components/raisonne/records/press-detail';
import { RecordBreadcrumb } from '@/components/raisonne/records/record-breadcrumb';
import { BreadcrumbJsonLd, JsonLd } from '@/components/raisonne/seo/json-ld';
import { Container, Section } from '@/components/raisonne/shell/page';
import { decodeParam } from '@/components/raisonne/works/lib';
import { SeriesGrid } from '@/components/raisonne/works/series-grid';
import { getPress, getPressItem, getSeries, getSettings } from '@/fixtures';
import { articleJsonLd } from '@/lib/seo/json-ld';
import { NO_INDEX, seoMetadata } from '@/lib/seo/metadata';
import { siteOrigin } from '@/lib/seo/urls';
import type { Series } from '@/lib/types';
import { slot } from '@/lib/theme';

/**
 * One piece of press, kept on this site: the text or the player, the
 * details, the link to the original, and the series the piece is about.
 *
 * Only an item the artist kept on-site has a slug, so this route is
 * generated from those; the rest of the press list links straight out.
 */

type Params = Promise<{ slug: string }>;

export const dynamicParams = true;

export function generateStaticParams() {
  return getPress()
    .filter(item => Boolean(item.slug))
    .map(item => ({ slug: item.slug as string }));
}

async function resolve(params: Params) {
  const { slug } = await params;
  return getPressItem(decodeParam(slug)) ?? getPressItem(slug);
}

function pathFor(slug: string): string {
  return `/press/${encodeURIComponent(slug)}`;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const item = await resolve(params);
  if (!item) return { title: 'Not found', robots: NO_INDEX };
  // A piece whose title is its outlet's name says it once, not twice.
  const sameName = item.title.trim().toLowerCase() === (item.outlet ?? '').trim().toLowerCase();
  return seoMetadata(null, {
    title: sameName || !item.outlet ? item.title : `${item.title}, ${item.outlet}`,
    description: item.description,
    image: item.image?.src,
    path: pathFor(item.slug ?? ''),
    keywords: item.tags,
    type: 'article',
  });
}

export default async function PressPage({ params }: { params: Params }) {
  slot('press-item');
  const item = await resolve(params);
  if (!item) notFound();

  const series = (item.relatedSeries ?? [])
    .map(slug => getSeries(slug))
    .filter((entry): entry is Series => entry !== null);

  return (
    <Container className="flex flex-col gap-10 pt-6 pb-16 md:gap-12 md:pb-24">
      <RecordBreadcrumb parents={[{ href: '/press', label: 'Press' }]} current={item.title} />
      <BreadcrumbJsonLd
        items={[{ name: 'Press', path: '/press' }, { name: item.title, path: pathFor(item.slug ?? '') }]}
      />
      <JsonLd
        data={articleJsonLd({
          origin: siteOrigin(getSettings()),
          path: pathFor(item.slug ?? ''),
          headline: item.title,
          description: item.description,
          image: item.image?.src ?? null,
          datePublished: item.date ?? `${item.year}`,
          authors: item.author ? [item.author] : [],
          publisher: item.outlet,
          section: item.category,
          keywords: item.tags,
        })}
      />

      <PressDetail item={item} />

      {series.length > 0 ? (
        <Section
          title="What it is about"
          description="The work this piece discusses."
          className="py-0 md:py-0"
        >
          <SeriesGrid series={series} />
        </Section>
      ) : null}
    </Container>
  );
}
