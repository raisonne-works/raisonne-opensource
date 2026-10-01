import type { Metadata } from 'next';

import type { RawSearchParams } from '@/components/raisonne/catalogue/lib';
import { Container, PageHeader, Section } from '@/components/raisonne/shell/page';
import { PANEL_CLASS } from '@/components/raisonne/shell/measure';
import { ProductGrid } from '@/components/raisonne/store/product-card';
import { SHOP_PATH, categoryFacets, collectionFacets, sortFrom, sortProducts } from '@/components/raisonne/store/lib';
import { InstallerPanel } from '@/components/raisonne/shell/installer-panel';
import { StoreSetupNotice } from '@/components/raisonne/store/setup-panel';
import { storeIsConfigured } from '@/components/raisonne/store/setup';
import { ShopFacets } from '@/components/raisonne/store/shop-facets';
import { CollectionStrip, FeaturedProduct } from '@/components/raisonne/store/store-front';
import { getProduct, getProductCategories, getProducts, getSiteData, getStore, getStoreCollections } from '@/fixtures';
import { pageMetadata } from '@/lib/seo/metadata';
import type { Product } from '@/lib/types';
import { slot } from '@/lib/theme';

/**
 * The shop front: one product given room, the collections the artist made,
 * and then everything, with its sections and its order in the URL.
 *
 * Nothing on this page is chosen for the artist. The featured product is the
 * one they marked, the collections are the ones they wrote, and an install
 * that marked nothing simply opens on the grid. There is no "you may also
 * like", because a shop of thirty prints does not need a recommender and a
 * catalogue raisonne should not guess at taste.
 */

export function generateMetadata(): Metadata {
  const store = getStore();
  const { artist } = getSiteData();
  return pageMetadata('store', {
    title: store?.page?.title ?? 'Shop',
    description:
      store?.page?.description ?? `Prints, books and objects from the studio of ${artist.name}.`,
    path: SHOP_PATH,
  });
}

/** The product the artist put first, if they named one that is still for sale. */
function featuredProduct(products: Product[], featured: string[]): Product | null {
  for (const slug of featured) {
    const product = getProduct(slug);
    if (product && !product.hidden) return product;
  }
  return products.find(product => product.featured) ?? null;
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  slot('shop');
  const params = await searchParams;
  const sort = sortFrom(params.sort);

  const store = getStore();
  const products = getProducts();
  const categories = getProductCategories();
  const collections = getStoreCollections();
  const { settings } = getSiteData();
  const configured = storeIsConfigured(settings);

  const featured = featuredProduct(products, store?.page?.featured ?? []);
  const ordered = sortProducts(products, sort);

  // "Latest" only means something when the artist dated things and there is
  // more in the shop than one screen of it. Otherwise the grid below is the
  // latest, and repeating it would be filler.
  const dated = products.filter(product => typeof product.year === 'number');
  const latest =
    products.length > 5 && dated.length > 3
      ? sortProducts(dated, 'newest')
          .filter(product => product.slug !== featured?.slug)
          .slice(0, 4)
      : [];

  return (
    <Container className="pb-16 md:pb-24">
      <PageHeader
        title={store?.page?.title ?? 'Shop'}
        description={
          store?.page?.description ??
          'Prints, books and objects made in the studio. Everything here is made in small runs and sent from the studio.'
        }
      />

      {/* The visitor's sentence, the same one every store surface shows.
          The variable names are behind /api/setup and render below for the
          artist alone. */}
      {configured ? null : (
        <div className="mb-4 flex flex-col gap-4">
          <StoreSetupNotice className={PANEL_CLASS} />
          <InstallerPanel surface="store" />
        </div>
      )}

      {featured ? (
        <Section title="Featured" headingLevel={2} className="pt-0">
          <FeaturedProduct product={featured} />
        </Section>
      ) : null}

      {collections.length > 0 ? (
        <Section
          title="Collections"
          description="Groups the artist put together, each with the words that go with it."
          headingLevel={2}
        >
          <CollectionStrip collections={collections} />
        </Section>
      ) : null}

      {latest.length > 0 ? (
        <Section
          title="Latest releases"
          description="The most recent things to come out of the studio."
          headingLevel={2}
        >
          <ProductGrid products={latest} />
        </Section>
      ) : null}

      <Section
        id="everything"
        title="Everything"
        description={products.length === 1 ? 'One thing is for sale.' : `${products.length} things are for sale.`}
        headingLevel={2}
      >
        <ShopFacets
          categories={categoryFacets(categories, products)}
          collections={collectionFacets(collections, products)}
          active={SHOP_PATH}
          path={SHOP_PATH}
          sort={sort}
          count={ordered.length}
        />
        <ProductGrid
          products={ordered}
          priorityCount={featured ? 0 : 4}
          empty={
            <p className="text-sm text-muted-foreground">
              Nothing is for sale at the moment. The catalogue is still here.
            </p>
          }
        />
      </Section>
    </Container>
  );
}
