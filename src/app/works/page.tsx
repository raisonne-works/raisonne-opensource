import type { Metadata } from 'next';

import { CatalogueBrowser } from '@/components/raisonne/catalogue/catalogue-browser';
import { CatalogueSections } from '@/components/raisonne/catalogue/catalogue-sections';
import { ONE_OF_ONE_TYPE, indexEntries, sectionCounts, type CatalogueTypeFilter } from '@/components/raisonne/catalogue/entry';
import {
  ALL_VIEWS,
  isFiltered,
  parseState,
  type CatalogueConfig,
  type RawSearchParams,
} from '@/components/raisonne/catalogue/lib';
import { packDefaultView, storedView } from '@/components/raisonne/catalogue/view-cookie';
import { Container, PageHeader, Section } from '@/components/raisonne/shell/page';
import { getSiteData } from '@/fixtures';
import { formatCount } from '@/components/raisonne/works/lib';
import { catalogueCounts, isModuleEnabled, worksLabel } from '@/lib/records';
import type { SiteData } from '@/lib/types';
import { pageMetadata } from '@/lib/seo/metadata';
import { slot } from '@/lib/theme';

/**
 * The whole catalogue in one index: every kind of record, searchable,
 * sortable and filterable, in whichever of the five views the visitor picks.
 *
 * Works are grouped under their series by default, because 29 series can be
 * read and 4,031 tokens cannot. Choosing the Works or the One of ones
 * section lists the tokens themselves, so nothing is hidden, and the choice
 * is in the URL like every other filter.
 */

export function generateMetadata(): Metadata {
  const { artist, settings } = getSiteData();
  return pageMetadata('works', {
    title: worksLabel(settings),
    description: `The catalogue of ${artist.name}: series, works, installations, shows, collaborations and awards.`,
    path: '/works',
  });
}

/** The sections the type filter offers, in reading order, empty ones left out. */
function typeOptions(data: SiteData): { value: CatalogueTypeFilter | ''; label: string; count: number }[] {
  const counts = sectionCounts(data);
  const options: { value: CatalogueTypeFilter; label: string; module?: 'writings' | 'drops' }[] = [
    { value: 'series', label: 'Series' },
    { value: 'work', label: worksLabel(data.settings) },
    { value: ONE_OF_ONE_TYPE, label: 'One of ones' },
    { value: 'installation', label: 'Installations' },
    { value: 'physical-work', label: 'Physical works' },
    { value: 'exhibition', label: 'Exhibitions' },
    { value: 'collaboration', label: 'Collaborations' },
    { value: 'award', label: 'Awards' },
    { value: 'writing', label: 'Writings', module: 'writings' },
    { value: 'drop', label: 'Drops', module: 'drops' },
  ];

  return options
    .filter(option => !option.module || isModuleEnabled(data.settings, option.module))
    .map(option => ({ value: option.value, label: option.label, count: counts[option.value] ?? 0 }))
    .filter(option => option.count > 0);
}

export default async function WorksPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  slot('works');
  const params = await searchParams;
  const data = getSiteData();

  const base: CatalogueConfig = {
    basePath: '/works',
    views: ALL_VIEWS,
    // The whole index may open another way in a pack; a section of it keeps the grid.
    defaultView: params.type ? 'grid' : packDefaultView('index', ALL_VIEWS, 'grid'),
    defaultSort: 'featured',
    searchPlaceholder: 'Search the catalogue',
    facets: ['type', 'kind', 'medium', 'year', 'chain', 'platform'],
    noun: 'catalogue entry',
    nounPlural: 'catalogue entries',
    empty: {
      title: 'The catalogue is empty',
      description: 'Series, works, installations, shows and awards appear here once they are imported or added.',
    },
    typeOptions: typeOptions(data),
  };

  const state = parseState(params, base, await storedView());
  const listsTokens = state.type === 'work' || state.type === ONE_OF_ONE_TYPE;
  const section = base.typeOptions?.find(option => option.value === state.type);

  const config: CatalogueConfig = {
    ...base,
    noun: listsTokens ? 'work' : 'catalogue entry',
    nounPlural: listsTokens ? 'works' : 'catalogue entries',
    searchPlaceholder: section ? `Search ${section.label.toLowerCase()}` : 'Search the catalogue',
    // The index reads as sections until a search or an order says otherwise.
    groupBy: state.type === null ? 'type' : null,
  };

  const entries = indexEntries(data, state.type);
  const counts = catalogueCounts(data);
  const { artist } = data;
  const label = worksLabel(data.settings);

  return (
    <Container className="pb-16 md:pb-24">
      <PageHeader
        title={label}
        description={`Everything in the catalogue of ${artist.name}, attributed from the chain itself: series and single works, and the shows, installations and projects around them.`}
      />

      {state.type === null && !isFiltered(state) ? (
        <Section
          title="The catalogue"
          description="Each part of the catalogue, with what it holds today. Pick one, or search everything below."
        >
          <CatalogueSections data={data} />
        </Section>
      ) : null}

      <Section
        title={section?.label ?? 'Everything in the catalogue'}
        headingLevel={2}
        className="pt-2"
        description={
          state.type === null
            ? `A series is one entry here, with its works inside it: ${formatCount(counts.works)} works in ${formatCount(counts.series)} series. Pick ${label} above to list every token on its own.`
            : undefined
        }
      >
        <CatalogueBrowser entries={entries} state={state} config={config} id="catalogue" headingLevel={2} />
      </Section>
    </Container>
  );
}
