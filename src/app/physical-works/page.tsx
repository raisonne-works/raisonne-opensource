import type { Metadata } from 'next';

import { physicalWorkEntries } from '@/components/raisonne/catalogue/entry';
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

/** Physical and phygital works: the ones that exist as objects. */

export function generateMetadata(): Metadata {
  const { artist } = getSiteData();
  return pageMetadata('physical-works', {
    title: 'Physical works',
    description: `Physical and phygital works by ${artist.name}.`,
    path: '/physical-works',
  });
}

export default async function PhysicalWorksPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const params = await searchParams;
  const data = getSiteData();

  const config: CatalogueConfig = {
    basePath: '/physical-works',
    views: ALL_VIEWS,
    defaultView: 'grid',
    defaultSort: 'featured',
    searchPlaceholder: 'Search physical works',
    facets: ['medium', 'year'],
    noun: 'physical work',
    nounPlural: 'physical works',
    empty: {
      title: 'No physical works yet',
      description:
        'Prints, tapestries, sculptures and other objects, with the digital works they come from, appear here once the artist adds one.',
    },
  };

  const state = parseState(params, config, await storedView());

  return (
    <CatalogueListPage
      title="Physical works"
      description={`Works by ${data.artist.name} that exist as objects: what each one is made of, how large it is, and the digital work behind it.`}
      state={state}
      config={config}
      entries={physicalWorkEntries(data)}
    />
  );
}
