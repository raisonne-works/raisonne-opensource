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
 * Immersive: installations and immersive experiences in one list, the way an
 * artist thinks of them. Both are works made for a place rather than for a
 * screen, and both collections are read here. The type facet separates them
 * for anyone who wants only one. The old address, /installations, redirects
 * here (next.config.ts).
 */

export function generateMetadata(): Metadata {
  const { artist } = getSiteData();
  return pageMetadata('installations', {
    title: 'Immersive',
    description: `Immersive experiences and installations by ${artist.name}.`,
    path: '/immersive',
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
    basePath: '/immersive',
    views: ALL_VIEWS,
    defaultView: 'grid',
    defaultSort: 'featured',
    searchPlaceholder: 'Search immersive works',
    facets: ['type', 'medium', 'year'],
    noun: 'immersive work',
    nounPlural: 'immersive works',
    empty: {
      title: 'No immersive works yet',
      description:
        'Immersive experiences, and the installations made for a room, appear here once the artist adds one.',
    },
    typeOptions: types.filter(option => option.count > 0),
  };

  const state = parseState(params, base, await storedView());

  return (
    <CatalogueListPage
      title="Immersive"
      description={`Works by ${data.artist.name} made for a place: immersive experiences, installations, projections and rooms, with the documentation of each one.`}
      state={state}
      config={base}
      entries={scopeByType(all, state.type)}
    />
  );
}
