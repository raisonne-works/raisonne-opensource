import { seriesTitle, workTitle } from '@/components/raisonne/works/lib';
import { plainText } from '@/lib/markdown';
import type {
  Artist,
  ArtistLink,
  Asset,
  CatalogueCounts,
  Exhibition,
  Media,
  PhysicalWork,
  Series,
  Work,
} from '@/lib/types';

/**
 * Structured data: what a search engine reads instead of guessing.
 *
 * Thirteen generators, one per schema.org type the catalogue needs. They are
 * pure: every one takes the domain types from src/lib/types.ts plus the site
 * origin and returns a plain object, so a page can build one, a test can
 * compare one, and nothing here reads the filesystem.
 *
 * A page renders them with <JsonLd /> from
 * src/components/raisonne/seo/json-ld.tsx, which is also the only place that
 * serializes them into the document.
 *
 * Nothing is hardcoded to one artist: names, roles, profiles and subjects all
 * come from the install's own data.
 */

export type JsonLdNode = Record<string, unknown>;

const CONTEXT = 'https://schema.org';

/** Drops empty values, so no entity carries `"description": null` into a crawler. */
function compact(node: JsonLdNode): JsonLdNode {
  const out: JsonLdNode = {};
  for (const [key, value] of Object.entries(node)) {
    if (value === null || value === undefined || value === '') continue;
    if (Array.isArray(value) && value.length === 0) continue;
    out[key] = value;
  }
  return out;
}

/**
 * One script carrying several entities that reference each other by @id. The
 * context is stated once, on the graph, so the entities inside drop their own.
 */
export function graph(...nodes: (JsonLdNode | null | undefined)[]): JsonLdNode {
  const entities = nodes
    .filter((node): node is JsonLdNode => Boolean(node))
    .map(node => Object.fromEntries(Object.entries(node).filter(([key]) => key !== '@context')));
  return { '@context': CONTEXT, '@graph': entities };
}

function withContext(node: JsonLdNode): JsonLdNode {
  return { '@context': CONTEXT, ...compact(node) };
}

function url(origin: string, path: string): string {
  return /^[a-z][a-z0-9+.-]*:/i.test(path) ? path : `${origin}${path.startsWith('/') ? '' : '/'}${path}`;
}

/** The stable identities every other entity points at. */
export function personId(origin: string): string {
  return `${origin}/#person`;
}

export function organizationId(origin: string): string {
  return `${origin}/#organization`;
}

export function webSiteId(origin: string): string {
  return `${origin}/#website`;
}

/**
 * The profiles that tell a search engine the scattered mentions of this name
 * are one person: the artist's own other domains first, then their profiles.
 */
function sameAs(artist: Artist): string[] {
  const links = [
    ...artist.links.filter(link => link.kind === 'site'),
    ...artist.links.filter(link => link.kind !== 'site' && link.kind !== 'email'),
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const link of links) {
    const href = link.href?.trim();
    if (!href || !href.startsWith('http') || seen.has(href)) continue;
    seen.add(href);
    out.push(href);
  }
  return out;
}

function knowsAbout(artist: Artist): string[] {
  return (artist.researchAreas ?? []).map(area => area.title).filter(Boolean);
}

function firstParagraph(text: string | null | undefined): string | null {
  const value = text?.trim();
  if (!value) return null;
  return value.split(/\n\s*\n/)[0]?.trim() || null;
}

function imageUrl(origin: string, value: string | null | undefined): string | null {
  const src = value?.trim();
  return src ? url(origin, src) : null;
}

function assetImage(origin: string, asset: Asset | null | undefined): string | null {
  if (!asset) return null;
  return imageUrl(origin, asset.kind === 'video' ? asset.poster : asset.src);
}

function mediaImage(origin: string, media: Media | null | undefined): string | null {
  if (!media) return null;
  return imageUrl(origin, media.full ?? media.still);
}

// ---------------------------------------------------------------------------
// 1. Person: the artist
// ---------------------------------------------------------------------------

export function personJsonLd({ artist, origin }: { artist: Artist; origin: string }): JsonLdNode {
  return withContext({
    '@type': 'Person',
    '@id': personId(origin),
    name: artist.name,
    url: origin,
    description: firstParagraph(artist.description ?? artist.bio ?? artist.statement),
    ...(artist.tagline ? { jobTitle: artist.tagline } : {}),
    ...(artist.portrait ? { image: imageUrl(origin, artist.portrait) } : {}),
    ...(artist.location ? { homeLocation: { '@type': 'Place', name: artist.location } } : {}),
    sameAs: sameAs(artist),
    knowsAbout: knowsAbout(artist),
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${origin}/about` },
  });
}

// ---------------------------------------------------------------------------
// 2. Organization: the studio behind the practice
// ---------------------------------------------------------------------------

export function organizationJsonLd({
  artist,
  origin,
  logo,
}: {
  artist: Artist;
  origin: string;
  /** The site's own mark. Defaults to the theme icon. */
  logo?: string | null;
}): JsonLdNode {
  return withContext({
    '@type': 'Organization',
    '@id': organizationId(origin),
    name: artist.name,
    url: origin,
    description: firstParagraph(artist.description ?? artist.statement ?? artist.bio),
    logo: { '@type': 'ImageObject', url: imageUrl(origin, logo ?? '/icon.svg') },
    founder: { '@id': personId(origin) },
    sameAs: sameAs(artist),
    ...(artist.email
      ? { contactPoint: { '@type': 'ContactPoint', contactType: 'enquiries', email: artist.email } }
      : {}),
  });
}

// ---------------------------------------------------------------------------
// 3. WebSite: the catalogue itself, with its search
// ---------------------------------------------------------------------------

export function webSiteJsonLd({
  artist,
  origin,
  searchPath = '/works?q=',
}: {
  artist: Artist;
  origin: string;
  /** The catalogue search, so a result page can offer a site search box. */
  searchPath?: string | null;
}): JsonLdNode {
  return withContext({
    '@type': 'WebSite',
    '@id': webSiteId(origin),
    name: artist.name,
    url: origin,
    description: artist.tagline,
    inLanguage: 'en',
    publisher: { '@id': organizationId(origin) },
    ...(searchPath
      ? {
          potentialAction: {
            '@type': 'SearchAction',
            target: { '@type': 'EntryPoint', urlTemplate: `${origin}${searchPath}{search_term_string}` },
            'query-input': 'required name=search_term_string',
          },
        }
      : {}),
  });
}

// ---------------------------------------------------------------------------
// 4. VisualArtwork: one work
// ---------------------------------------------------------------------------

export function visualArtworkJsonLd({
  work,
  series,
  artist,
  origin,
  path,
}: {
  work: Work;
  series?: Series | null;
  artist: Artist;
  origin: string;
  /** The work's page, e.g. "/works/visions/12". */
  path: string;
}): JsonLdNode {
  const image = mediaImage(origin, work.media);
  const medium = work.categories?.length ? work.categories.join(', ') : (series?.categories?.join(', ') ?? null);

  return withContext({
    '@type': 'VisualArtwork',
    '@id': url(origin, path),
    name: workTitle(work),
    ...(work.displayTitle?.trim() && work.displayTitle.trim() !== work.title ? { alternateName: work.title } : {}),
    description: plainText(work.description),
    url: url(origin, path),
    image,
    creator: { '@id': personId(origin) },
    copyrightHolder: { '@id': personId(origin) },
    dateCreated: work.mintedAt,
    artform: 'Digital art',
    artMedium: medium,
    artworkSurface: work.file?.format ?? null,
    ...(work.media.width && work.media.height
      ? {
          width: { '@type': 'QuantitativeValue', value: work.media.width, unitCode: 'E37' },
          height: { '@type': 'QuantitativeValue', value: work.media.height, unitCode: 'E37' },
        }
      : {}),
    ...(work.editionSize ? { numberOfItems: work.editionSize } : {}),
    ...(series ? { isPartOf: { '@type': 'CreativeWorkSeries', name: seriesTitle(series) } } : {}),
    identifier: [
      { '@type': 'PropertyValue', name: 'Blockchain', value: work.chain },
      { '@type': 'PropertyValue', name: 'Contract', value: work.contract },
      { '@type': 'PropertyValue', name: 'Token ID', value: work.tokenId },
      { '@type': 'PropertyValue', name: 'Token standard', value: work.standard },
      ...(work.inscription ? [{ '@type': 'PropertyValue', name: 'Inscription', value: work.inscription }] : []),
    ],
    ...(artist.name ? { author: { '@type': 'Person', name: artist.name } } : {}),
  });
}

// ---------------------------------------------------------------------------
// 5. NFTCollection: one series, as the page that collects it
// ---------------------------------------------------------------------------

export function nftCollectionJsonLd({
  series,
  origin,
  path,
  workCount,
}: {
  series: Series;
  origin: string;
  /** The series page, e.g. "/works/visions". */
  path: string;
  /** Overrides Series.workCount when the page knows better. */
  workCount?: number;
}): JsonLdNode {
  const total = workCount ?? series.workCount;

  return withContext({
    '@type': 'CollectionPage',
    '@id': url(origin, path),
    name: seriesTitle(series),
    ...(series.displayTitle?.trim() && series.displayTitle.trim() !== series.name ? { alternateName: series.name } : {}),
    description: series.description,
    url: url(origin, path),
    image: mediaImage(origin, series.cover),
    isPartOf: { '@id': webSiteId(origin) },
    mainEntity: compact({
      '@type': 'CreativeWorkSeries',
      name: seriesTitle(series),
      description: series.description,
      creator: { '@id': personId(origin) },
      ...(series.year ? { datePublished: String(series.year) } : {}),
      ...(total ? { numberOfItems: total } : {}),
    }),
    additionalProperty: [
      { '@type': 'PropertyValue', name: 'Blockchain', value: series.chain },
      ...(series.contract ? [{ '@type': 'PropertyValue', name: 'Contract', value: series.contract }] : []),
      ...(series.standard ? [{ '@type': 'PropertyValue', name: 'Token standard', value: series.standard }] : []),
      ...(series.platform ? [{ '@type': 'PropertyValue', name: 'Platform', value: series.platform }] : []),
      ...(total ? [{ '@type': 'PropertyValue', name: 'Works', value: String(total) }] : []),
    ],
  });
}

// ---------------------------------------------------------------------------
// 6. ExhibitionEvent: one show
// ---------------------------------------------------------------------------

export function exhibitionJsonLd({
  exhibition,
  origin,
  path,
}: {
  exhibition: Exhibition;
  origin: string;
  /** The show's page, when it has one. */
  path?: string | null;
}): JsonLdNode {
  const place = [exhibition.venue, exhibition.city, exhibition.country].filter(Boolean).join(', ');

  return withContext({
    '@type': 'ExhibitionEvent',
    ...(path ? { '@id': url(origin, path), url: url(origin, path) } : {}),
    name: exhibition.title,
    description: exhibition.description,
    startDate: exhibition.startDate ?? (exhibition.year ? `${exhibition.year}` : null),
    endDate: exhibition.endDate,
    image: assetImage(origin, exhibition.cover),
    performer: { '@id': personId(origin) },
    ...(exhibition.curator ? { director: { '@type': 'Person', name: exhibition.curator } } : {}),
    ...(exhibition.event ? { superEvent: { '@type': 'Event', name: exhibition.event } } : {}),
    ...(place
      ? {
          location: compact({
            '@type': 'Place',
            name: exhibition.venue ?? place,
            address: compact({
              '@type': 'PostalAddress',
              addressLocality: exhibition.city,
              addressCountry: exhibition.country,
            }),
          }),
        }
      : {}),
    ...(exhibition.venue ? { organizer: { '@type': 'Organization', name: exhibition.venue } } : {}),
    ...(exhibition.url ? { sameAs: [exhibition.url] } : {}),
  });
}

// ---------------------------------------------------------------------------
// 7. Article: a writing by the artist, or a press piece about them
// ---------------------------------------------------------------------------

export function articleJsonLd({
  origin,
  path,
  headline,
  description,
  image,
  datePublished,
  dateModified,
  authors,
  publisher,
  section,
  keywords,
}: {
  origin: string;
  path: string;
  headline: string;
  description?: string | null;
  image?: string | null;
  datePublished?: string | null;
  dateModified?: string | null;
  /** Empty means the artist wrote it. */
  authors?: string[];
  /** The outlet, for a press piece. */
  publisher?: string | null;
  section?: string | null;
  keywords?: string[];
}): JsonLdNode {
  return withContext({
    '@type': 'Article',
    '@id': url(origin, path),
    headline,
    description,
    url: url(origin, path),
    image: imageUrl(origin, image),
    datePublished,
    dateModified: dateModified ?? datePublished,
    articleSection: section,
    keywords,
    author: authors?.length
      ? authors.map(name => ({ '@type': 'Person', name }))
      : [{ '@id': personId(origin) }],
    publisher: publisher ? { '@type': 'Organization', name: publisher } : { '@id': organizationId(origin) },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url(origin, path) },
  });
}

// ---------------------------------------------------------------------------
// 8. Product: a physical or phygital work
// ---------------------------------------------------------------------------

/** Free-text availability mapped to the two schema values that are honest here. */
function availabilityUrl(availability: string | null): string | null {
  const value = availability?.toLowerCase().trim();
  if (!value) return null;
  if (value.includes('sold') || value.includes('private collection')) return 'https://schema.org/SoldOut';
  if (value.includes('available') || value.includes('for sale')) return 'https://schema.org/InStock';
  return null;
}

export function productJsonLd({
  work,
  artist,
  origin,
  path,
}: {
  work: PhysicalWork;
  artist: Artist;
  origin: string;
  path: string;
}): JsonLdNode {
  const availability = availabilityUrl(work.availability);

  return withContext({
    '@type': 'Product',
    '@id': url(origin, path),
    name: work.title,
    description: work.description,
    url: url(origin, path),
    image: assetImage(origin, work.cover),
    brand: { '@type': 'Brand', name: artist.name },
    material: work.materials,
    ...(work.dimensions ? { size: work.dimensions } : {}),
    ...(work.medium ? { category: work.medium } : {}),
    // No price is ever stored, so the offer says availability only.
    ...(availability ? { offers: { '@type': 'Offer', availability, url: url(origin, path) } } : {}),
  });
}

// ---------------------------------------------------------------------------
// 9. BreadcrumbList: where a page sits
// ---------------------------------------------------------------------------

export interface BreadcrumbEntry {
  name: string;
  /** A site path. The last crumb may leave it out. */
  path?: string | null;
}

export function breadcrumbJsonLd({ items, origin }: { items: BreadcrumbEntry[]; origin: string }): JsonLdNode {
  return withContext({
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) =>
      compact({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        ...(item.path ? { item: url(origin, item.path) } : {}),
      }),
    ),
  });
}

// ---------------------------------------------------------------------------
// 10. ImageGallery: a documented set of photographs
// ---------------------------------------------------------------------------

export function imageGalleryJsonLd({
  name,
  description,
  origin,
  path,
  images,
}: {
  name: string;
  description?: string | null;
  origin: string;
  path: string;
  images: Asset[];
}): JsonLdNode {
  return withContext({
    '@type': 'ImageGallery',
    '@id': `${url(origin, path)}#gallery`,
    name,
    description,
    url: url(origin, path),
    associatedMedia: images
      .filter(asset => asset.kind === 'image')
      .map(asset =>
        compact({
          '@type': 'ImageObject',
          contentUrl: imageUrl(origin, asset.src),
          caption: asset.caption ?? asset.alt,
          ...(asset.width ? { width: asset.width } : {}),
          ...(asset.height ? { height: asset.height } : {}),
        }),
      ),
  });
}

// ---------------------------------------------------------------------------
// 11. FAQPage: the questions a collector page answers
// ---------------------------------------------------------------------------

export interface FaqEntry {
  question: string;
  /** Plain text. */
  answer: string;
}

export function faqJsonLd({ items }: { items: FaqEntry[] }): JsonLdNode {
  return withContext({
    '@type': 'FAQPage',
    mainEntity: items.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  });
}

// ---------------------------------------------------------------------------
// 12. ProfilePage: the About page
// ---------------------------------------------------------------------------

export function profilePageJsonLd({
  artist,
  origin,
  path = '/about',
}: {
  artist: Artist;
  origin: string;
  path?: string;
}): JsonLdNode {
  return withContext({
    '@type': 'ProfilePage',
    '@id': url(origin, path),
    url: url(origin, path),
    name: artist.name,
    description: firstParagraph(artist.description ?? artist.bio ?? artist.statement),
    isPartOf: { '@id': webSiteId(origin) },
    mainEntity: { '@id': personId(origin) },
  });
}

// ---------------------------------------------------------------------------
// 13. HomePage: the landing page and what it collects
// ---------------------------------------------------------------------------

export function homePageJsonLd({
  artist,
  counts,
  origin,
}: {
  artist: Artist;
  counts: CatalogueCounts;
  origin: string;
}): JsonLdNode {
  return withContext({
    '@type': 'WebPage',
    '@id': `${origin}/`,
    url: `${origin}/`,
    name: artist.name,
    description: artist.tagline,
    isPartOf: { '@id': webSiteId(origin) },
    about: { '@id': personId(origin) },
    primaryImageOfPage: artist.portrait ? { '@type': 'ImageObject', url: imageUrl(origin, artist.portrait) } : null,
    mainEntity: {
      '@type': 'ItemList',
      name: `The catalogue of ${artist.name}`,
      numberOfItems: counts.works,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Works', url: `${origin}/works` },
        { '@type': 'ListItem', position: 2, name: 'Exhibitions', url: `${origin}/exhibitions` },
        { '@type': 'ListItem', position: 3, name: 'About', url: `${origin}/about` },
      ],
    },
  });
}

/** The artist's own external links, for a page that wants them beside the entity. */
export function linkedProfiles(artist: Artist): ArtistLink[] {
  return artist.links.filter(link => link.kind !== 'email');
}
