import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import type { RawSearchParams } from '@/components/raisonne/catalogue/lib';
import { RecordBreadcrumb } from '@/components/raisonne/records/record-breadcrumb';
import { BreadcrumbJsonLd } from '@/components/raisonne/seo/json-ld';
import { Container, PageHeader, Section } from '@/components/raisonne/shell/page';
import { PANEL_CLASS } from '@/components/raisonne/shell/measure';
import {
  SHOP_PATH,
  categoryFacets,
  categoryHref,
  collectionFacets,
  isAddressableCategory,
  sortFrom,
  sortProducts,
} from '@/components/raisonne/store/lib';
import { ProductGrid, ProductGridEmpty } from '@/components/raisonne/store/product-card';
import { ShopFacets } from '@/components/raisonne/store/shop-facets';
import { decodeParam } from '@/components/raisonne/works/lib';
import {
  getProductCategories,
  getProductCategory,
  getProducts,
  getProductsInCategory,
  getSiteData,
  getStoreCollections,
} from '@/fixtures';
import { StoreSetupNotice } from '@/components/raisonne/store/setup-panel';
import { storeIsConfigured } from '@/components/raisonne/store/setup';
import { pageMetadata } from '@/lib/seo/metadata';
import { slot } from '@/lib/theme';

/**
 * One category of the shop: prints, books, objects, whatever this artist
 * sells. A category is a page rather than a filter because it carries the
 * artist's own description of what is in it.
 *
 * The categories are known at build time, like every other record, so the
 * pages are built and an unknown one is a 404 rather than an empty shelf.
 */

type Params = Promise<{ category: string }>;

export const dynamicParams = false;

export function generateStaticParams() {
  return getProductCategories()
    .filter(category => isAddressableCategory(category.slug))
    .map(category => ({ category: category.slug }));
}

async function resolve(params: Params) {
  const { category } = await params;
  const slug = decodeParam(category);
  if (!isAddressableCategory(slug)) return null;
  return getProductCategory(slug) ?? getProductCategory(category);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const category = await resolve(params);
  if (!category) return { title: 'Not found' };
  return pageMetadata(`store:${category.slug}`, {
    title: category.name,
    description: category.description,
    image: category.cover?.kind === 'video' ? category.cover.poster : category.cover?.src,
    path: categoryHref(category.slug),
  });
}

export default async function ShopCategoryPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<RawSearchParams>;
}) {
  slot('shop');
  const category = await resolve(params);
  if (!category) notFound();

  const sort = sortFrom((await searchParams).sort);
  const path = categoryHref(category.slug);
  const products = sortProducts(getProductsInCategory(category.slug), sort);
  const all = getProducts();
  const configured = storeIsConfigured(getSiteData().settings);

  return (
    <Container className="flex flex-col gap-6 pt-6 pb-16 md:pb-24">
      <RecordBreadcrumb parents={[{ href: SHOP_PATH, label: 'Shop' }]} current={category.name} />
      <BreadcrumbJsonLd items={[{ name: 'Shop', path: SHOP_PATH }, { name: category.name, path }]} />

      <PageHeader title={category.name} description={category.description} className="py-0 md:py-0" />

      {/* The same sentence /shop, /cart, /checkout and the product page show.
          A visitor who lands here from a search should not find an ordinary
          shop that turns out not to sell anything. */}
      {configured ? null : <StoreSetupNotice className={PANEL_CLASS} />}

      <Section className="py-4 md:py-6" headingLevel={2}>
        <ShopFacets
          categories={categoryFacets(getProductCategories(), all)}
          collections={collectionFacets(getStoreCollections(), all)}
          active={path}
          path={path}
          sort={sort}
          count={products.length}
        />
        <ProductGrid
          products={products}
          priorityCount={4}
          empty={
            <ProductGridEmpty
              title={`Nothing in ${category.name} yet`}
              description="Nothing is for sale in this part of the shop at the moment."
            />
          }
        />
      </Section>
    </Container>
  );
}
