import type { Metadata } from 'next';

import { collaborationEntries } from '@/components/raisonne/catalogue/entry';
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

/** Projects made with brands, institutions and other artists. */

export function generateMetadata(): Metadata {
  const { artist } = getSiteData();
  return pageMetadata('collaborations', {
    title: 'Collaborations',
    description: `Brand, institution and licensing projects by ${artist.name}.`,
    path: '/collaborations',
  });
}

export default async function CollaborationsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  slot('collaborations');
  const params = await searchParams;
  const data = getSiteData();

  const config: CatalogueConfig = {
    basePath: '/collaborations',
    views: ALL_VIEWS,
    defaultView: 'grid',
    defaultSort: 'featured',
    searchPlaceholder: 'Search collaborations',
    facets: ['kind', 'year'],
    noun: 'collaboration',
    nounPlural: 'collaborations',
    empty: {
      title: 'No collaborations yet',
      description: 'Projects made with brands, institutions and other artists appear here once they are added.',
    },
  };

  const state = parseState(params, config, await storedView());

  return (
    <CatalogueListPage
      title="Collaborations"
      description={`Projects ${data.artist.name} made with others: who was involved, what was made, and where it went.`}
      state={state}
      config={config}
      entries={collaborationEntries(data)}
    />
  );
}
