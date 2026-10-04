import type { Metadata } from 'next';

import { exhibitionEntries } from '@/components/raisonne/catalogue/entry';
import { ExhibitionHistory } from '@/components/raisonne/catalogue/exhibition-history';
import { CatalogueListPage } from '@/components/raisonne/catalogue/list-page';
import {
  RECORD_VIEWS,
  parseState,
  type CatalogueConfig,
  type RawSearchParams,
} from '@/components/raisonne/catalogue/lib';
import { storedView } from '@/components/raisonne/catalogue/view-cookie';
import { Section } from '@/components/raisonne/shell/page';
import { getExhibitions, getSiteData } from '@/fixtures';
import { pageMetadata } from '@/lib/seo/metadata';
import { slot } from '@/lib/theme';

/**
 * Two lists, and no show twice in either: the searchable grid of the shows
 * the artist leads with, and the history grouped by kind for anyone writing a
 * biography or checking a date.
 *
 * When the artist features some shows, the grid holds those and the history
 * holds the CV lines. A CV line is a year, a title and a place, with no
 * picture and no page, so as a card it is an empty frame, and a title shown
 * at three venues read as one show repeated. A featured show that has a CV
 * line of its own is in both lists, once in each. With nothing featured, both
 * lists hold every show.
 *
 * There is no separate band of featured cards above the grid. It repeated
 * the same three shows the grid already opened with, so the page rendered
 * Timeless, Sikka and Excavating EX Machina three times each.
 *
 * A wall or a contact sheet of exhibition photographs would say nothing, so
 * this list offers the grid and the table only.
 */

export function generateMetadata(): Metadata {
  const { artist } = getSiteData();
  return pageMetadata('exhibitions', {
    title: 'Exhibitions',
    description: `Solo and group exhibitions, biennales, festivals and fairs by ${artist.name}.`,
    path: '/exhibitions',
  });
}

export default async function ExhibitionsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  slot('exhibitions');
  const params = await searchParams;
  const data = getSiteData();
  const exhibitions = getExhibitions();
  const curated = exhibitions.some(show => show.featured);
  const history = curated ? exhibitions.filter(show => show.history !== false) : exhibitions;
  const entries = exhibitionEntries(data).filter(entry => !curated || entry.featured);

  const config: CatalogueConfig = {
    basePath: '/exhibitions',
    views: RECORD_VIEWS,
    defaultView: 'grid',
    defaultSort: 'featured',
    searchPlaceholder: 'Search exhibitions',
    facets: ['kind', 'year'],
    noun: 'exhibition',
    nounPlural: 'exhibitions',
    empty: {
      title: 'No exhibitions yet',
      description: 'Solo and group shows, biennales, festivals and fairs appear here once they are added.',
    },
    markFeatured: true,
  };

  const state = parseState(params, config, await storedView());

  return (
    <CatalogueListPage
      title="Exhibitions"
      description={`Where the work of ${data.artist.name} has been shown: solo and group exhibitions, biennales, festivals and fairs.`}
      state={state}
      config={config}
      entries={entries}
      after={
        history.length > 0 ? (
          <Section
            id="history"
            title="The full history"
            description="Every show on record, grouped by kind and newest first."
          >
            <ExhibitionHistory exhibitions={history} headingLevel={3} />
          </Section>
        ) : null
      }
    />
  );
}
