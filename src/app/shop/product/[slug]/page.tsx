import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { RecordBreadcrumb } from '@/components/raisonne/records/record-breadcrumb';
import { RecordCard } from '@/components/raisonne/records/record-card';
import { resolveRecordRef } from '@/components/raisonne/records/resolve';
import { BreadcrumbJsonLd } from '@/components/raisonne/seo/json-ld';
import { RichTextView } from '@/components/raisonne/shell/rich-text';
import { Container, Section } from '@/components/raisonne/shell/page';
import { READING_CLASS } from '@/components/raisonne/shell/measure';
import { PhygitalOrder, ProductBuy } from '@/components/raisonne/store/product-buy';
import { ProductGallery } from '@/components/raisonne/store/product-gallery';
import { ProductJsonLd } from '@/components/raisonne/store/product-json-ld';
import {
  EditionLabels,
  ProductHighlights,
  ProductShipping,
  ProductSpecs,
  VariantTable,
} from '@/components/raisonne/store/product-details';
import { ProductGrid } from '@/components/raisonne/store/product-card';
import { storeIsConfigured } from '@/components/raisonne/store/setup';
import {
  SHOP_PATH,
  categoryHref,
  collectionHref,
  isAddressableCategory,
  productHref,
} from '@/components/raisonne/store/lib';
import { decodeParam, seriesTitle } from '@/components/raisonne/works/lib';
import {
  getPhygitals,
  getProduct,
  getProductCategory,
  getProducts,
  getSeries,
  getShippingMethods,
  getSiteData,
  getStore,
  getStoreCollection,
} from '@/fixtures';
import { isModuleEnabled } from '@/lib/records';
import { pageMetadata } from '@/lib/seo/metadata';
import { siteOrigin } from '@/lib/seo/urls';
import type { Asset, PhygitalProduct, Product, Series } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * One product: its pictures, what it is, what it costs, and the way to buy
 * it.
 *
 * Two things this page does that a shop template usually does not. It links
 * back to the work in the catalogue the object was made from, because that
 * link is the point of an artist's shop. And it never lets the browser
 * decide a price: what the buy panel shows comes from the fixtures, and the
 * cart is priced again on the server before any total is shown.
 */

type Params = Promise<{ slug: string }>;

export const dynamicParams = false;

export function generateStaticParams() {
  // Hidden products are left out of every listing and still have a page: the
  // artist hands the URL to one collector. So the pages are built from the
  // store itself rather than from what the shop shows.
  const store = getStore();
  return [...(store?.products ?? []), ...(store?.phygitals ?? [])].map(product => ({ slug: product.slug }));
}

async function resolve(params: Params): Promise<Product | null> {
  const { slug } = await params;
  return getProduct(decodeParam(slug)) ?? getProduct(slug);
}

function coverImage(product: Product): string | null {
  const cover = product.cover ?? product.gallery[0] ?? null;
  if (!cover) return null;
  return cover.kind === 'video' ? cover.poster : cover.src;
}

/** A product only holders may order. The shop lists it; the commission flow takes it. */
function asPhygital(product: Product): PhygitalProduct | null {
  const phygital = getPhygitals().find(entry => entry.slug === product.slug) ?? null;
  if (!phygital) return null;
  return phygital.pickWork || (phygital.requiresSeriesSlugs?.length ?? 0) > 0 ? phygital : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const product = await resolve(params);
  if (!product) return { title: 'Not found' };
  return pageMetadata(`store:product:${product.slug}`, {
    title: product.seo?.title ?? product.title,
    description: product.seo?.description ?? product.description ?? product.subtitle,
    image: product.seo?.image ?? coverImage(product),
    path: productHref(product.slug),
    keywords: product.tags,
  });
}

export default async function ProductPage({ params }: { params: Params }) {
  const product = await resolve(params);
  if (!product) notFound();

  const path = productHref(product.slug);
  const { artist, settings } = getSiteData();
  const configured = storeIsConfigured(settings);
  const commissionsOpen = isModuleEnabled(settings, 'commissions');

  const category = product.categorySlug ? getProductCategory(product.categorySlug) : null;
  const collection = product.collectionSlug ? getStoreCollection(product.collectionSlug) : null;
  const work = product.work ? resolveRecordRef(product.work) : null;
  const phygital = asPhygital(product);
  const seriesNames = (phygital?.requiresSeriesSlugs ?? [])
    .map(slug => getSeries(slug))
    .filter((series): series is Series => series !== null)
    .map(series => seriesTitle(series));

  const gallery = [product.cover, ...product.gallery].filter((asset): asset is Asset => asset !== null);
  const methods = getShippingMethods();

  const related = getProducts()
    .filter(
      other =>
        other.slug !== product.slug &&
        ((collection && other.collectionSlug === collection.slug) ||
          (category && other.categorySlug === category.slug)),
    )
    .slice(0, 4);

  const parents = [
    { href: SHOP_PATH, label: 'Shop' },
    ...(category && isAddressableCategory(category.slug)
      ? [{ href: categoryHref(category.slug), label: category.name }]
      : []),
  ];

  return (
    <Container className="flex flex-col gap-6 pt-6 pb-16 md:pb-24">
      <RecordBreadcrumb parents={parents} current={product.title} />
      <BreadcrumbJsonLd
        items={[
          { name: 'Shop', path: SHOP_PATH },
          ...(category && isAddressableCategory(category.slug)
            ? [{ name: category.name, path: categoryHref(category.slug) }]
            : []),
          { name: product.title, path },
        ]}
      />
      <ProductJsonLd
        product={product}
        origin={siteOrigin(settings)}
        path={path}
        artistName={artist.name}
        image={coverImage(product)}
      />

      <div className="grid gap-8 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] xl:gap-12">
        <ProductGallery assets={gallery} title={product.title} />

        <div className="flex min-w-0 flex-col gap-6 xl:sticky xl:top-20 xl:self-start">
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-balance">{product.title}</h1>
            {product.subtitle ? <p className="text-base text-muted-foreground">{product.subtitle}</p> : null}
            <EditionLabels product={product} />
            {product.description ? (
              <p className={cn('text-base text-pretty text-muted-foreground', READING_CLASS)}>{product.description}</p>
            ) : null}
            {collection ? (
              <p className="text-sm text-muted-foreground">
                Part of{' '}
                <Link
                  href={collectionHref(collection.slug)}
                  className="rounded-sm underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {collection.name}
                </Link>
                .
              </p>
            ) : null}
          </div>

          {phygital ? (
            <PhygitalOrder
              title={product.title}
              seriesNames={seriesNames}
              requestHref={commissionsOpen ? '/commissions/request' : null}
              email={artist.email ?? null}
            />
          ) : (
            <ProductBuy product={product} paymentsConfigured={configured} />
          )}

          <ProductHighlights highlights={product.highlights ?? []} />
        </div>
      </div>

      {product.body ? (
        <Section title="About this piece" headingLevel={2} className="py-4 md:py-6">
          <div className={READING_CLASS}>
            <RichTextView value={product.body} />
          </div>
        </Section>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <Section title="Details" headingLevel={2} size="small" className="py-4 md:py-6">
          <ProductSpecs product={product} />
          <VariantTable product={product} />
        </Section>
        <Section title="Getting it to you" headingLevel={2} size="small" className="py-4 md:py-6">
          <ProductShipping product={product} methods={methods} />
        </Section>
      </div>

      {work ? (
        <Section
          title="Made from"
          description="The work in the catalogue this object comes from."
          headingLevel={2}
          className="py-4 md:py-6"
        >
          <div className="max-w-64">
            <RecordCard preview={work} sizes="256px" />
          </div>
        </Section>
      ) : null}

      {related.length > 0 ? (
        <Section title="More from the shop" headingLevel={2} className="py-4 md:py-6">
          <ProductGrid products={related} />
        </Section>
      ) : null}
    </Container>
  );
}
