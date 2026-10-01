import fs from 'node:fs';
import path from 'node:path';

import type { NextConfig } from 'next';
import type { RemotePattern } from 'next/dist/shared/lib/image-config';

/**
 * Two things this file reads out of the install's own data rather than
 * hardcoding: which hosts next/image may load from, and which old URLs
 * redirect where.
 *
 * Images: next/image only loads from hosts that are listed here, so the list
 * has to match the data this install actually holds. Every artist's stills
 * live somewhere else (Arweave, an IPFS gateway, S3 or Spaces, a marketplace
 * CDN, their own CMS), so the hosts are read from the fixtures and from
 * settings.siteUrl at start up, and RAISONNE_IMAGE_HOSTS can add more (comma
 * separated). Nothing is hardcoded to one artist.
 *
 * Animations (video, HTML) are not optimized by next/image, so their hosts
 * do not need to be here.
 *
 * Redirects: settings.redirects, because every install renames its routes
 * differently and a redirect written in code would belong to whoever wrote
 * the theme.
 */

const FIXTURES = path.join(process.cwd(), 'src', 'fixtures');
/**
 * Waves 2 and 3 keep their own fixtures beside site.json, and a product
 * photo is an image like any other, so they are scanned for hosts too.
 */
const SITE_FILES = [
  path.join(FIXTURES, 'demo.json'),
  path.join(FIXTURES, 'local', 'site.json'),
  path.join(FIXTURES, 'local', 'store.json'),
  path.join(FIXTURES, 'local', 'guild.json'),
];
const IMPORT_FILES = [path.join(FIXTURES, 'demo-import.ndjson'), path.join(FIXTURES, 'local', 'import-events.ndjson')];

/**
 * The fields a fixture puts an image in: a work's or a series' media, an
 * asset on a record, a story block, a client's logo, the portrait. Animation
 * fields are left out: next/image does not optimize video or HTML, so their
 * hosts need no entry here.
 */
const IMAGE_FIELDS = new Set(['still', 'full', 'src', 'poster', 'portrait', 'image', 'logo', 'background', 'thumbnail']);

function addUrl(urls: Set<string>, value: unknown): void {
  if (typeof value === 'string' && value.startsWith('https://')) urls.add(value);
}

/** Walks a whole fixture, because records, story blocks and the landing page all carry images. */
function addImages(urls: Set<string>, value: unknown, key = ''): void {
  if (typeof value === 'string') {
    if (IMAGE_FIELDS.has(key)) addUrl(urls, value);
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) addImages(urls, entry, key);
    return;
  }
  if (typeof value !== 'object' || value === null) return;
  for (const [childKey, child] of Object.entries(value)) addImages(urls, child, childKey);
}

/** Every image URL a fixture can put on a page: stills, covers, assets, logos and the portrait. */
function imageUrls(): Set<string> {
  const urls = new Set<string>();

  for (const file of SITE_FILES) {
    let data: unknown;
    try {
      data = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
    } catch {
      continue;
    }
    addImages(urls, data);
  }

  // The import page shows the thumbnails a recorded run found.
  for (const file of IMPORT_FILES) {
    let text: string;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    for (const line of text.split('\n')) {
      if (!line.includes('"works"')) continue;
      let event: { works?: { thumbnail?: unknown; image?: unknown }[] };
      try {
        event = JSON.parse(line) as typeof event;
      } catch {
        continue;
      }
      for (const work of event.works ?? []) {
        addUrl(urls, work.thumbnail);
        addUrl(urls, work.image);
      }
    }
  }

  return urls;
}

/**
 * One pattern per host and path prefix, so a shared host (a marketplace CDN,
 * an IPFS gateway, a CMS that also serves an API) is allowed only under the
 * path the data uses, not as a general image proxy. A CMS puts every kind of
 * upload under /api or /media, so those two keep three segments
 * (/api/media/file/**) while everything else keeps one (/ipfs/**).
 */
const DEEP_PREFIXES = new Set(['api', 'media']);

function pathPrefix(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  // The last segment is the file itself.
  const directories = segments.slice(0, -1);
  if (!directories.length) return '/**';
  const depth = DEEP_PREFIXES.has(directories[0]) ? 3 : 1;
  return `/${directories.slice(0, depth).join('/')}/**`;
}

function remotePatterns(): RemotePattern[] {
  const seen = new Map<string, RemotePattern>();

  const add = (hostname: string, pathname: string) => {
    const key = `${hostname}${pathname}`;
    if (!seen.has(key)) seen.set(key, { protocol: 'https', hostname, pathname });
  };

  for (const value of imageUrls()) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      continue;
    }
    add(url.hostname, pathPrefix(url.pathname));
  }

  /**
   * The install's own origin, from settings.siteUrl. A self-hosted site
   * serves its media from itself (/api/media, /media/...), and that host is
   * in the settings long before a single image URL has been snapshotted.
   */
  const { siteUrl } = settings();
  if (siteUrl) {
    try {
      const url = new URL(siteUrl);
      if (url.protocol === 'https:') add(url.hostname, '/**');
    } catch {
      // A malformed siteUrl is the settings' problem, not the build's.
    }
  }

  for (const host of (process.env.RAISONNE_IMAGE_HOSTS ?? '').split(',')) {
    const hostname = host.trim();
    if (hostname) add(hostname, '/**');
  }

  return [...seen.values()];
}

// ---------------------------------------------------------------------------
// Settings: redirects
// ---------------------------------------------------------------------------

interface FixtureSettings {
  siteUrl?: string;
  maintenance?: { enabled?: unknown };
  redirects?: { from?: unknown; to?: unknown; permanent?: unknown }[];
}

/** The install's settings: its own data first, the demo's only as a fallback. */
function settings(): FixtureSettings {
  for (const file of [path.join(FIXTURES, 'local', 'site.json'), path.join(FIXTURES, 'demo.json')]) {
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8')) as { settings?: FixtureSettings };
      if (data.settings) return data.settings;
    } catch {
      continue;
    }
  }
  return {};
}

/**
 * Old URLs, from the data. A rule is kept only when both sides are site paths
 * and they differ, so a typo cannot put the site in a redirect loop.
 */
function redirects() {
  const rules: { source: string; destination: string; permanent: boolean }[] = [];

  for (const rule of settings().redirects ?? []) {
    const source = typeof rule.from === 'string' ? rule.from.trim() : '';
    const destination = typeof rule.to === 'string' ? rule.to.trim() : '';
    if (!source.startsWith('/') || !destination.startsWith('/')) continue;
    if (source === destination) continue;
    if (rules.some(existing => existing.source === source)) continue;
    rules.push({ source, destination, permanent: rule.permanent !== false });
  }

  return rules;
}

const nextConfig: NextConfig = {
  // The desktop preview opens 127.0.0.1. Without this, dev blocks the
  // client bundle and the header menus never attach.
  allowedDevOrigins: ['127.0.0.1'],
  images: {
    remotePatterns: remotePatterns(),
  },
  async redirects() {
    return redirects();
  },
  env: {
    /**
     * settings.maintenance.enabled, handed to src/proxy.ts. The proxy runs
     * before every request and reads no files: a filesystem call there makes
     * the build trace the whole project into the server output.
     * RAISONNE_MAINTENANCE overrides this at run time.
     */
    RAISONNE_MAINTENANCE_FROM_DATA: settings().maintenance?.enabled === true ? '1' : '0',
  },
};

export default nextConfig;
