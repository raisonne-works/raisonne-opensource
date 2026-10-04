import type { Metadata } from 'next';

import { installationEntries, scopeByType } from '@/components/raisonne/catalogue/entry';
import { CatalogueListPage } from '@/components/raisonne/catalogue/list-page';
import {
  ALL_VIEWS,
  parseState,
  type CatalogueConfig,
  type RawSearchParams,
} from '@/components/raisonne/catalogue/lib';
import { storedView } from '@/components/raisonne/catalogue/view-cookie';
import { getSiteData } from '@/fixtures';
import { pageMetadata } from '@/lib/seo/metadata';
import { slot } from '@/lib/theme';

/**
 * Installations and immersive experiences in one list, the way an artist
 * thinks of them: both are works made for a place rather than for a screen.
 * The type facet separates them for anyone who wants only one.
 */

export function generateMetadata(): Metadata {
  const { artist } = getSiteData();
  return pageMetadata('installations', {
    title: 'Installations',
    description: `Installations and immersive experiences by ${artist.name}.`,
    path: '/installations',
  });
}

export default async function InstallationsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  slot('installations');
  const params = await searchParams;
  const data = getSiteData();
  const all = installationEntries(data);

  const types: NonNullable<CatalogueConfig['typeOptions']> = [
    { value: 'installation', label: 'Installations', count: data.installations.length },
    { value: 'immersive', label: 'Immersive experiences', count: data.immersives.length },
  ];

  const base: CatalogueConfig = {
    basePath: '/installations',
    views: ALL_VIEWS,
    defaultView: 'grid',
    defaultSort: 'featured',
    searchPlaceholder: 'Search installations',
    facets: ['type', 'medium', 'year'],
    noun: 'installation',
    nounPlural: 'installations',
    empty: {
      title: 'No installations yet',
      description:
        'Works made for a room, and the immersive experiences with them, appear here once the artist adds one.',
    },
    typeOptions: types.filter(option => option.count > 0),
  };

  const state = parseState(params, base, await storedView());

  return (
    <CatalogueListPage
      title="Installations"
      description={`Works by ${data.artist.name} made for a place: projections, rooms and immersive experiences, with the documentation of each one.`}
      state={state}
      config={base}
      entries={scopeByType(all, state.type)}
    />
  );
}
