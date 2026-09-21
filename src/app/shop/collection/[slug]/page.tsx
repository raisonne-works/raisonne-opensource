import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { AssetPlate } from '@/components/raisonne/story/asset';
import { RecordBreadcrumb } from '@/components/raisonne/records/record-breadcrumb';
import { BreadcrumbJsonLd } from '@/components/raisonne/seo/json-ld';
import { Container, PageHeader, Section } from '@/components/raisonne/shell/page';
import { PANEL_CLASS } from '@/components/raisonne/shell/measure';
import { CollectionStory } from '@/components/raisonne/store/collection-story';
import { SHOP_PATH, collectionHref, sortProducts } from '@/components/raisonne/store/lib';
import { ProductGrid, ProductGridEmpty } from '@/components/raisonne/store/product-card';
import { decodeParam } from '@/components/raisonne/works/lib';
import { getProductsInCollection, getSiteData, getStoreCollection, getStoreCollections } from '@/fixtures';
import { StoreSetupNotice } from '@/components/raisonne/store/setup-panel';
import { storeIsConfigured } from '@/components/raisonne/store/setup';
import { pageMetadata } from '@/lib/seo/metadata';
import type { Fact } from '@/lib/types';
import { FactsTable } from '@/components/raisonne/shell/facts';

/**
 * One collection: the cover, the artist's own words about it, and what is
 * still available from it.
 *
 * The words are the reason this is a page and not a filter. A collection
 * page with nothing written on it is still honest: it shows the cover and
 * the products, and prints no headings for passages nobody wrote.
 */

type Params = Promise<{ slug: string }>;

export const dynamicParams = false;

export function generateStaticParams() {
  return getStoreCollections().map(collection => ({ slug: collection.slug }));
}

async function resolve(params: Params) {
  const { slug } = await params;
  return getStoreCollection(decodeParam(slug)) ?? getStoreCollection(slug);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const collection = await resolve(params);
  if (!collection) return { title: 'Not found' };
  return pageMetadata(`store:collection:${collection.slug}`, {
    title: collection.name,
    description: collection.description ?? collection.statement,
    image: collection.cover?.kind === 'video' ? collection.cover.poster : collection.cover?.src,
    path: collectionHref(collection.slug),
  });
}

export default async function ShopCollectionPage({ params }: { params: Params }) {
  const collection = await resolve(params);
  if (!collection) notFound();

  const path = collectionHref(collection.slug);
  const products = sortProducts(getProductsInCollection(collection.slug), 'featured');
  const configured = storeIsConfigured(getSiteData().settings);

  const facts: Fact[] = [
    ...(typeof collection.year === 'number' ? [{ label: 'Year', value: String(collection.year) }] : []),
    ...(collection.medium ? [{ label: 'Medium', value: collection.medium }] : []),
    { label: 'In this collection', value: products.length === 1 ? 'One piece' : `${products.length} pieces` },
  ];

  return (
    <Container className="flex flex-col gap-6 pt-6 pb-16 md:pb-24">
      <RecordBreadcrumb parents={[{ href: SHOP_PATH, label: 'Shop' }]} current={collection.name} />
      <BreadcrumbJsonLd items={[{ name: 'Shop', path: SHOP_PATH }, { name: collection.name, path }]} />

      {collection.cover && collection.cover.kind === 'image' ? (
        <AssetPlate asset={collection.cover} sizes="(min-width: 1280px) 80vw, 100vw" className="max-h-[60svh]" />
      ) : null}

      <PageHeader
        eyebrow="Collection"
        title={collection.name}
        description={collection.description}
        className="py-0 md:py-0"
      />

      {/* The same sentence /shop, /cart, /checkout and the product page show.
          A visitor who lands here from a search should not find an ordinary
          shop that turns out not to sell anything. */}
      {configured ? null : <StoreSetupNotice className={PANEL_CLASS} />}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-12">
        <CollectionStory
          statement={collection.statement}
          vision={collection.vision}
          process={collection.process}
        />
        <FactsTable facts={facts} />
      </div>

      <Section title="Available" headingLevel={2} className="py-4 md:py-6">
        <ProductGrid
          products={products}
          priorityCount={4}
          empty={
            <ProductGridEmpty
              title="Nothing from this collection is for sale"
              description="The works are in the catalogue; nothing from this group is available to buy at the moment."
            />
          }
        />
      </Section>
    </Container>
  );
}
