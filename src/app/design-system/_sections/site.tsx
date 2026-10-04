import type { ReactNode } from 'react';
import Image from 'next/image';
import { CheckIcon, MinusIcon } from 'lucide-react';

import manifest from '@/app/manifest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import { LegalPage } from '@/components/raisonne/shell/legal-page';
import { MaintenanceNotice } from '@/components/raisonne/shell/maintenance';
import { Section } from '@/components/raisonne/shell/page';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getCounts, getSiteData } from '@/fixtures';
import { isModuleEnabled } from '@/lib/records';
import {
  type JsonLdNode,
  articleJsonLd,
  breadcrumbJsonLd,
  exhibitionJsonLd,
  faqJsonLd,
  graph,
  homePageJsonLd,
  imageGalleryJsonLd,
  nftCollectionJsonLd,
  organizationJsonLd,
  personJsonLd,
  productJsonLd,
  profilePageJsonLd,
  visualArtworkJsonLd,
  webSiteJsonLd,
} from '@/lib/seo/json-ld';
import { LEGAL_PAGES, legalBody, legalLinks } from '@/lib/seo/legal';
import { defaultMetadata } from '@/lib/seo/metadata';
import { siteOrigin } from '@/lib/seo/urls';
import { newsletterEndpoint } from '@/lib/newsletter';
import type { ModuleId } from '@/lib/types';

import { Specimen, SpecimenGrid } from '../_foundations/specimen';

/**
 * Site: everything a visitor never sees directly and every page depends on.
 * Share cards, structured data, the legal and maintenance pages, the module
 * switches, and the two endpoints (the sign-up write and the read-only
 * catalogue API).
 *
 * Every panel here reads the install's own data and calls the real
 * generators, so this page is also the quickest way to check what this
 * install actually publishes.
 */

export const SITE_TOPICS = [
  { id: 'site-share', label: 'Share card' },
  { id: 'site-structured-data', label: 'Structured data' },
  { id: 'site-crawlers', label: 'Sitemap and robots' },
  { id: 'site-modules', label: 'Module switches' },
  { id: 'site-endpoints', label: 'Endpoints' },
  { id: 'site-legal', label: 'Legal pages' },
  { id: 'site-maintenance', label: 'Maintenance' },
] as const;

const SUBSECTION_CLASS = 'py-6 md:py-8';

function Json({ value }: { value: unknown }) {
  return (
    <pre className="max-h-96 w-full overflow-auto rounded-lg border bg-muted/40 p-4 font-mono text-xs leading-relaxed">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function Yes({ on }: { on: boolean }) {
  return on ? (
    <Badge variant="secondary">
      <CheckIcon aria-hidden="true" />
      On
    </Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground">
      <MinusIcon aria-hidden="true" />
      Off
    </Badge>
  );
}

function Rows({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid w-full gap-x-6 gap-y-2 text-sm sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
      {rows.map(row => (
        <div key={row.label} className="contents">
          <dt className="text-muted-foreground">{row.label}</dt>
          <dd className="min-w-0 break-words">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* Share card -------------------------------------------------------------- */

function ShareCard() {
  const { artist } = getSiteData();
  const metadata = defaultMetadata();

  return (
    <Section
      id="site-share"
      title="Share card"
      headingLevel={3}
      className={SUBSECTION_CLASS}
      description="The picture and the words a link to this site turns into. Pages with a work or a cover of their own set that image instead; this is what everything else falls back to, drawn from the data so a fresh install never ships a broken preview."
    >
      <SpecimenGrid>
        <Specimen
          title="Default card"
          source="app/opengraph-image.tsx"
          span={2}
          stageClassName="block"
          note="1200 by 630, drawn at build time. No web font is loaded: a card in the built-in face is better than a card that fails to build."
        >
          <Image
            src="/opengraph-image"
            alt={`The default share card for ${artist.name}`}
            width={1200}
            height={630}
            unoptimized
            className="h-auto w-full rounded-lg border"
          />
        </Specimen>

        <Specimen title="Site defaults" source="lib/seo/metadata.ts" stageClassName="block">
          <Rows
            rows={[
              { label: 'Title template', value: <code className="font-mono text-xs">{`%s | ${artist.name}`}</code> },
              { label: 'Description', value: String(metadata.description ?? '') },
              { label: 'Canonical base', value: <code className="font-mono text-xs">{siteOrigin()}</code> },
              { label: 'Card type', value: 'summary_large_image' },
            ]}
          />
        </Specimen>

        <Specimen
          title="Manifest"
          source="app/manifest.ts"
          stageClassName="block"
          note="Served at /manifest.webmanifest, so the catalogue can be installed to a home screen under the artist's name."
        >
          <Json value={manifest()} />
        </Specimen>
      </SpecimenGrid>
    </Section>
  );
}

/* Structured data ---------------------------------------------------------- */

function StructuredData() {
  const data = getSiteData();
  const { artist, settings } = data;
  const origin = siteOrigin(settings);
  const counts = getCounts();

  const series = data.series.find(entry => !entry.hidden) ?? null;
  const work = data.works.find(entry => !entry.hidden) ?? null;
  const exhibition = data.exhibitions[0] ?? null;
  const physical = data.physicalWorks[0] ?? null;
  const writing = data.writings[0] ?? null;
  const gallery = data.installations.find(entry => entry.photos.length > 0) ?? null;

  const samples: { label: string; node: JsonLdNode }[] = [];
  const show = (label: string, node: JsonLdNode | null) => {
    if (node) samples.push({ label, node });
  };

  show(
    'Site graph (Person, Organization, WebSite)',
    graph(personJsonLd({ artist, origin }), organizationJsonLd({ artist, origin }), webSiteJsonLd({ artist, origin })),
  );
  show('HomePage', homePageJsonLd({ artist, counts, origin }));
  show('ProfilePage', profilePageJsonLd({ artist, origin }));
  show('NFTCollection', series ? nftCollectionJsonLd({ series, origin, path: `/works/${series.slug}` }) : null);
  show(
    'VisualArtwork',
    work
      ? visualArtworkJsonLd({
          work,
          series: data.series.find(entry => entry.slug === work.seriesSlug) ?? null,
          artist,
          origin,
          path: `/works/${work.seriesSlug}/${work.tokenId}`,
        })
      : null,
  );
  show(
    'ExhibitionEvent',
    exhibition
      ? exhibitionJsonLd({ exhibition, origin, path: exhibition.slug ? `/exhibitions/${exhibition.slug}` : null })
      : null,
  );
  show(
    'Article',
    writing
      ? articleJsonLd({
          origin,
          path: `/writings/${writing.slug}`,
          headline: writing.title,
          description: writing.description,
          datePublished: writing.publishedAt,
          authors: writing.authors,
          publisher: writing.publishedIn,
        })
      : null,
  );
  show(
    'Product',
    physical ? productJsonLd({ work: physical, artist, origin, path: `/physical-works/${physical.slug}` }) : null,
  );
  show(
    'ImageGallery',
    gallery
      ? imageGalleryJsonLd({
          name: gallery.title,
          description: gallery.description,
          origin,
          path: `/immersive/${gallery.slug}`,
          images: gallery.photos,
        })
      : null,
  );
  show(
    'BreadcrumbList',
    breadcrumbJsonLd({
      items: [
        { name: 'Home', path: '/' },
        { name: 'Works', path: '/works' },
        { name: series?.displayTitle ?? series?.name ?? 'A series' },
      ],
      origin,
    }),
  );
  show(
    'FAQPage',
    faqJsonLd({
      items: [
        {
          question: 'Is this catalogue complete?',
          answer: `It holds ${counts.works} works across ${counts.series} series.`,
        },
      ],
    }),
  );

  return (
    <Section
      id="site-structured-data"
      title="Structured data"
      headingLevel={3}
      className={SUBSECTION_CLASS}
      description="Thirteen schema.org generators in src/lib/seo/json-ld.ts, rendered by one component. They are pure functions of the domain types, so what a search engine reads is exactly what the page shows. The samples below are built from this install's own records."
    >
      {samples.length < 5 ? (
        <Alert>
          <AlertTitle>Some generators have no sample</AlertTitle>
          <AlertDescription>
            This install has no record of that kind yet, so only the entities it can fill are shown.
          </AlertDescription>
        </Alert>
      ) : null}

      <SpecimenGrid>
        {samples.map(sample => (
          <Specimen key={sample.label} title={sample.label} source="lib/seo/json-ld.ts" stageClassName="block">
            <Json value={sample.node} />
          </Specimen>
        ))}
      </SpecimenGrid>
    </Section>
  );
}

/* Sitemap and robots ------------------------------------------------------- */

function Crawlers() {
  const { settings } = getSiteData();
  const entries = sitemap();
  const policy = robots();

  const byPrefix = new Map<string, number>();
  for (const entry of entries) {
    const path = new URL(entry.url).pathname;
    const prefix = `/${path.split('/').filter(Boolean)[0] ?? ''}`;
    byPrefix.set(prefix, (byPrefix.get(prefix) ?? 0) + 1);
  }

  return (
    <Section
      id="site-crawlers"
      title="Sitemap and robots"
      headingLevel={3}
      className={SUBSECTION_CLASS}
      description="Both are generated from the data, so a site with no installations lists none and a module that is switched off disappears from both. Nothing under /_next/ is ever blocked: the images a search engine should find are served from there."
    >
      <SpecimenGrid>
        <Specimen
          title="Sitemap"
          source="app/sitemap.ts"
          stageClassName="block"
          note={`${entries.length.toLocaleString('en-US')} URLs at /sitemap.xml. Hidden series and works are left out, as they are from the catalogue.`}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Section</TableHead>
                <TableHead className="text-right">URLs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...byPrefix.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([prefix, count]) => (
                  <TableRow key={prefix}>
                    <TableCell className="font-mono text-xs">{prefix === '/' ? '/ (home)' : prefix}</TableCell>
                    <TableCell className="text-right tabular-nums">{count.toLocaleString('en-US')}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </Specimen>

        <Specimen
          title="robots.txt"
          source="app/robots.ts"
          stageClassName="block"
          note={
            settings.allowAiCrawlers
              ? 'settings.allowAiCrawlers is on: assistants and training crawlers read the artist’s own pages rather than a marketplace listing.'
              : 'settings.allowAiCrawlers is off: the named AI crawlers are disallowed. Search engines are not.'
          }
        >
          <Json value={policy} />
        </Specimen>
      </SpecimenGrid>
    </Section>
  );
}

/* Modules ------------------------------------------------------------------ */

const MODULE_LABELS: Record<ModuleId, string> = {
  showreel: 'Showreel on the home page',
  ticker: 'Studio clock and practice keywords',
  partners: 'Client and partner logos',
  news: 'Announcements and upcoming events',
  newsletter: 'Newsletter sign-up',
  drops: 'Drop pages',
  commissions: 'Commissions page',
  writings: 'Writings',
  'immersive-rooms': 'Immersive rooms (3D story block)',
  collectors: 'Collector accounts (Wave 2)',
  insights: 'Market insights (Wave 2)',
  store: 'Store and checkout (Wave 3)',
};

function Modules() {
  const { settings } = getSiteData();
  const ids = Object.keys(MODULE_LABELS) as ModuleId[];

  return (
    <Section
      id="site-modules"
      title="Module switches"
      headingLevel={3}
      className={SUBSECTION_CLASS}
      description="Parts of the site an install can switch off. A module that is off has no nav entry, no page, no sitemap entry and no catalogue API records: it is absent, not hidden. isModuleEnabled(settings, id) is the only check."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Module</TableHead>
            <TableHead>Id</TableHead>
            <TableHead className="text-right">This install</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ids.map(id => (
            <TableRow key={id}>
              <TableCell>{MODULE_LABELS[id]}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">{id}</TableCell>
              <TableCell className="text-right">
                <Yes on={isModuleEnabled(settings, id)} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Section>
  );
}

/* Endpoints ---------------------------------------------------------------- */

function Endpoints() {
  const { settings } = getSiteData();
  const endpoint = newsletterEndpoint();
  const redirects = settings.redirects ?? [];

  return (
    <Section
      id="site-endpoints"
      title="Endpoints, analytics and redirects"
      headingLevel={3}
      className={SUBSECTION_CLASS}
      description="The two routes that are not pages, the analytics the install chose, and the old URLs it still answers."
    >
      <SpecimenGrid>
        <Specimen
          title="Newsletter"
          source="app/api/newsletter/route.ts"
          stageClassName="block"
          note="The only write in Wave 1. With no endpoint configured the form is not rendered at all, so nothing ever reports a success it did not have."
        >
          <Rows
            rows={[
              { label: 'Module', value: <Yes on={isModuleEnabled(settings, 'newsletter')} /> },
              { label: 'Endpoint', value: endpoint ? <code className="font-mono text-xs">{new URL(endpoint).origin}</code> : 'Not configured (RAISONNE_NEWSLETTER_URL)' },
              { label: 'Rate limit', value: '5 a minute per address' },
              { label: 'Honeypot', value: 'A hidden field; a filled one gets the same success a person gets' },
            ]}
          />
        </Specimen>

        <Specimen
          title="Catalogue API"
          source="app/api/catalogue/[[...path]]/route.ts"
          stageClassName="block"
          note="Read only. GET and HEAD answer; every other method answers 405. Anything whose name reads like personal data answers 404, switched on or not."
        >
          <Rows
            rows={[
              { label: 'Index', value: <code className="font-mono text-xs">/api/catalogue</code> },
              { label: 'A list', value: <code className="font-mono text-xs">/api/catalogue/series?limit=100&amp;offset=0</code> },
              { label: 'One record', value: <code className="font-mono text-xs">/api/catalogue/series/&lt;slug&gt;</code> },
              { label: 'A global', value: <code className="font-mono text-xs">/api/catalogue/globals/artist</code> },
            ]}
          />
        </Specimen>

        <Specimen title="Analytics" source="components/raisonne/seo/site-analytics.tsx" stageClassName="block">
          <Rows
            rows={[
              { label: 'Provider', value: settings.analytics.provider },
              { label: 'Id', value: settings.analytics.id ?? 'None, so no script loads' },
            ]}
          />
        </Specimen>

        <Specimen
          title="Old-URL redirects"
          source="next.config.ts"
          stageClassName="block"
          note="settings.redirects, applied at build. Redirects are data because every install renames its routes differently."
        >
          {redirects.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead className="text-right">Permanent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {redirects.map(rule => (
                  <TableRow key={rule.from}>
                    <TableCell className="font-mono text-xs">{rule.from}</TableCell>
                    <TableCell className="font-mono text-xs">{rule.to}</TableCell>
                    <TableCell className="text-right">
                      <Yes on={rule.permanent} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">
              None yet. Add them to settings.redirects and rebuild.
            </p>
          )}
        </Specimen>
      </SpecimenGrid>
    </Section>
  );
}

/* Legal -------------------------------------------------------------------- */

function Legal() {
  const { settings, artist } = getSiteData();
  const links = legalLinks(settings);

  return (
    <Section
      id="site-legal"
      title="Legal pages"
      headingLevel={3}
      className={SUBSECTION_CLASS}
      description="Privacy and terms, written in the settings and rendered in one reading column. A page with nothing written stays out of the footer, out of the sitemap and out of search results, and says so plainly when someone types the address."
    >
      <p className="text-sm text-muted-foreground">
        {links.length
          ? `This install publishes: ${links.map(page => page.title.toLowerCase()).join(' and ')}.`
          : 'This install publishes neither yet, so both pages show the state below.'}
      </p>

      <SpecimenGrid>
        <Specimen title="Written" source="components/raisonne/shell/legal-page.tsx" span="full" stageClassName="block p-0 sm:p-0">
          <div className="max-h-[32rem] overflow-auto">
            <LegalPage
              page={LEGAL_PAGES.privacy}
              body={legalBody(settings, 'privacy') ?? SAMPLE_POLICY}
              updatedAt={settings.legal.updatedAt}
              contactEmail={artist.email}
            />
          </div>
        </Specimen>

        <Specimen title="Nothing published" source="components/raisonne/shell/legal-page.tsx" span="full" stageClassName="block p-0 sm:p-0">
          <LegalPage page={LEGAL_PAGES.terms} body={null} />
        </Specimen>
      </SpecimenGrid>
    </Section>
  );
}

/** Shown only when the install has written no policy, so the panel has something to render. */
const SAMPLE_POLICY = [
  {
    type: 'paragraph' as const,
    children: [
      {
        text: 'This is placeholder text, shown because this install has not written a privacy policy yet. Write yours in the site settings and it replaces this.',
      },
    ],
  },
  { type: 'heading' as const, level: 2 as const, children: [{ text: 'What this site records' }] },
  {
    type: 'list' as const,
    ordered: false,
    items: [[{ text: 'Nothing, unless the artist switches on analytics.' }], [{ text: 'An email address, if a visitor signs up for the newsletter.' }]],
  },
];

/* Maintenance -------------------------------------------------------------- */

function Maintenance() {
  const { artist, settings } = getSiteData();

  return (
    <Section
      id="site-maintenance"
      title="Maintenance"
      headingLevel={3}
      className={SUBSECTION_CLASS}
      description="With settings.maintenance.enabled on, src/proxy.ts sends every address here, robots disallows everything, the sitemap is empty and the page is never indexed. RAISONNE_MAINTENANCE=1 does the same without touching the data."
    >
      <SpecimenGrid>
        <Specimen title="Closed" source="components/raisonne/shell/maintenance.tsx" span="full" stageClassName="block p-0 sm:p-0">
          <MaintenanceNotice artist={artist} maintenance={{ enabled: true, message: settings.maintenance.message }} />
        </Specimen>

        <Specimen
          title="Open, looked at directly"
          source="components/raisonne/shell/maintenance.tsx"
          span="full"
          stageClassName="block p-0 sm:p-0"
          note="The artist can see the page before switching the site off, and is told that nothing is redirected yet."
        >
          <MaintenanceNotice artist={artist} maintenance={{ enabled: false, message: null }} preview />
        </Specimen>
      </SpecimenGrid>
    </Section>
  );
}

export function SiteSection() {
  return (
    <div className="flex flex-col">
      <ShareCard />
      <StructuredData />
      <Crawlers />
      <Modules />
      <Endpoints />
      <Legal />
      <Maintenance />
    </div>
  );
}
