import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BreadcrumbJsonLd } from '@/components/raisonne/seo/json-ld';
import { Container } from '@/components/raisonne/shell/page';
import { decodeParam, seriesAboutHref, seriesHref, seriesTitle } from '@/components/raisonne/works/lib';
import { SeriesAbout } from '@/components/raisonne/works/series-about';
import { SeriesHero } from '@/components/raisonne/works/series-hero';
import { getChildSeries, getSeries, getSiteData, getWorksForSeries } from '@/fixtures';
import { seoMetadata } from '@/lib/seo/metadata';
import type { Series, StoryBlock } from '@/lib/types';
import { slot } from '@/lib/theme';

type Params = Promise<{ series: string }>;

/**
 * The essay behind a series, on a page of its own so it can be linked to,
 * printed and shared without the grid of works underneath it.
 *
 * A chapter with no story of its own reads its parent's, and says whose it
 * is. A series with no story at all has no page here: the slug 404s rather
 * than answering with an empty essay.
 */
function storyFor(series: Series): { story: StoryBlock[]; inheritedFrom: Series | null } {
  if (series.story?.length) return { story: series.story, inheritedFrom: null };
  const parent = series.parentSlug ? getSeries(series.parentSlug) : null;
  return parent?.story?.length ? { story: parent.story, inheritedFrom: parent } : { story: [], inheritedFrom: null };
}

export const dynamicParams = false;

export function generateStaticParams() {
  return getSiteData()
    .series.filter(series => storyFor(series).story.length > 0)
    .map(series => ({ series: series.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const series = getSeries(decodeParam((await params).series));
  if (!series) return { title: 'Not found' };
  const title = seriesTitle(series);
  return seoMetadata(null, {
    title: `About ${title}`,
    description: series.description?.slice(0, 200) ?? `The story behind ${title}.`,
    image: series.cover?.still,
    path: seriesAboutHref(series),
    type: 'article',
  });
}

export default async function SeriesAboutPage({ params }: { params: Params }) {
  slot('series');
  const slug = decodeParam((await params).series);
  const series = getSeries(slug);
  if (!series) notFound();

  const { story, inheritedFrom } = storyFor(series);
  if (story.length === 0) notFound();

  const parent = series.parentSlug ? getSeries(series.parentSlug) : null;
  const children = getChildSeries(series.slug);
  const works =
    getWorksForSeries(series.slug).length +
    children.reduce((sum, child) => sum + getWorksForSeries(child.slug).length, 0);

  return (
    <Container className="pb-16 md:pb-24">
      <BreadcrumbJsonLd
        items={[
          { name: 'Works', path: '/works' },
          ...(parent ? [{ name: seriesTitle(parent), path: seriesHref(parent) }] : []),
          { name: seriesTitle(series), path: seriesHref(series) },
          { name: 'About' },
        ]}
      />
      <SeriesHero series={series} parent={parent} workCount={works} />
      <SeriesAbout story={story} inheritedFrom={inheritedFrom} title={null} id="story" />
    </Container>
  );
}
