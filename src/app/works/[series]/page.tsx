import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ExternalLinkIcon, SearchXIcon } from 'lucide-react';

import { CatalogueToolbar } from '@/components/raisonne/catalogue/catalogue-browser';
import { CatalogueMore } from '@/components/raisonne/catalogue/catalogue-more';
import { CatalogueTable } from '@/components/raisonne/catalogue/catalogue-table';
import { workEntry } from '@/components/raisonne/catalogue/entry';
import { GalleryWall } from '@/components/raisonne/catalogue/gallery-wall';
import {
  ALL_VIEWS,
  buildFacets,
  catalogueHref,
  dailySeed,
  filterEntries,
  isFiltered,
  parseState,
  sortEntries,
  type CatalogueConfig,
} from '@/components/raisonne/catalogue/lib';
import { DropCallout } from '@/components/raisonne/drops/drop-callout';
import { JsonLd } from '@/components/raisonne/seo/json-ld';
import { Container, Section } from '@/components/raisonne/shell/page';
import {
  SERIES_KIND_LABELS,
  contractExplorerUrl,
  decodeParam,
  formatCount,
  hostOf,
  isSingleWorkSeries,
  seriesAboutHref,
  seriesHref,
  seriesTitle,
} from '@/components/raisonne/works/lib';
import { SeriesAbout } from '@/components/raisonne/works/series-about';
import { SeriesHeader } from '@/components/raisonne/works/series-header';
import { SeriesSpecs } from '@/components/raisonne/works/series-specs';
import { SubSeries } from '@/components/raisonne/works/sub-series';
import { WorkDetail } from '@/components/raisonne/works/work-detail';
import { WorkGrid } from '@/components/raisonne/works/work-grid';
import { WorksPagination } from '@/components/raisonne/works/works-pagination';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { EMPTY_BLOCK_CLASS } from '@/components/raisonne/shell/measure';
import { getChildSeries, getDrops, getSeries, getSettings, getSiteData, getWorksForSeries } from '@/fixtures';
import { isModuleEnabled, worksLabel } from '@/lib/records';
import { breadcrumbJsonLd, graph, nftCollectionJsonLd } from '@/lib/seo/json-ld';
import { seoMetadata } from '@/lib/seo/metadata';
import { siteOrigin } from '@/lib/seo/urls';
import { slot } from '@/lib/theme';

type Params = Promise<{ series: string }>;

/**
 * When this page was rendered. Wave 1 ships no list of drops, so a release
 * announced for a series is found here; its state is measured from this.
 */
const RENDERED_AT = Date.now();
type Search = Promise<Record<string, string | string[] | undefined>>;

/** Works per page. Long series are paginated so every work has a page of its own. */
const PAGE_SIZE = 48;

/**
 * Known fixture routes are generated at build time. Hosted tenants mount
 * their fixture at runtime, so additional valid slugs are resolved on demand.
 */
export const dynamicParams = true;

export function generateStaticParams() {
  return getSiteData().series.map(series => ({ series: series.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const series = getSeries(decodeParam((await params).series));
  if (!series) return { title: 'Not found' };
  const title = seriesTitle(series);
  return seoMetadata(series.seo, {
    title,
    description:
      series.description?.slice(0, 200) ??
      `${title}: ${SERIES_KIND_LABELS[series.kind].toLowerCase()}, ${formatCount(series.workCount)} works.`,
    image: series.cover?.still,
    path: seriesHref(series),
    keywords: series.categories,
  });
}

/** Which page of works to show: 1 unless ?page= asks for another one that exists. */
function pageNumber(value: string | string[] | undefined, pages: number): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(raw ?? '1', 10);
  return Number.isFinite(page) && page >= 1 && page <= pages ? page : 1;
}

/**
 * A series: what it is, the chapters it is divided into, the essay behind it,
 * and every work in the family. A chapter with no story of its own shows its
 * parent's, so a visitor who lands on one still reads what it is about.
 */
export default async function SeriesPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  slot('series');
  const slug = decodeParam((await params).series);
  const series = getSeries(slug);
  if (!series) notFound();

  const settings = getSettings();
  const parent = series.parentSlug ? getSeries(series.parentSlug) : null;
  const children = getChildSeries(series.slug);
  const ownWorks = getWorksForSeries(series.slug);
  // A parent shows the whole family: its own works, then each chapter's.
  const works = children.length > 0 ? [...ownWorks, ...children.flatMap(child => getWorksForSeries(child.slug))] : ownWorks;

  // A one of one is one work: show the work itself, not a series page with a grid of one.
  if (isSingleWorkSeries(series, works)) {
    return (
      <Container className="flex flex-col gap-12 pt-6 pb-16 md:pb-24">
        <WorkDetail
          work={works[0]}
          series={series}
          parent={parent}
          liveHtml={settings.liveHtml}
          showOwner={settings.showOwners}
          worksLabel={worksLabel(settings)}
          standalone
        />
      </Container>
    );
  }

  const story = series.story?.length ? series.story : (parent?.story ?? []);
  const inherited = series.story?.length ? null : parent;

  /*
   * The works answer to the same URL state as every list: a search, the
   * facets, an order and a view. Skin zero draws no bar for them here, so a
   * plain visit is the series in its own order, a page at a time, as before;
   * a design that stands the catalogue's bar under the works shows it.
   */
  const config: CatalogueConfig = {
    basePath: seriesHref(series),
    views: ALL_VIEWS,
    defaultView: 'grid',
    defaultSort: 'featured',
    searchPlaceholder: `Search ${seriesTitle(series)}`,
    facets: ['kind', 'medium', 'year', 'chain', 'platform'],
    noun: 'work',
    nounPlural: 'works',
    empty: { title: 'No works yet', description: 'Works appear here once their tokens are imported.' },
  };
  const state = parseState(await searchParams, config);
  const family = new Map([series, ...children].map(each => [each.slug, each]));
  const entries = works.map(work => workEntry(work, family.get(work.seriesSlug)));
  const byKey = new Map(works.map((work, index) => [entries[index].key, work]));
  const matched = filterEntries(entries, state);
  // The default order is the series' own; any other is asked for by name.
  const ordered = state.sort === config.defaultSort ? matched : sortEntries(matched, state.sort, dailySeed());
  const filtered = isFiltered(state);

  const pages = Math.max(1, Math.ceil(ordered.length / PAGE_SIZE));
  const page = pageNumber(String(state.page), pages);
  // A design that grows the list asks for this page through a later one.
  const through = Math.min(Math.max(page, state.through ?? page), pages);
  const shownEntries = ordered.slice((page - 1) * PAGE_SIZE, through * PAGE_SIZE);
  const shown = shownEntries.flatMap(entry => byKey.get(entry.key) ?? []);
  const partial = works.length > 0 && works.length < series.workCount;
  const explorer = contractExplorerUrl(series.chain, series.contract);
  const first = (page - 1) * PAGE_SIZE + 1;
  const last = first + shown.length - 1;

  const origin = siteOrigin(settings);
  // Chapters point at the parent's release, so a drop is one click away from any page in the family.
  const drop = isModuleEnabled(settings, 'drops')
    ? (getDrops().find(item => item.seriesSlug === series.slug) ??
      (parent ? getDrops().find(item => item.seriesSlug === parent.slug) : undefined) ??
      null)
    : null;

  return (
    <Container className="pb-16 md:pb-24">
      <JsonLd
        data={graph(
          nftCollectionJsonLd({ series, origin, path: seriesHref(series), workCount: works.length }),
          breadcrumbJsonLd({
            items: [
              { name: worksLabel(settings), path: '/works' },
              ...(parent ? [{ name: seriesTitle(parent), path: seriesHref(parent) }] : []),
              { name: seriesTitle(series) },
            ],
            origin,
          }),
        )}
      />
      <SeriesHeader
        series={series}
        parent={parent}
        worksLabel={worksLabel(settings)}
        facts={<SeriesSpecs series={series} worksInCatalogue={works.length} />}
      />

      {drop ? <DropCallout drop={drop} now={RENDERED_AT} className="mt-2" /> : null}

      <SubSeries series={children} />

      <SeriesAbout
        story={story}
        inheritedFrom={inherited}
        moreHref={seriesAboutHref(series)}
        specs={<SeriesSpecs series={series} worksInCatalogue={works.length} />}
      />

      <Section
        id="works"
        title="Works"
        description={
          pages > 1
            ? `Works ${formatCount(first)} to ${formatCount(last)} of ${formatCount(ordered.length)} in this catalogue.`
            : children.length > 0 && works.length > 0
              ? `Every work in the family, chapters included.`
              : partial
                ? `This catalogue holds ${formatCount(works.length)} of the ${formatCount(series.workCount)} works on the contract.`
                : undefined
        }
      >
        {state.view === 'table' && shown.length > 0 ? (
          <div data-slot="series-works" data-view="table">
            <CatalogueTable entries={shownEntries} caption="Works in this series" state={state} config={config} />
          </div>
        ) : state.view === 'wall' && shown.length > 0 ? (
          <div data-slot="series-works" data-view="wall">
            <GalleryWall entries={shownEntries} />
          </div>
        ) : (
          <WorkGrid
            works={shown}
            priorityCount={4}
            empty={
              filtered ? (
                <Empty data-slot="series-works" className={EMPTY_BLOCK_CLASS}>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <SearchXIcon />
                    </EmptyMedia>
                    <EmptyTitle>Nothing matches</EmptyTitle>
                    <EmptyDescription>
                      {state.q ? `No works match "${state.q}" with these filters.` : 'No works match these filters.'}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : undefined
            }
          />
        )}
        <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <WorksPagination
            page={page}
            pages={pages}
            hrefFor={target => catalogueHref(config, state, { page: target })}
          />
          {partial && explorer ? (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<a href={explorer} target="_blank" rel="noopener noreferrer" />}
            >
              All {formatCount(series.workCount)} on {hostOf(explorer)}
              <ExternalLinkIcon aria-hidden data-icon="inline-end" />
              <span className="sr-only">(opens in a new tab)</span>
            </Button>
          ) : null}
        </div>
        {/* The catalogue's bar, for the works. Hidden until a design asks for it. */}
        <CatalogueToolbar
          state={state}
          config={config}
          facets={buildFacets(entries, state, config)}
          shown={last}
          total={ordered.length}
          all={entries.length}
          page={page}
          className="hidden"
          data-catalogue-path={config.basePath}
          data-catalogue-view={state.view}
          data-catalogue-series=""
        />
        <CatalogueMore
          href={last < ordered.length ? catalogueHref(config, state, { page, through: through + 1 }) : null}
        />
      </Section>
    </Container>
  );
}
