import type { Metadata } from 'next';

import { getSiteData } from '@/fixtures';
import { ogImageUrl } from '@/lib/og';
import type { Seo } from '@/lib/types';

import { absoluteUrl, metadataBase, siteOrigin } from './urls';

/**
 * Every page's title, description, keywords and share card.
 *
 * Two rules the whole site follows:
 *
 *  - The artist writes it. `SiteData.pages` holds a Seo record per page key
 *    ('home', 'works', 'about', ...), and each record page carries its own
 *    `seo`. Anything the artist left null falls back to what the page can
 *    work out for itself, so an install that never opens the SEO fields
 *    still shares properly.
 *  - Share images go through the app's own optimizer. An on-chain still can
 *    be a 20 MB PNG, which scrapers refuse; `/_next/image` hands them a size
 *    they will actually fetch.
 *
 * These functions read the fixture, so they belong in `generateMetadata()`
 * on the server, never in a component.
 */

export interface SeoFallback {
  /** Used when the artist wrote no title. Goes through the site's title template. */
  title?: string | null;
  description?: string | null;
  /** A still, cover or portrait. Relative or absolute. */
  image?: string | null;
  /** The page's own path, e.g. "/works/visions". Becomes the canonical URL. */
  path?: string;
  keywords?: string[];
  /** 'article' for a writing or a press piece, 'profile' for the artist. */
  type?: 'website' | 'article' | 'profile';
  /** Keeps a page out of search results (tools, maintenance, a page with no content yet). */
  noIndex?: boolean;
}

/** Search engines see nothing. Used by the artist's tools and by /maintenance. */
export const NO_INDEX: Metadata['robots'] = { index: false, follow: false };

/**
 * The card drawn at /opengraph-image, used by any page with no picture of
 * its own. Next merges a file-based share card only into metadata that does
 * not declare `openGraph`, and every page here declares one, so the fallback
 * is named rather than inherited. Without it a list page shares as bare text.
 */
const DEFAULT_SHARE_IMAGE = '/opengraph-image';

function firstText(...values: (string | null | undefined)[]): string | undefined {
  for (const value of values) {
    const text = value?.trim();
    if (text) return text;
  }
  return undefined;
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Keeps the site from naming itself twice in one title.
 *
 * A title written in a CMS often already carries the site: "Memememory,
 * Media Majlis Museum Installation | orkhan.art", or "Visions, a series by
 * Orkhan Mammadov". The root layout's template then appends the name again.
 *
 * So: drop a trailing "| <site name>" or "| <host>" segment, and if what is
 * left still names the site, set the title absolute rather than folding it
 * into the template. A title that does not name the site is returned as
 * written and the template appends the name, as it should.
 */
function siteTitle(title: string, siteName: string, origin: string): Metadata['title'] {
  let host = '';
  try {
    host = new URL(origin).host.replace(/^www\./, '');
  } catch {
    host = '';
  }

  const suffixes = [siteName, host].map(value => value.trim().toLowerCase()).filter(Boolean);

  let text = title.trim();
  for (;;) {
    const cut = text.lastIndexOf('|');
    if (cut < 1) break;
    const tail = text.slice(cut + 1).trim().toLowerCase();
    if (!suffixes.includes(tail)) break;
    text = text.slice(0, cut).trim();
  }
  if (!text) text = title.trim();

  const names = siteName.trim();
  const alreadyNamed = names.length > 0 && new RegExp(`(^|\\W)${escapeForRegExp(names)}(\\W|$)`, 'i').test(text);
  return alreadyNamed ? { absolute: text } : text;
}

/** The plain string behind a title, for og:title and twitter:title. */
function titleText(title: Metadata['title']): string | undefined {
  if (typeof title === 'string') return title;
  if (title && typeof title === 'object' && 'absolute' in title && typeof title.absolute === 'string') {
    return title.absolute;
  }
  return undefined;
}

/**
 * A share card a scraper will fetch. Anything remote goes through the image
 * optimizer; a path the site serves itself is left alone.
 */
function shareImage(src: string | null | undefined): string | undefined {
  const value = src?.trim();
  if (!value) return undefined;
  if (value.startsWith('/_next/image')) return value;
  if (value.startsWith('/')) return value;
  return ogImageUrl(value);
}

/**
 * Turns one Seo record plus the page's own fallbacks into Next metadata.
 * `seo` is what the artist wrote (null when they wrote nothing).
 */
export function seoMetadata(seo: Seo | null | undefined, fallback: SeoFallback = {}): Metadata {
  const { settings, artist } = getSiteData();

  const written = firstText(seo?.title, fallback.title);
  const title = written ? siteTitle(written, artist.name, siteOrigin(settings)) : undefined;
  const shareTitle = titleText(title) ?? written;
  const description = firstText(seo?.description, fallback.description);
  const image = shareImage(seo?.image ?? fallback.image) ?? DEFAULT_SHARE_IMAGE;
  const keywords = seo?.keywords?.length ? seo.keywords : fallback.keywords;
  const canonical = fallback.path;

  const metadata: Metadata = {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(keywords?.length ? { keywords } : {}),
    ...(canonical ? { alternates: { canonical } } : {}),
    openGraph: {
      type: fallback.type ?? 'website',
      siteName: artist.name,
      ...(shareTitle ? { title: shareTitle } : {}),
      ...(description ? { description } : {}),
      ...(canonical ? { url: absoluteUrl(canonical, settings) } : {}),
      ...(image ? { images: [{ url: image, alt: shareTitle ?? artist.name }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      ...(shareTitle ? { title: shareTitle } : {}),
      ...(description ? { description } : {}),
      ...(image ? { images: [image] } : {}),
    },
  };

  if (fallback.noIndex) metadata.robots = NO_INDEX;
  return metadata;
}

/**
 * Metadata for one of the site's fixed pages, by its key in `SiteData.pages`
 * ('home', 'works', 'about', 'cv', 'press', 'exhibitions', ...).
 */
export function pageMetadata(key: string, fallback: SeoFallback = {}): Metadata {
  return seoMetadata(getSiteData().pages[key] ?? null, fallback);
}

/**
 * The site-wide defaults, set once in the root layout: the title template
 * every page title is folded into, the description, the canonical base and
 * the icons. Individual pages override the parts they know better.
 */
export function defaultMetadata(): Metadata {
  const { artist, settings, pages } = getSiteData();
  const home = pages.home ?? null;

  const description = firstText(
    home?.description,
    artist.tagline,
    artist.statement?.split('\n\n')[0],
    `The catalogue raisonne of ${artist.name}.`,
  );

  return {
    metadataBase: metadataBase(settings),
    title: { template: `%s | ${artist.name}`, default: firstText(home?.title, artist.name) ?? artist.name },
    description,
    ...(home?.keywords?.length ? { keywords: home.keywords } : {}),
    applicationName: artist.name,
    authors: [{ name: artist.name, url: siteOrigin(settings) }],
    creator: artist.name,
    publisher: artist.name,
    /*
     * No canonical and no og:url here. Metadata is inherited, so a canonical
     * set on the layout would make every page that does not override it claim
     * to be the home page. Pages set their own with pageMetadata({ path }).
     */
    openGraph: {
      type: 'website',
      siteName: artist.name,
      title: artist.name,
      ...(description ? { description } : {}),
    },
    twitter: { card: 'summary_large_image' },
    robots: settings.maintenance.enabled ? NO_INDEX : { index: true, follow: true },
  };
}
