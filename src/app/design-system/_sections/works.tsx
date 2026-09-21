import type { ReactNode } from 'react';

import { AddToCalendar } from '@/components/raisonne/drops/add-to-calendar';
import { DropCallout } from '@/components/raisonne/drops/drop-callout';
import { DropCountdown } from '@/components/raisonne/drops/countdown';
import { DropPhases } from '@/components/raisonne/drops/drop-phases';
import { DropSpecs } from '@/components/raisonne/drops/drop-specs';
import { NotifyDialog } from '@/components/raisonne/drops/notify-dialog';
import { Section } from '@/components/raisonne/shell/page';
import { ChainBadge } from '@/components/raisonne/works/chain-badge';
import { EvidenceBadges } from '@/components/raisonne/works/evidence-badges';
import { hostOf, seriesAboutHref, seriesHref, workHref } from '@/components/raisonne/works/lib';
import { LiveHtmlFrame } from '@/components/raisonne/works/live-html-frame';
import { MediaStill } from '@/components/raisonne/works/media-still';
import { MediaErrorAlert } from '@/components/raisonne/works/media-viewer';
import { SeriesAbout } from '@/components/raisonne/works/series-about';
import { SeriesCard, SeriesCardSkeleton } from '@/components/raisonne/works/series-card';
import { SeriesGrid, SeriesGridSkeleton } from '@/components/raisonne/works/series-grid';
import { SeriesHeader, SeriesHeaderSkeleton } from '@/components/raisonne/works/series-header';
import { SeriesHero, SeriesHeroSkeleton } from '@/components/raisonne/works/series-hero';
import { SeriesSpecs } from '@/components/raisonne/works/series-specs';
import { SubSeries } from '@/components/raisonne/works/sub-series';
import { WorkAttributes } from '@/components/raisonne/works/work-attributes';
import { WorkCard, WorkCardSkeleton } from '@/components/raisonne/works/work-card';
import { WorkDetail, WorkDetailSkeleton } from '@/components/raisonne/works/work-detail';
import { WorkFacts } from '@/components/raisonne/works/work-facts';
import { WorkGrid, WorkGridSkeleton } from '@/components/raisonne/works/work-grid';
import { WorkPager } from '@/components/raisonne/works/work-pager';
import { WorkTags } from '@/components/raisonne/works/work-tags';
import { getSiteData } from '@/fixtures';
import type { Chain, Drop, Evidence, Media, Series, SiteData, Work } from '@/lib/types';

import { Specimen, SpecimenGrid } from '../_foundations/specimen';
import { MediaViewerDemo } from './works-viewer-demo';

const NO_MEDIA: Media = { kind: 'unknown', still: null, full: null, animation: null, width: null, height: null };

/** Where synthetic samples link: they are variations of real records, so they have no page of their own. */
const SAMPLE_HREF = '#works-cards';

const ALL_CHAINS: Chain[] = ['ethereum', 'base', 'tezos', 'bitcoin', 'solana'];

const ALL_SIGNALS: Evidence[] = [
  { signal: 'deployer', detail: 'deployed by 0x1a2b…9f0e' },
  { signal: 'owner', detail: 'owner() = 0x1a2b…9f0e' },
  { signal: 'ownership-log', detail: 'OwnershipTransferred to 0x1a2b…9f0e' },
  { signal: 'token-creator', detail: 'tokenCreator(id) = 0x1a2b…9f0e on 12 tokens' },
  { signal: 'storefront-decode', detail: 'tokenId >> 96 = 0x1a2b…9f0e on 4 tokens' },
  { signal: 'minted-to', detail: 'minted to 0x1a2b…9f0e' },
];

interface Sample<T> {
  label: string;
  item: T;
  href: string;
}

const DAY = 24 * 60 * 60 * 1000;

/** When this page was rendered: the sample countdowns are measured from it. */
const RENDERED_AT = Date.now();

/**
 * A release to show the drop components with, for an install that has none
 * announced. Everything in it is placeholder copy, and it links nowhere.
 */
const SAMPLE_DROP: Drop = {
  slug: 'sample-release',
  title: 'Sample release',
  subtitle: 'A placeholder announcement, for this page only',
  description: 'Placeholder copy for the design system. Real drops come from the site data.',
  year: new Date().getUTCFullYear(),
  cover: null,
  tags: ['Open edition'],
  featured: false,
  story: [],
  seo: null,
  seriesSlug: null,
  kind: 'Open edition',
  startsAt: null,
  endsAt: null,
  chain: 'ethereum',
  contract: null,
  standard: 'ERC721',
  editionSize: 100,
  platform: null,
  marketUrl: null,
  mintUrl: null,
  phases: [
    { name: 'Holders', startsAt: null, supply: 40, price: { amount: 0.03, currency: 'ETH' }, audience: 'Anyone holding an earlier work' },
    { name: 'Open', startsAt: null, supply: 60, price: { amount: 0.05, currency: 'ETH' }, audience: 'Anyone' },
  ],
  perks: ['A printed sheet for the first forty', 'The studio notes as a PDF'],
  notify: true,
};

/** The same drop at each point in its life, so every state can be seen at once. */
function dropStates(base: Drop, now: number): { label: string; drop: Drop }[] {
  const at = (offset: number) => new Date(now + offset).toISOString();
  const phases = (offset: number) =>
    base.phases.map((phase, index) => ({ ...phase, startsAt: at(offset + index * 6 * 60 * 60 * 1000) }));
  return [
    { label: 'Upcoming', drop: { ...base, startsAt: at(3 * DAY), endsAt: at(10 * DAY), phases: phases(3 * DAY) } },
    { label: 'Open now', drop: { ...base, startsAt: at(-DAY), endsAt: at(2 * DAY), phases: phases(-DAY) } },
    { label: 'Closed', drop: { ...base, startsAt: at(-10 * DAY), endsAt: at(-3 * DAY), phases: phases(-10 * DAY) } },
    { label: 'No date yet', drop: { ...base, startsAt: null, endsAt: null, phases: base.phases.map(phase => ({ ...phase, startsAt: null })) } },
  ];
}

/**
 * Real records from the site's data for every state a works component has.
 * When the data lacks a state (the demo has no missing images, for example),
 * a real record is varied to show it, and links nowhere.
 */
function pickSamples(data: SiteData) {
  const { series, works } = data;

  const imageWork = works.find(work => work.media.kind === 'image' && work.media.still) ?? works.find(work => work.media.still);
  if (!imageWork) return null;

  const videoWork = works.find(work => work.media.kind === 'video' && work.media.still && work.media.animation) ?? null;
  const htmlWork = works.find(work => work.media.kind === 'html' && work.media.still) ?? null;
  const missingWork = works.find(work => !work.media.still) ?? null;

  const workCards: Sample<Work>[] = [
    { label: 'Image', item: imageWork, href: workHref(imageWork) },
    videoWork
      ? { label: 'Video', item: videoWork, href: workHref(videoWork) }
      : { label: 'Video', item: { ...imageWork, id: `${imageWork.id}:video`, media: { ...imageWork.media, kind: 'video' } }, href: SAMPLE_HREF },
    htmlWork
      ? { label: 'Interactive', item: htmlWork, href: workHref(htmlWork) }
      : { label: 'Interactive', item: { ...imageWork, id: `${imageWork.id}:html`, media: { ...imageWork.media, kind: 'html' } }, href: SAMPLE_HREF },
    {
      label: 'Edition',
      item: { ...imageWork, id: `${imageWork.id}:edition`, standard: 'ERC1155', editionSize: 25 },
      href: SAMPLE_HREF,
    },
    missingWork
      ? { label: 'No image', item: missingWork, href: workHref(missingWork) }
      : { label: 'No image', item: { ...imageWork, id: `${imageWork.id}:none`, title: 'Untitled', media: NO_MEDIA }, href: SAMPLE_HREF },
  ];

  const withCover = series.filter(item => item.cover?.still);
  const baseSeries = withCover.find(item => item.kind === 'series' && !item.coAuthored) ?? withCover[0] ?? series[0];
  const real = (predicate: (item: Series) => boolean) => withCover.find(predicate) ?? null;
  const vary = (patch: Partial<Series>, key: string): Sample<Series> => ({
    label: '',
    item: { ...baseSeries, ...patch, slug: `${baseSeries.slug}-${key}` },
    href: SAMPLE_HREF,
  });

  const coAuthored = real(item => item.coAuthored);
  const oneOfOne = real(item => item.kind === 'one-of-one');
  const shared = real(item => item.kind === 'shared-platform');
  const noCover = series.find(item => !item.cover?.still) ?? null;

  const seriesCards: Sample<Series>[] = [
    { label: 'Series', item: baseSeries, href: seriesHref(baseSeries) },
    coAuthored
      ? { label: 'Co-authored', item: coAuthored, href: seriesHref(coAuthored) }
      : { ...vary({ coAuthored: true }, 'co'), label: 'Co-authored' },
    oneOfOne
      ? { label: 'One of one', item: oneOfOne, href: seriesHref(oneOfOne) }
      : { ...vary({ kind: 'one-of-one', workCount: 1 }, 'one'), label: 'One of one' },
    shared
      ? { label: 'Platform 1/1s', item: shared, href: seriesHref(shared) }
      : { ...vary({ kind: 'shared-platform', year: null }, 'shared'), label: 'Platform 1/1s' },
    noCover
      ? { label: 'No cover', item: noCover, href: seriesHref(noCover) }
      : { ...vary({ cover: null }, 'none'), label: 'No cover' },
  ];

  const detailSeries = series.find(item => item.slug === imageWork.seriesSlug) ?? baseSeries;
  const siblings = works.filter(work => work.seriesSlug === detailSeries.slug);
  const index = siblings.findIndex(work => work.id === imageWork.id);

  const viewerWorks: { label: string; work: Work; liveHtml?: boolean }[] = [
    { label: 'Image', work: imageWork },
    ...(videoWork ? [{ label: 'Video', work: videoWork }] : []),
    { label: 'Interactive', work: workCards[2].item },
    { label: 'No image', work: workCards[4].item },
  ];

  // An interactive work to show the live frame with; when the data has none,
  // an image work stands in so the states are still visible.
  const liveWork: Work =
    htmlWork?.media.animation
      ? htmlWork
      : {
          ...imageWork,
          id: `${imageWork.id}:live`,
          title: `${imageWork.title} (interactive sample)`,
          media: { ...imageWork.media, kind: 'html', animation: imageWork.media.full ?? imageWork.media.still },
        };

  // A work with a full record: traits, a file and categories.
  const recordWork: Work = works.find(work => (work.traits?.length ?? 0) >= 3 && Boolean(work.file)) ?? {
    ...imageWork,
    traits: [
      { name: 'Palette', value: 'Warm' },
      { name: 'Density', value: 'High' },
      { name: 'Passes', value: '3' },
    ],
    file: { format: 'image/jpeg', bytes: 4180000 },
    categories: imageWork.categories?.length ? imageWork.categories : ['Sample category'],
  };

  const firstChild = series.find(item => item.parentSlug) ?? null;
  const chapterParent = firstChild ? (series.find(item => item.slug === firstChild.parentSlug) ?? null) : null;
  const chapters: Series[] = chapterParent
    ? series.filter(item => item.parentSlug === chapterParent.slug)
    : [
        { ...baseSeries, slug: `${baseSeries.slug}-first-chapter`, name: `${baseSeries.name}, first chapter`, displayTitle: null, parentSlug: baseSeries.slug, workCount: 12 },
        { ...baseSeries, slug: `${baseSeries.slug}-second-chapter`, name: `${baseSeries.name}, second chapter`, displayTitle: null, parentSlug: baseSeries.slug, workCount: 8 },
      ];

  const storySeries = series.find(item => (item.story?.length ?? 0) > 0) ?? null;

  return {
    imageWork,
    videoWork,
    liveWork,
    recordWork,
    chapters,
    chapterParent,
    storySeries,
    dropBase: data.drops[0] ?? SAMPLE_DROP,
    workCards,
    seriesCards,
    gridWorks: siblings.slice(0, 6),
    headerSeries: coAuthored ?? detailSeries,
    detailSeries,
    previous: index > 0 ? siblings[index - 1] : null,
    next: index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null,
    viewerWorks,
  };
}

function StateGrid({ children }: { children: ReactNode }) {
  return <div className="grid w-full grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 2xl:grid-cols-6">{children}</div>;
}

function State({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

/** The in-page anchors of this section, for the design system's navigation. */
export const WORKS_TOPICS = [
  { id: 'works-cards', label: 'Cards' },
  { id: 'works-grids', label: 'Grids' },
  { id: 'works-media', label: 'Media' },
  { id: 'works-live', label: 'Live and interactive' },
  { id: 'works-record', label: 'The record' },
  { id: 'works-attribution', label: 'Attribution' },
  { id: 'works-pages', label: 'Series and work pages' },
  { id: 'works-drops', label: 'Drops' },
] as const;

/** Sections sit under a sticky bar on phones, and only under the header from lg. */
const SUBSECTION_CLASS = 'scroll-mt-28 lg:scroll-mt-20';

/**
 * Every works component in its states, fed with the site's own data. The
 * design system page supplies the "Works" heading; these are its subsections.
 */
export function WorksSection() {
  const samples = pickSamples(getSiteData());
  const now = RENDERED_AT;

  if (!samples) {
    return (
      <p className="py-10 text-sm text-muted-foreground">
        The site data has no works with an image yet, so there is nothing to show here.
      </p>
    );
  }

  return (
    <div className="flex flex-col">
      <Section
        id="works-cards"
        headingLevel={3}
        title="Cards"
        className={SUBSECTION_CLASS}
        description="Samples come from this site's data. When the data lacks a state, a real record is varied to show it, and that card links nowhere."
      >
        <SpecimenGrid>
          <Specimen
            title="SeriesCard"
            source="raisonne/works/series-card"
            span="full"
            stageClassName="block"
            note="The cover fills a square (object-cover). The caption lists year, chain and size, and flags one of ones, platform tokens and co-authored contracts. A missing cover keeps the frame and says so."
          >
            <StateGrid>
              {samples.seriesCards.map(sample => (
                <State key={sample.label} label={sample.label}>
                  <SeriesCard series={sample.item} href={sample.href} sizes="(min-width: 1536px) 14vw, (min-width: 768px) 30vw, 45vw" />
                </State>
              ))}
              <State label="Loading">
                <SeriesCardSkeleton />
              </State>
            </StateGrid>
          </Specimen>

          <Specimen
            title="WorkCard"
            source="raisonne/works/work-card"
            span="full"
            stageClassName="block"
            note="Artworks are never cropped (object-contain on a muted frame). Video and interactive works say so in the caption and play only in the viewer. Token ids are mono; 78-digit ids keep both ends."
          >
            <StateGrid>
              {samples.workCards.map(sample => (
                <State key={sample.label} label={sample.label}>
                  <WorkCard work={sample.item} href={sample.href} sizes="(min-width: 1536px) 14vw, (min-width: 768px) 30vw, 45vw" />
                </State>
              ))}
              <State label="Loading">
                <WorkCardSkeleton />
              </State>
            </StateGrid>
          </Specimen>
        </SpecimenGrid>
      </Section>

      <Section
        id="works-grids"
        headingLevel={3}
        title="Grids"
        className={SUBSECTION_CLASS}
        description="Media grids use the width of the screen; the text around them never does. Searching, sorting and filtering them is the catalogue section's job."
      >
        <SpecimenGrid>
          <Specimen
            title="WorkGrid"
            source="raisonne/works/work-grid"
            span="full"
            stageClassName="flex-col items-stretch gap-8"
            note="One grid for works and series: 2 columns on phones, 3 from md (768 px), 4 from xl (1280), 5 from 3xl (1920), 6 from 4xl (2560). The breakpoints come from the theme, never from arbitrary px variants. Text around it stays at reading width."
          >
            <Row label="Populated">
              <WorkGrid works={samples.gridWorks} />
            </Row>
            <Row label="Loading">
              <WorkGridSkeleton count={6} />
            </Row>
            <Row label="Empty">
              <WorkGrid works={[]} />
            </Row>
          </Specimen>

          <Specimen
            title="SeriesGrid"
            source="raisonne/works/series-grid"
            span="full"
            stageClassName="flex-col items-stretch gap-8"
            note="The same grid for series. The works index passes its own empty state with a way back to everything."
          >
            <Row label="Loading">
              <SeriesGridSkeleton count={6} />
            </Row>
            <Row label="Empty">
              <SeriesGrid series={[]} />
            </Row>
          </Specimen>
        </SpecimenGrid>
      </Section>

      <Section
        id="works-media"
        headingLevel={3}
        title="Media"
        className={SUBSECTION_CLASS}
        description="Stills everywhere, motion only on request. Every image goes through next/image with real sizes."
      >
        <SpecimenGrid>
          <Specimen
            title="MediaStill"
            source="raisonne/works/media-still"
            span={2}
            stageClassName="block"
            note="Always media.still through next/image with real sizes: grids never load animated originals. The caller sizes the frame. When there is no still, or it fails to load, the frame explains instead of breaking."
          >
            <StateGrid>
              <State label="Contain (works)">
                <MediaStill media={samples.imageWork.media} alt={samples.imageWork.title} sizes="200px" />
              </State>
              <State label="Cover (series)">
                <MediaStill media={samples.imageWork.media} alt={samples.imageWork.title} sizes="200px" fit="cover" />
              </State>
              <State label="Wide frame">
                <MediaStill media={samples.imageWork.media} alt={samples.imageWork.title} sizes="300px" className="aspect-video" />
              </State>
              <State label="No still">
                <MediaStill media={{ ...samples.imageWork.media, kind: 'video', still: null }} alt="Sample work" sizes="200px" />
              </State>
              <State label="Not found on-chain">
                <MediaStill media={NO_MEDIA} alt="Sample work" sizes="200px" />
              </State>
              <State label="No media object">
                <MediaStill media={null} alt="Sample series" sizes="200px" />
              </State>
            </StateGrid>
          </Specimen>

          <Specimen
            title="MediaViewer"
            source="raisonne/works/media-viewer"
            stageClassName="flex-col items-start gap-4"
            note="A near full-screen dialog. Images zoom from half size to five times and pan, with the wheel, a pinch, the buttons or the keyboard; video plays here only; an interactive work runs here when the artist allows it. Escape closes it, and the whole viewer can go to real full screen."
          >
            <MediaViewerDemo
              works={[...samples.viewerWorks, { label: 'Interactive, live HTML on', work: samples.liveWork, liveHtml: true }]}
            />
            <Row label="Error: the video source did not answer">
              <MediaErrorAlert host={samples.videoWork?.media.animation ? hostOf(samples.videoWork.media.animation) : 'ipfs.io'} />
            </Row>
          </Specimen>
        </SpecimenGrid>
      </Section>

      <Section
        id="works-live"
        headingLevel={3}
        title="Live and interactive"
        className={SUBSECTION_CLASS}
        description="Most of a generative catalogue is code. It runs here only when the artist allows it, only when a visitor asks for it, and never on its own."
      >
        <SpecimenGrid>
          <Specimen
            title="LiveHtmlFrame, live HTML on"
            source="raisonne/works/live-html-frame"
            span={2}
            stageClassName="block"
            note={
              <>
                The frame is <code className="font-mono text-xs">sandbox=&quot;allow-scripts&quot;</code> with no
                allow-same-origin, so the work gets no cookies, no storage and no reach into this site. The still stays
                underneath while it loads and if it never arrives, and there is a Stop, a full screen and a link to the
                original file.
              </>
            }
          >
            <LiveHtmlFrame
              work={samples.liveWork}
              enabled
              frameClassName="aspect-video"
              sizes="(min-width: 1024px) 45vw, 90vw"
            />
          </Specimen>

          <Specimen
            title="LiveHtmlFrame, live HTML off"
            source="raisonne/works/live-html-frame"
            stageClassName="block"
            note="The default for a new install (SiteSettings.liveHtml). The work is its still, the page says why, and the link opens the running piece somewhere else."
          >
            <LiveHtmlFrame
              work={samples.liveWork}
              enabled={false}
              frameClassName="aspect-video"
              sizes="(min-width: 1024px) 45vw, 90vw"
            />
          </Specimen>
        </SpecimenGrid>
      </Section>

      <Section
        id="works-record"
        headingLevel={3}
        title="The record"
        className={SUBSECTION_CLASS}
        description="What the catalogue knows about a work and about a series. Anything unrecorded is left out rather than printed as 'unknown'."
      >
        <SpecimenGrid>
          <Specimen
            title="WorkFacts"
            source="raisonne/works/work-facts"
            span={2}
            stageClassName="block"
            note="The few facts a collector looks for first: chain, standard, whether it is unique, the year and where to collect it."
          >
            <WorkFacts work={samples.recordWork} series={samples.detailSeries} />
          </Specimen>

          <Specimen
            title="WorkTags"
            source="raisonne/works/work-tags"
            stageClassName="block"
            note="Mediums and categories as links into the catalogue index, filtered to that medium."
          >
            <WorkTags tags={samples.recordWork.categories ?? samples.detailSeries.categories ?? ['Generative', 'Pattern']} />
          </Specimen>

          <Specimen
            title="WorkAttributes"
            source="raisonne/works/work-attributes"
            span="full"
            stageClassName="block"
            note="The full record: the description, the token's traits, the file and the chain. Addresses and ids are mono with a copy button, and the owner row appears only when SiteSettings.showOwners is on."
          >
            <div className="max-w-md">
              <WorkAttributes work={samples.recordWork} series={samples.detailSeries} headingLevel={5} />
            </div>
          </Specimen>

          <Specimen
            title="SeriesSpecs"
            source="raisonne/works/series-specs"
            span="full"
            stageClassName="block"
            note="The same idea for a series: its kind, its size, the contract and the marketplace, with its categories underneath."
          >
            <SeriesSpecs series={samples.detailSeries} />
          </Specimen>

          <Specimen
            title="SubSeries"
            source="raisonne/works/sub-series"
            span="full"
            stageClassName="block"
            note="The chapters of a series, listed before its works. The parent page then shows every work in the family, and each chapter's breadcrumb goes back to the parent."
          >
            <SubSeries series={samples.chapters} headingLevel={5} className="py-0 md:py-0" />
          </Specimen>

          {samples.storySeries ? (
            <Specimen
              title="SeriesAbout"
              source="raisonne/works/series-about"
              span="full"
              stageClassName="block"
              note="The essay behind a series, in story blocks. A chapter with no story of its own shows its parent's and says whose it is, and the whole essay also has a page of its own."
            >
              <SeriesAbout
                story={samples.storySeries.story ?? []}
                moreHref={seriesAboutHref(samples.storySeries)}
                headingLevel={5}
                id="works-record-about"
                className="py-0 md:py-0"
              />
            </Specimen>
          ) : null}
        </SpecimenGrid>
      </Section>

      <Section
        id="works-attribution"
        headingLevel={3}
        title="Attribution"
        className={SUBSECTION_CLASS}
        description="Where a work lives and why the catalogue credits it to the artist, in plain words."
      >
        <SpecimenGrid>
          <Specimen
            title="ChainBadge"
            source="raisonne/works/chain-badge"
            note="Text only. Chains get no brand colours, so the art stays the only colour on the page."
          >
            {ALL_CHAINS.map(chain => (
              <ChainBadge key={chain} chain={chain} />
            ))}
          </Specimen>

          <Specimen
            title="EvidenceBadges"
            source="raisonne/works/evidence-badges"
            span={2}
            stageClassName="flex-col items-start gap-5"
            note="One badge per on-chain signal. Each badge is a Popover, not a Tooltip, so the plain-words explanation opens on a tap as well as on hover and focus. compact folds them into one badge for narrow rows. Co-authored uses the primary colour, the one accent, because it changes how the work is credited."
          >
            <Row label="Every signal, co-authored">
              <EvidenceBadges evidence={ALL_SIGNALS} coAuthored />
            </Row>
            <Row label="Typical series">
              <EvidenceBadges evidence={ALL_SIGNALS.slice(0, 3)} />
            </Row>
            <Row label="Platform tokens">
              <EvidenceBadges evidence={[ALL_SIGNALS[3]]} />
            </Row>
            <Row label="No evidence">
              <EvidenceBadges evidence={[]} />
            </Row>
            <Row label="Compact, for narrow rows">
              <EvidenceBadges evidence={ALL_SIGNALS.slice(0, 3)} compact />
            </Row>
          </Specimen>
        </SpecimenGrid>
      </Section>

      <Section
        id="works-pages"
        headingLevel={3}
        title="Series and work pages"
        className={SUBSECTION_CLASS}
        description="The page-level components, with the loading state each route shows while it streams in."
      >
        <SpecimenGrid>
          <Specimen
            title="SeriesHero"
            source="raisonne/works/series-hero"
            span="full"
            stageClassName="flex-col items-stretch gap-8"
            note="The top of the standalone essay page: the cover, where the essay sits in the catalogue, and the way back to the works it is about."
          >
            <SeriesHero
              series={samples.detailSeries}
              workCount={samples.gridWorks.length}
              headingLevel={5}
              className="pt-0"
            />
            <Row label="Loading">
              <SeriesHeroSkeleton className="pt-0" />
            </Row>
          </Specimen>

          <Specimen
            title="SeriesHeader"
            source="raisonne/works/series-header"
            span="full"
            stageClassName="flex-col items-stretch gap-8"
            note="Breadcrumb, PageHeader, the facts as data (mono), and the attribution. A co-authored series also gets an Alert that says what that means."
          >
            <SeriesHeader series={samples.headerSeries} headingLevel={5} className="pt-0 pb-0 md:pb-0" />
            <Row label="Loading">
              <SeriesHeaderSkeleton className="pt-0 pb-0 md:pb-0" />
            </Row>
          </Specimen>

          <Specimen
            title="WorkDetail and WorkPager"
            source="raisonne/works/work-detail"
            span="full"
            stageClassName="flex-col items-stretch gap-10"
            note="The media is the hero: the whole work on a quiet stage, click to open the viewer. The record is a Table (contract and token id in mono with copy buttons), provenance is spelled out, and previous and next stay in the series."
          >
            <WorkDetail work={samples.imageWork} series={samples.detailSeries} headingLevel={5} />
            <WorkPager previous={samples.previous} next={samples.next} />
            <Row label="Loading">
              <WorkDetailSkeleton />
            </Row>
          </Specimen>
        </SpecimenGrid>
      </Section>

      <Section
        id="works-drops"
        headingLevel={3}
        title="Drops"
        className={SUBSECTION_CLASS}
        description="An announced release. The state and the clock are worked out in the browser from the dates, so a page built last week still says 'open now' on the day."
      >
        <SpecimenGrid>
          <Specimen
            title="DropCountdown"
            source="raisonne/drops/countdown"
            span={2}
            stageClassName="flex-col items-stretch gap-8"
            note="A drop with no start date reads 'date to be announced' and never counts down to a date nobody has set. The clock is read out once, not four times a second."
          >
            {dropStates(samples.dropBase, now).map(state => (
              <Row key={state.label} label={state.label}>
                <DropCountdown drop={state.drop} now={now} />
              </Row>
            ))}
          </Specimen>

          <Specimen
            title="DropCallout"
            source="raisonne/drops/drop-callout"
            span="full"
            stageClassName="flex-col items-stretch gap-4"
            note="On a series page, because Wave 1 ships no list of drops. A release that has closed renders nothing."
          >
            {dropStates(samples.dropBase, now)
              .slice(0, 2)
              .map(state => (
                <DropCallout key={state.label} drop={state.drop} now={now} />
              ))}
          </Specimen>

          <Specimen
            title="DropSpecs"
            source="raisonne/drops/drop-specs"
            stageClassName="block"
            note="What is being released: chain, standard, supply, the dates and the contract."
          >
            <DropSpecs drop={dropStates(samples.dropBase, now)[0].drop} />
          </Specimen>

          <Specimen
            title="DropPhases"
            source="raisonne/drops/drop-phases"
            span="full"
            stageClassName="flex-col items-stretch gap-8"
            note="Who can mint when, at what price, and how many. The phase that is open now says so, and the page keeps up without a reload."
          >
            <Row label="Open now, second phase to come">
              <DropPhases phases={dropStates(samples.dropBase, now)[1].drop.phases} now={now} />
            </Row>
            <Row label="Closed">
              <DropPhases
                phases={dropStates(samples.dropBase, now)[2].drop.phases}
                now={now}
                endsAt={dropStates(samples.dropBase, now)[2].drop.endsAt}
              />
            </Row>
          </Specimen>

          <Specimen
            title="NotifyDialog and AddToCalendar"
            source="raisonne/drops/notify-dialog"
            span={2}
            note="Get notified is the site's own sign-up form, tagged with the drop's slug, so a failure is reported as a failure. The calendar file is built in the browser from the dates already on the page."
          >
            <NotifyDialog slug={samples.dropBase.slug} title={samples.dropBase.title} />
            <AddToCalendar
              title={samples.dropBase.title}
              description={samples.dropBase.description}
              startsAt={dropStates(samples.dropBase, now)[0].drop.startsAt}
              endsAt={dropStates(samples.dropBase, now)[0].drop.endsAt}
              slug={samples.dropBase.slug}
            />
          </Specimen>
        </SpecimenGrid>
      </Section>
    </div>
  );
}
