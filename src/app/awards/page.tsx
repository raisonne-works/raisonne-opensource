import type { Metadata } from 'next';

import { awardEntries } from '@/components/raisonne/catalogue/entry';
import { CatalogueListPage } from '@/components/raisonne/catalogue/list-page';
import {
  RECORD_VIEWS,
  parseState,
  type CatalogueConfig,
  type RawSearchParams,
} from '@/components/raisonne/catalogue/lib';
import { storedView } from '@/components/raisonne/catalogue/view-cookie';
import { getSiteData } from '@/fixtures';
import { pageMetadata } from '@/lib/seo/metadata';

/**
 * Awards, as cards or as a table. Like the exhibitions list, this one offers
 * those two views only: a prize has a certificate at best, so a gallery wall
 * of them would be a wall of blank frames.
 */

export function generateMetadata(): Metadata {
  const { artist } = getSiteData();
  return pageMetadata('awards', {
    title: 'Awards',
    description: `Awards and recognitions received by ${artist.name}.`,
    path: '/awards',
  });
}

export default async function AwardsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const params = await searchParams;
  const data = getSiteData();

  const config: CatalogueConfig = {
    basePath: '/awards',
    views: RECORD_VIEWS,
    defaultView: 'grid',
    defaultSort: 'newest',
    searchPlaceholder: 'Search awards',
    facets: ['kind', 'year'],
    noun: 'award',
    nounPlural: 'awards',
    empty: {
      title: 'No awards yet',
      description: 'Prizes, shortlists and recognitions appear here once they are added.',
    },
  };

  const state = parseState(params, config, await storedView());

  return (
    <CatalogueListPage
      title="Awards"
      description={`Prizes and recognitions given to ${data.artist.name}, and the work each one was given for.`}
      state={state}
      config={config}
      entries={awardEntries(data)}
    />
  );
}
