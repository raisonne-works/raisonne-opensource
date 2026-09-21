import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { writingEntries } from '@/components/raisonne/catalogue/entry';
import { CatalogueListPage } from '@/components/raisonne/catalogue/list-page';
import { parseState, type CatalogueConfig, type RawSearchParams, type ViewId } from '@/components/raisonne/catalogue/lib';
import { storedView } from '@/components/raisonne/catalogue/view-cookie';
import { getSiteData } from '@/fixtures';
import { isModuleEnabled } from '@/lib/records';
import { NO_INDEX, pageMetadata } from '@/lib/seo/metadata';

/**
 * Papers and essays by the artist. An optional module: an install that
 * publishes none switches it off and the route answers 404 rather than
 * showing an empty shelf in the navigation.
 *
 * Writings are read rather than looked at, so the list offers the grid and
 * the table and leaves the wall to the artworks.
 */

const WRITING_VIEWS: ViewId[] = ['grid', 'table'];

export function generateMetadata(): Metadata {
  const data = getSiteData();
  // With the module off the route is a 404, so it should not carry the
  // section's own title and description into the tab and into a share card.
  if (!isModuleEnabled(data.settings, 'writings')) return { title: 'Not found', robots: NO_INDEX };
  return pageMetadata('writings', {
    title: 'Writings',
    description: `Papers and essays by ${data.artist.name}.`,
    path: '/writings',
  });
}

export default async function WritingsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const params = await searchParams;
  const data = getSiteData();
  if (!isModuleEnabled(data.settings, 'writings')) notFound();

  const config: CatalogueConfig = {
    basePath: '/writings',
    views: WRITING_VIEWS,
    defaultView: 'grid',
    defaultSort: 'newest',
    searchPlaceholder: 'Search writings',
    facets: ['kind', 'year'],
    noun: 'writing',
    nounPlural: 'writings',
    empty: {
      title: 'Nothing published yet',
      description: 'Papers, essays and talks by the artist appear here once one is published.',
    },
  };

  const state = parseState(params, config, await storedView());

  return (
    <CatalogueListPage
      title="Writings"
      description={`Papers, essays and talks by ${data.artist.name}, with their abstracts and, where the licence allows it, the full text.`}
      state={state}
      config={config}
      entries={writingEntries(data)}
    />
  );
}
