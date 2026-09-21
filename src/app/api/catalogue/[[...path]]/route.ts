import { NextResponse } from 'next/server';

import { getCounts, getSiteData } from '@/fixtures';
import { isModuleEnabled } from '@/lib/records';
import type { ModuleId, SiteData } from '@/lib/types';

/**
 * The catalogue, machine readable.
 *
 * A catalogue raisonne is a reference work: a researcher, a museum registrar
 * or another artist's site has to be able to read the records without
 * scraping the HTML, and a self-hosted install has to be able to offer that
 * without handing out a CMS credential or a single personal detail.
 *
 *   GET /api/catalogue                     what this install publishes
 *   GET /api/catalogue/<type>              a list, paged
 *   GET /api/catalogue/<type>/<key>        one record
 *   GET /api/catalogue/globals/<slug>      the artist, the landing page, the CV
 *
 * The segment is optional so the index answers at /api/catalogue itself.
 *
 * Three rules it never bends:
 *
 *  - Read only. GET and HEAD answer; POST, PUT, PATCH and DELETE answer 405
 *    with an Allow header. There is no write path to reach.
 *  - The refusal list is derived, not hand kept. Everything this endpoint can
 *    serve is named in PUBLIC_TYPES and PUBLIC_GLOBALS below, so a type the
 *    install adds later is invisible here until someone lists it. On top of
 *    that, any name that reads like personal data is refused outright, even
 *    if it is listed, so a future "collector-rewards" cannot be published by
 *    accident.
 *  - The shapes are the shapes the pages render: the domain types in
 *    src/lib/types.ts, hidden records left out, the same order the site uses.
 */

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// What is public
// ---------------------------------------------------------------------------

interface PublicType {
  /** Where the records live in SiteData. */
  from: (data: SiteData) => unknown[];
  /** The field a single record is looked up by. */
  key: (record: never) => string;
  /** The record is hidden from listings. */
  hidden?: (record: never) => boolean;
  /** The list disappears entirely when this module is off. */
  module?: ModuleId;
}

function bySlug(record: { slug: string }): string {
  return record.slug;
}

const PUBLIC_TYPES: Record<string, PublicType> = {
  series: {
    from: data => data.series,
    key: bySlug as PublicType['key'],
    hidden: ((record: { hidden?: boolean }) => record.hidden === true) as PublicType['hidden'],
  },
  works: {
    from: data => data.works,
    key: ((record: { id: string }) => record.id) as PublicType['key'],
    hidden: ((record: { hidden?: boolean }) => record.hidden === true) as PublicType['hidden'],
  },
  installations: { from: data => data.installations, key: bySlug as PublicType['key'] },
  immersives: { from: data => data.immersives, key: bySlug as PublicType['key'] },
  'physical-works': { from: data => data.physicalWorks, key: bySlug as PublicType['key'] },
  exhibitions: {
    from: data => data.exhibitions,
    key: ((record: { slug?: string | null; id: string }) => record.slug ?? record.id) as PublicType['key'],
  },
  collaborations: { from: data => data.collaborations, key: bySlug as PublicType['key'] },
  awards: {
    from: data => data.awards,
    key: ((record: { slug?: string | null; id: string }) => record.slug ?? record.id) as PublicType['key'],
  },
  writings: { from: data => data.writings, key: bySlug as PublicType['key'], module: 'writings' },
  press: {
    from: data => data.press,
    key: ((record: { slug?: string | null; id: string }) => record.slug ?? record.id) as PublicType['key'],
  },
  drops: { from: data => data.drops, key: bySlug as PublicType['key'], module: 'drops' },
};

/**
 * The single records that are one per site. `commissions` is deliberately not
 * here: see SENSITIVE below.
 */
const PUBLIC_GLOBALS: Record<string, (data: SiteData) => unknown> = {
  artist: data => data.artist,
  landing: data => data.landing,
  cv: data => data.cv,
  settings: data => data.settings,
  pages: data => data.pages,
  counts: () => getCounts(),
};

/**
 * Words that name people rather than works. Any requested name containing one
 * is refused with 404, whether or not this install has such a type and
 * whether or not the module is switched on: a 403 would confirm that the
 * records exist.
 *
 * "commission" is on the list because in every CMS this endpoint could be
 * pointed at, a commissions collection holds inbound enquiries with names,
 * addresses and budgets. The commissions page's own copy is already public on
 * /commissions, which is where it belongs.
 */
const SENSITIVE = [
  'collector',
  'customer',
  'order',
  'commission',
  'subscriber',
  'subscription',
  'credential',
  'password',
  'secret',
  'apikey',
  'api-key',
  'token-holder',
  'member',
  'user',
  'account',
  'session',
  'payment',
  'invoice',
  'checkout',
  'cart',
  'address',
  'newsletter',
  'waitlist',
  'allow-list',
  'allowlist',
  'audit',
  'preference',
  'magic-link',
  'nonce',
  'lead',
  'enquiry',
  'inquiry',
  'brief',
  'message',
];

function isSensitive(segment: string): boolean {
  const name = segment.toLowerCase();
  return SENSITIVE.some(word => name.includes(word));
}

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------

/**
 * Cached at the edge for five minutes: the data only changes when the site is
 * rebuilt, and a reference API that falls over under a crawler is no use.
 * Never indexed: the pages are the readable version.
 */
const HEADERS = {
  'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400',
  'X-Robots-Tag': 'noindex',
  'X-Content-Type-Options': 'nosniff',
} as const;

function json(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: HEADERS });
}

function notFound(): NextResponse {
  return json({ error: 'Not found' }, 404);
}

function methodNotAllowed(): NextResponse {
  return NextResponse.json(
    { error: 'This catalogue is read only.' },
    { status: 405, headers: { 'Cache-Control': 'no-store', Allow: 'GET, HEAD, OPTIONS' } },
  );
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1000;

function number(value: string | null, fallback: number, max: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.min(parsed, max);
}

function index(): NextResponse {
  const data = getSiteData();
  const types = Object.entries(PUBLIC_TYPES)
    .filter(([, type]) => !type.module || isModuleEnabled(data.settings, type.module))
    .map(([name, type]) => ({
      name,
      href: `/api/catalogue/${name}`,
      total: visible(data, type).length,
    }));

  return json({
    artist: data.artist.name,
    counts: getCounts(),
    types,
    globals: Object.keys(PUBLIC_GLOBALS).map(name => ({ name, href: `/api/catalogue/globals/${name}` })),
    readOnly: true,
  });
}

function visible(data: SiteData, type: PublicType): unknown[] {
  const records = type.from(data);
  const hidden = type.hidden;
  return hidden ? records.filter(record => !hidden(record as never)) : records;
}

function handle(pathname: string[], search: URLSearchParams): NextResponse {
  // Anything that reads like personal data is refused before it is looked up.
  if (pathname.some(isSensitive)) return notFound();

  if (pathname.length === 0) return index();

  const data = getSiteData();
  const [first, second, ...rest] = pathname;
  if (rest.length) return notFound();

  if (first === 'globals') {
    const read = second ? PUBLIC_GLOBALS[second] : undefined;
    if (!read) return notFound();
    const value = read(data);
    if (value === null || value === undefined) return notFound();
    return json({ global: second, record: value });
  }

  const type = PUBLIC_TYPES[first];
  if (!type) return notFound();
  // A module that is off has no pages, so it has no records here either.
  if (type.module && !isModuleEnabled(data.settings, type.module)) return notFound();

  const records = visible(data, type);

  if (second !== undefined) {
    const key = decodeURIComponent(second);
    const record = records.find(entry => type.key(entry as never) === key);
    return record ? json({ type: first, record }) : notFound();
  }

  const limit = number(search.get('limit'), DEFAULT_LIMIT, MAX_LIMIT);
  const offset = number(search.get('offset'), 0, Number.MAX_SAFE_INTEGER);
  const page = records.slice(offset, offset + limit);
  const nextOffset = offset + page.length;

  return json({
    type: first,
    total: records.length,
    limit,
    offset,
    next: nextOffset < records.length ? `/api/catalogue/${first}?limit=${limit}&offset=${nextOffset}` : null,
    records: page,
  });
}

// ---------------------------------------------------------------------------
// The route
// ---------------------------------------------------------------------------

type Context = { params: Promise<{ path?: string[] }> };

export async function GET(request: Request, { params }: Context): Promise<Response> {
  const { path } = await params;
  return handle(path ?? [], new URL(request.url).searchParams);
}

export async function HEAD(request: Request, { params }: Context): Promise<Response> {
  const { path } = await params;
  const response = handle(path ?? [], new URL(request.url).searchParams);
  const headers = new Headers(response.headers);
  // The body is dropped, so its length must not be claimed.
  headers.delete('content-length');
  return new NextResponse(null, { status: response.status, headers });
}

export function POST(): Response {
  return methodNotAllowed();
}

export function PUT(): Response {
  return methodNotAllowed();
}

export function PATCH(): Response {
  return methodNotAllowed();
}

export function DELETE(): Response {
  return methodNotAllowed();
}
