import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { JsonLd } from '@/components/raisonne/seo/json-ld';
import { Container } from '@/components/raisonne/shell/page';
import {
  decodeParam,
  isSingleWorkSeries,
  seriesHref,
  seriesTitle,
  workHref,
  workTitle,
} from '@/components/raisonne/works/lib';
import { WorkDetail } from '@/components/raisonne/works/work-detail';
import { WorkPager } from '@/components/raisonne/works/work-pager';
import { getArtist, getSeries, getSettings, getSiteData, getWork, getWorksForSeries } from '@/fixtures';
import { plainText } from '@/lib/markdown';
import { worksLabel } from '@/lib/records';
import { breadcrumbJsonLd, graph, visualArtworkJsonLd } from '@/lib/seo/json-ld';
import { seoMetadata } from '@/lib/seo/metadata';
import { siteOrigin } from '@/lib/seo/urls';
import { slot } from '@/lib/theme';

type Params = Promise<{ series: string; token: string }>;

async function resolve(params: Params) {
  const raw = await params;
  const seriesSlug = decodeParam(raw.series);
  const series = getSeries(seriesSlug);
  const work = series ? (getWork(series.slug, decodeParam(raw.token)) ?? getWork(series.slug, raw.token)) : null;
  return { series, work };
}

/**
 * Known fixture routes are generated at build time. Hosted tenants mount
 * their fixture at runtime, so additional valid slugs are resolved on demand.
 */
export const dynamicParams = true;

export function generateStaticParams() {
  return getSiteData().works.map(work => ({ series: work.seriesSlug, token: work.tokenId }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { series, work } = await resolve(params);
  if (!series || !work) return { title: 'Not found' };
  const title = workTitle(work);
  // A share card holds characters, not markdown, so the token's own text has
  // its markup taken off rather than resolved.
  const summary = plainText(work.description);
  return seoMetadata(null, {
    title: `${title}, ${seriesTitle(series)}`,
    description: summary?.slice(0, 200) ?? `${title} from ${seriesTitle(series)}.`,
    image: work.media.still,
    path: workHref(work),
    keywords: work.categories,
  });
}

export default async function WorkPage({ params }: { params: Params }) {
  slot('work');
  const { series, work } = await resolve(params);
  if (!series || !work) notFound();

  const settings = getSettings();
  const parent = series.parentSlug ? getSeries(series.parentSlug) : null;
  const siblings = getWorksForSeries(series.slug);
  const index = siblings.findIndex(item => item.id === work.id);
  const previous = index > 0 ? siblings[index - 1] : null;
  const next = index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null;

  const origin = siteOrigin(settings);
  const path = workHref(work);

  return (
    <Container className="flex flex-col gap-12 pt-6 pb-16 md:pb-24">
      <JsonLd
        data={graph(
          visualArtworkJsonLd({ work, series, artist: getArtist(), origin, path }),
          breadcrumbJsonLd({
            items: [
              { name: worksLabel(settings), path: '/works' },
              ...(parent ? [{ name: seriesTitle(parent), path: seriesHref(parent) }] : []),
              { name: seriesTitle(series), path: seriesHref(series) },
              { name: workTitle(work) },
            ],
            origin,
          }),
        )}
      />
      <WorkDetail
        work={work}
        series={series}
        parent={parent}
        liveHtml={settings.liveHtml}
        showOwner={settings.showOwners}
        worksLabel={worksLabel(settings)}
        standalone={isSingleWorkSeries(series, siblings)}
      />
      <WorkPager previous={previous} next={next} />
    </Container>
  );
}
