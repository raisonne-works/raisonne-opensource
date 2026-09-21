import type { ReactNode } from 'react';

import { CatalogueBrowser, CatalogueBrowserSkeleton } from '@/components/raisonne/catalogue/catalogue-browser';
import { CatalogueCard, CatalogueCardSkeleton } from '@/components/raisonne/catalogue/catalogue-card';
import { CatalogueSections } from '@/components/raisonne/catalogue/catalogue-sections';
import { CatalogueTable, CatalogueTableSkeleton } from '@/components/raisonne/catalogue/catalogue-table';
import {
  awardEntries,
  exhibitionEntries,
  indexEntries,
  installationEntries,
  seriesEntries,
  workEntries,
  type CatalogueEntry,
} from '@/components/raisonne/catalogue/entry';
import { ActiveFilters, CatalogueFacets } from '@/components/raisonne/catalogue/facets';
import { GalleryWall } from '@/components/raisonne/catalogue/gallery-wall';
import {
  ALL_VIEWS,
  PAGE_SIZE,
  RECORD_VIEWS,
  buildFacets,
  type CatalogueConfig,
  type CatalogueState,
} from '@/components/raisonne/catalogue/lib';
import { CataloguePagination } from '@/components/raisonne/catalogue/catalogue-pagination';
import { CatalogueSearch } from '@/components/raisonne/catalogue/search-bar';
import { SortMenu } from '@/components/raisonne/catalogue/sort-menu';
import { ViewToggle } from '@/components/raisonne/catalogue/view-toggle';
import { Section } from '@/components/raisonne/shell/page';
import { getSiteData } from '@/fixtures';

import { Specimen, SpecimenGrid } from '../_foundations/specimen';

export const CATALOGUE_TOPICS = [
  { id: 'catalogue-card', label: 'Cards' },
  { id: 'catalogue-controls', label: 'Search, sort and facets' },
  { id: 'catalogue-views', label: 'Table and wall' },
  { id: 'catalogue-sections', label: 'Sections' },
  { id: 'catalogue-states', label: 'Empty and loading' },
] as const;

/** Sections sit under a sticky bar on phones, and only under the header from lg. */
const SUBSECTION_CLASS = 'scroll-mt-28 lg:scroll-mt-20';

/**
 * The browsing layer, live, with this install's own records.
 *
 * The controls here are real: they are links and a GET form, and they point
 * at this page rather than at a list, so clicking one only reloads the
 * design system. That is the point of the design: the whole state of a list
 * is a URL, which is why a filtered view can be shared and why the server
 * can send back one page of rows instead of the whole catalogue.
 */
export function CatalogueSection() {
  const data = getSiteData();

  const demoState: CatalogueState = {
    q: '',
    type: null,
    kind: [],
    chain: [],
    year: [],
    medium: [],
    platform: [],
    sort: 'featured',
    view: 'grid',
    page: 1,
  };

  const demoConfig: CatalogueConfig = {
    basePath: '/design-system',
    views: ALL_VIEWS,
    defaultView: 'grid',
    defaultSort: 'featured',
    searchPlaceholder: 'Search the catalogue',
    facets: ['type', 'kind', 'medium', 'year', 'chain', 'platform'],
    noun: 'record',
    nounPlural: 'records',
    empty: { title: 'The catalogue is empty', description: 'Records appear here once they are imported or added.' },
  };

  const everything = indexEntries(data, null);
  const series = seriesEntries(data);
  const works = workEntries(data);
  const shows = exhibitionEntries(data);
  const awards = awardEntries(data);
  const installations = installationEntries(data);

  const cards = [series[0], works.find(entry => entry.media?.still), shows[0], awards[0], installations[0]].filter(
    (entry): entry is CatalogueEntry => Boolean(entry),
  );

  const filteredState: CatalogueState = { ...demoState, q: 'light', year: ['2025'] };
  const facets = buildFacets(everything, demoState, demoConfig);

  if (cards.length === 0) {
    return (
      <p className="py-10 text-sm text-muted-foreground">
        This install has no records yet, so the catalogue has nothing to show here.
      </p>
    );
  }

  return (
    <div className="flex flex-col">
      <Section
        id="catalogue-card"
        headingLevel={3}
        title="Cards"
        className={SUBSECTION_CLASS}
        description="One card for every kind of record, so a mixed index reads as one list. The whole tile is a single link; the controls that sit on the image stay reachable by keyboard."
      >
        <SpecimenGrid>
          <Specimen
            title="CatalogueCard"
            source="raisonne/catalogue/catalogue-card"
            span="full"
            stageClassName="block"
            note="Enlarge and copy the contract appear on hover and on focus, and are always there on touch. A series shows a second image on hover. Interactive works say so and are never run in a grid."
          >
            <Grid>
              {cards.map(entry => (
                <State key={entry.key} label={entry.typeLabel}>
                  <CatalogueCard entry={entry} showType sizes="(min-width: 1536px) 14vw, (min-width: 768px) 30vw, 45vw" />
                </State>
              ))}
              <State label="Loading">
                <CatalogueCardSkeleton />
              </State>
            </Grid>
          </Specimen>

          <Specimen
            title="Densities"
            source="raisonne/catalogue/catalogue-card"
            span="full"
            stageClassName="block"
            note="Three densities of the same card: the grid with its caption, the dense grid with one line, and the contact sheet, where the image is the whole point and the title is read out instead."
          >
            <Grid>
              <State label="grid">
                <CatalogueCard entry={cards[0]} sizes="30vw" />
              </State>
              <State label="dense">
                <CatalogueCard entry={cards[0]} density="dense" sizes="30vw" />
              </State>
              <State label="sheet">
                <CatalogueCard entry={cards[0]} density="sheet" sizes="30vw" />
              </State>
            </Grid>
          </Specimen>
        </SpecimenGrid>
      </Section>

      <Section
        id="catalogue-controls"
        headingLevel={3}
        title="Search, sort and facets"
        className={SUBSECTION_CLASS}
        description="Every control writes to the URL. The search is a real GET form, so it works before any JavaScript arrives; the rest are links, so they can be opened in a new tab and followed by a crawler."
      >
        <SpecimenGrid>
          <Specimen
            title="CatalogueSearch"
            source="raisonne/catalogue/search-bar"
            span={2}
            note="Typing replaces the URL after a short pause rather than reloading the page. The other filters ride along as hidden fields."
          >
            <CatalogueSearch state={demoState} config={demoConfig} />
          </Specimen>

          <Specimen title="SortMenu" source="raisonne/catalogue/sort-menu" note="Featured records lead every order.">
            <SortMenu state={demoState} config={demoConfig} />
          </Specimen>

          <Specimen
            title="CatalogueFacets"
            source="raisonne/catalogue/facets"
            note="Each value carries the number of records it would leave, counted against the other filters. A facet with one value is not shown."
          >
            <CatalogueFacets facets={facets} state={demoState} config={demoConfig} />
          </Specimen>

          <Specimen
            title="ViewToggle"
            source="raisonne/catalogue/view-toggle"
            note="A list declares which of the five views it offers. The choice is in the URL and remembered for the visitor in a cookie, so the server can render their view first."
          >
            <div className="flex flex-col gap-3">
              <ViewToggle state={demoState} config={demoConfig} />
              <ViewToggle state={demoState} config={{ ...demoConfig, views: RECORD_VIEWS }} />
            </div>
          </Specimen>

          <Specimen
            title="ActiveFilters"
            source="raisonne/catalogue/facets"
            span={2}
            note="What is narrowing the list, each chip a link that takes one filter off."
          >
            <ActiveFilters state={filteredState} config={demoConfig} />
          </Specimen>

          <Specimen
            title="CataloguePagination"
            source="raisonne/catalogue/catalogue-pagination"
            span={2}
            note="Pages of 24, each its own ?page= URL, so a position in the catalogue can be shared, cited and crawled, and one request always costs one page. The series pages use the same control."
          >
            <CataloguePagination state={demoState} config={demoConfig} total={PAGE_SIZE * 4} anchorId="catalogue-controls" />
          </Specimen>
        </SpecimenGrid>
      </Section>

      <Section
        id="catalogue-views"
        headingLevel={3}
        title="Table and wall"
        className={SUBSECTION_CLASS}
        description="The same records read two other ways: as rows of facts, and as one work at a time."
      >
        <SpecimenGrid>
          <Specimen
            title="CatalogueTable"
            source="raisonne/catalogue/catalogue-table"
            span="full"
            stageClassName="block overflow-x-auto"
            note="The image is one hover away rather than always on screen. A contract copies with one click and links to its own chain's explorer, never to a hardcoded one."
          >
            <CatalogueTable entries={everything.slice(0, 6)} showType caption="A sample of the catalogue" />
          </Specimen>

          <Specimen
            title="GalleryWall"
            source="raisonne/catalogue/gallery-wall"
            span="full"
            stageClassName="block"
            note="Hung in a line that runs sideways, each work snapping to the middle. It scrolls with the wheel, a swipe, the buttons or the keyboard, and nothing animates when the visitor asks for less motion."
          >
            <GalleryWall entries={(works.length > 0 ? works : everything).slice(0, 6)} />
          </Specimen>

          <Specimen
            title="CatalogueBrowser"
            source="raisonne/catalogue/catalogue-browser"
            span="full"
            stageClassName="block"
            note="The whole thing: controls, counter, the page of rows and the way to more. It runs on the server, so a catalogue of thousands of works costs a page of cards."
          >
            <CatalogueBrowser
              entries={everything}
              state={demoState}
              config={{ ...demoConfig, groupBy: null }}
              id="catalogue-browser-demo"
              headingLevel={4}
            />
          </Specimen>
        </SpecimenGrid>
      </Section>

      <Section
        id="catalogue-sections"
        headingLevel={3}
        title="Sections"
        className={SUBSECTION_CLASS}
        description="The index's own contents page, and the home page's map of the catalogue."
      >
        <Specimen
          title="CatalogueSections"
          source="raisonne/catalogue/catalogue-sections"
          span="full"
          stageClassName="block"
          note="One tile per kind of record this install actually holds, each with its live count and a cover taken from its own records. An empty section is not shown at all."
        >
          <CatalogueSections data={data} />
        </Specimen>
      </Section>

      <Section
        id="catalogue-states"
        headingLevel={3}
        title="Empty and loading"
        className={SUBSECTION_CLASS}
        description="Every list has three states besides the full one: nothing yet, nothing matching, and not loaded."
      >
        <SpecimenGrid>
          <Specimen
            title="Nothing yet"
            source="raisonne/catalogue/catalogue-browser"
            span={2}
            stageClassName="block"
            note="A list with no records says what would appear there, in the words of that list."
          >
            <CatalogueBrowser
              entries={[]}
              state={demoState}
              config={{
                ...demoConfig,
                empty: {
                  title: 'No installations yet',
                  description: 'Works made for a room, and the immersive experiences with them, appear here.',
                },
              }}
              id="catalogue-empty-demo"
            />
          </Specimen>

          <Specimen
            title="Nothing matches"
            source="raisonne/catalogue/catalogue-browser"
            span={2}
            stageClassName="block"
            note="A filter that matches nothing names what was searched for and offers the way back."
          >
            <CatalogueBrowser
              entries={everything}
              state={{ ...demoState, q: 'a phrase that matches nothing' }}
              config={demoConfig}
              id="catalogue-nomatch-demo"
            />
          </Specimen>

          <Specimen
            title="Loading"
            source="raisonne/catalogue/catalogue-browser"
            span="full"
            stageClassName="block"
            note="The route's loading.tsx renders this, so the controls and the grid keep their places while the page arrives and nothing jumps when it does."
          >
            <CatalogueBrowserSkeleton count={6} />
          </Specimen>

          <Specimen
            title="Table loading"
            source="raisonne/catalogue/catalogue-table"
            span="full"
            stageClassName="block"
          >
            <CatalogueTableSkeleton rows={4} />
          </Specimen>
        </SpecimenGrid>
      </Section>
    </div>
  );
}

/** A row of small states inside one specimen. */
function Grid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3 2xl:grid-cols-4">{children}</div>;
}

function State({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
