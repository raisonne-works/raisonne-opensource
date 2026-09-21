import type { MetadataRoute } from 'next';

import {
  getChainSnapshot,
  getProductCategories,
  getProducts,
  getSiteData,
  getStore,
  getStoreCollections,
} from '@/fixtures';
import { isAddressableCategory } from '@/components/raisonne/store/lib';
import { isModuleEnabled } from '@/lib/records';
import { siteOrigin } from '@/lib/seo/urls';

/**
 * Every page a visitor can reach, with nothing a visitor cannot.
 *
 * The list is built from the install's own data, so a site with no
 * installations has no /installations entry and a site with the writings
 * module switched off lists none of its writings. Hidden series and works are
 * left out here exactly as they are left out of the catalogue, and the
 * artist's tools (/import, /design-system) never appear.
 *
 * Lastmod is the build date. The data is a file that ships with the build, so
 * that is the honest answer: a record changes when the site is rebuilt.
 *
 * One file, and it is watched. The protocol's limit is 50,000 URLs and this
 * install is at about 4,000, so a split would cost the one address robots.txt
 * advertises for nothing: Next's generateSitemaps() moves the file to
 * /sitemap/0.xml and leaves /sitemap.xml a 404, with no index of its own.
 * When an install approaches the limit the split has to come with a hand
 * written index at /sitemap.xml, which is the shape to build then.
 *
 * URL_LIMIT is the line: crossing it is a bug to fix, not a warning to read
 * in a log nobody opens.
 */

type Entry = MetadataRoute.Sitemap[number];

/** What the sitemap protocol allows in one file. */
const URL_LIMIT = 50_000;

export default function sitemap(): MetadataRoute.Sitemap {
  const data = getSiteData();
  const { settings } = data;

  // A site that says it is closed offers nothing to crawl.
  if (settings.maintenance.enabled) return [];

  const origin = siteOrigin(settings);
  const lastModified = new Date();
  const entries: Entry[] = [];

  const add = (path: string, priority: number, changeFrequency: Entry['changeFrequency']) => {
    entries.push({ url: `${origin}${path}`, lastModified, changeFrequency, priority });
  };

  const encode = (value: string) => encodeURIComponent(value);

  // --- The fixed pages -----------------------------------------------------

  add('/', 1, 'weekly');
  add('/works', 0.9, 'weekly');
  add('/about', 0.8, 'monthly');
  add('/cv', 0.7, 'monthly');

  const installations = data.installations.length + data.immersives.length;
  if (installations) add('/installations', 0.8, 'monthly');
  if (data.physicalWorks.length) add('/physical-works', 0.8, 'monthly');
  if (data.exhibitions.length) add('/exhibitions', 0.8, 'monthly');
  if (data.collaborations.length) add('/collaborations', 0.7, 'monthly');
  if (data.awards.length) add('/awards', 0.6, 'yearly');
  if (data.press.length) add('/press', 0.7, 'weekly');
  if (data.writings.length && isModuleEnabled(settings, 'writings')) add('/writings', 0.7, 'monthly');
  if (data.commissions && isModuleEnabled(settings, 'commissions')) add('/commissions', 0.7, 'monthly');

  // The commission form is a page somebody searches for ("commission a print
  // from ..."), so it is advertised, but only where there is a form to fill
  // in: with none, the route sends the visitor to an email address instead.
  if (isModuleEnabled(settings, 'commissions') && (getStore()?.commissionForm?.kinds.length ?? 0) > 0) {
    add('/commissions/request', 0.6, 'monthly');
  }

  // The insights pages are advertised only once there is a snapshot behind
  // them. Switched on with nothing read yet, they render the panel that tells
  // the artist which command to run, and that is not a page to send a crawler
  // to.
  if (isModuleEnabled(settings, 'insights') && getChainSnapshot() !== null) {
    add('/insights', 0.6, 'weekly');
    add('/insights/collections', 0.5, 'weekly');
    add('/insights/activity', 0.5, 'daily');

    // The leaderboard is the same snapshot read a different way, so it is
    // advertised only when that snapshot actually ranks somebody. The guild
    // page beside it explains the tiers and badges the rows carry.
    if ((getChainSnapshot()?.leaderboard.length ?? 0) > 0) {
      add('/leaderboard', 0.6, 'weekly');
      add('/leaderboard/guild', 0.4, 'monthly');
    }
  }

  // The collector directory is public when the module is on and the snapshot
  // has holders in it. A collector's own page and the public profiles are not
  // advertised: /collector is one person's own page, and a profile per wallet
  // would be a crawl space as large as the holder list, kept out of the index
  // by the pages themselves.
  if (isModuleEnabled(settings, 'collectors') && (getChainSnapshot()?.leaderboard.length ?? 0) > 0) {
    add('/collectors', 0.5, 'weekly');
  }

  // The shop is advertised only when it holds something. The cart and the
  // checkout never are: they are one visitor's basket in one browser, and
  // they carry no content of their own.
  if (isModuleEnabled(settings, 'store')) {
    const products = getProducts();
    if (products.length > 0) {
      add('/shop', 0.8, 'weekly');
      for (const category of getProductCategories()) {
        if (!isAddressableCategory(category.slug)) continue;
        if (!products.some(product => product.categorySlug === category.slug)) continue;
        add(`/shop/${encode(category.slug)}`, 0.6, 'weekly');
      }
      for (const collection of getStoreCollections()) {
        if (!products.some(product => product.collectionSlug === collection.slug)) continue;
        add(`/shop/collection/${encode(collection.slug)}`, 0.6, 'monthly');
      }
      for (const product of products) {
        add(`/shop/product/${encode(product.slug)}`, 0.7, 'weekly');
      }
    }
  }

  if (settings.legal.privacy) add('/privacy', 0.2, 'yearly');
  if (settings.legal.terms) add('/terms', 0.2, 'yearly');

  // --- Series, their essays and their works --------------------------------

  for (const series of data.series) {
    if (series.hidden) continue;
    add(`/works/${encode(series.slug)}`, 0.8, 'weekly');
    if (series.story?.length) add(`/works/${encode(series.slug)}/about`, 0.6, 'monthly');
  }

  const visibleSeries = new Set(data.series.filter(series => !series.hidden).map(series => series.slug));
  for (const work of data.works) {
    // A hidden work stays reachable by URL but is not advertised.
    if (work.hidden || !visibleSeries.has(work.seriesSlug)) continue;
    add(`/works/${encode(work.seriesSlug)}/${encode(work.tokenId)}`, 0.5, 'monthly');
  }

  // --- The other record types ----------------------------------------------

  for (const record of data.installations) add(`/installations/${encode(record.slug)}`, 0.7, 'monthly');
  for (const record of data.immersives) add(`/installations/${encode(record.slug)}`, 0.7, 'monthly');
  for (const record of data.physicalWorks) add(`/physical-works/${encode(record.slug)}`, 0.7, 'monthly');
  for (const record of data.collaborations) add(`/collaborations/${encode(record.slug)}`, 0.6, 'monthly');

  // Only a show, award or press item with a page of its own has a slug.
  for (const record of data.exhibitions) {
    if (record.slug) add(`/exhibitions/${encode(record.slug)}`, 0.6, 'monthly');
  }
  for (const record of data.awards) {
    if (record.slug) add(`/awards/${encode(record.slug)}`, 0.5, 'yearly');
  }
  for (const record of data.press) {
    if (record.slug) add(`/press/${encode(record.slug)}`, 0.5, 'monthly');
  }

  if (isModuleEnabled(settings, 'writings')) {
    for (const record of data.writings) add(`/writings/${encode(record.slug)}`, 0.6, 'monthly');
  }

  if (isModuleEnabled(settings, 'drops')) {
    for (const record of data.drops) add(`/drops/${encode(record.slug)}`, 0.8, 'daily');
  }

  if (entries.length > URL_LIMIT) {
    throw new Error(
      `This catalogue needs ${entries.length} sitemap entries, past the ${URL_LIMIT} one file may hold. Split it behind an index at /sitemap.xml.`,
    );
  }

  return entries;
}
