import { getSiteData } from '@/fixtures';
import {
  type BreadcrumbEntry,
  type JsonLdNode,
  breadcrumbJsonLd,
  graph,
  organizationJsonLd,
  personJsonLd,
  webSiteJsonLd,
} from '@/lib/seo/json-ld';
import { siteOrigin } from '@/lib/seo/urls';

/**
 * The only place structured data is written into the document.
 *
 * The generators in src/lib/seo/json-ld.ts build the objects; this serializes
 * them. `<` is escaped on the way out so a title that happens to contain
 * "</script>" cannot close the tag it is inside.
 */
export function JsonLd({ data }: { data: JsonLdNode | JsonLdNode[] }) {
  const nodes = Array.isArray(data) ? data : [data];
  if (nodes.length === 0) return null;

  return (
    <>
      {nodes.map((node, index) => (
        <script
          // Structured data is inert: its order in the document is its only identity.
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(node).replace(/</g, '\\u003c') }}
        />
      ))}
    </>
  );
}

/**
 * The three entities every page on the site shares: who the artist is, the
 * studio behind the practice, and the catalogue as a website. They sit in one
 * @graph so the per-page entities can point at them by @id instead of
 * repeating the artist on every page.
 *
 * Mounted once in the root layout.
 */
export function SiteJsonLd() {
  const { artist, settings } = getSiteData();
  // Nothing is worth publishing while the site says it is closed.
  if (settings.maintenance.enabled) return null;

  const origin = siteOrigin(settings);

  return (
    <JsonLd
      data={graph(
        personJsonLd({ artist, origin }),
        organizationJsonLd({ artist, origin }),
        webSiteJsonLd({ artist, origin }),
      )}
    />
  );
}

/**
 * The trail a page sits on, for the crumb line search engines show under a
 * result. Give it the same steps the visible breadcrumb shows.
 */
export function BreadcrumbJsonLd({ items }: { items: BreadcrumbEntry[] }) {
  if (items.length === 0) return null;
  return <JsonLd data={breadcrumbJsonLd({ items, origin: siteOrigin(getSiteData().settings) })} />;
}
