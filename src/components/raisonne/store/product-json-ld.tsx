import { JsonLd } from '@/components/raisonne/seo/json-ld';
import { fromMinor, minorUnits } from '@/lib/money';
import type { JsonLdNode } from '@/lib/seo/json-ld';
import { inStock } from '@/lib/store/cart';
import type { Product } from '@/lib/types';

/**
 * A product for a search engine: the same figures the page prints, from the
 * same fixtures.
 *
 * One variant becomes an Offer, several become an AggregateOffer with the
 * real low and high, because a print sold at two sizes has two prices and
 * saying only the cheaper one is how a shop earns a penalty. Availability is
 * the install's own stock, and a price that does not exist is left out
 * rather than sent as zero.
 */
export function ProductJsonLd({
  product,
  origin,
  path,
  artistName,
  image,
}: {
  product: Product;
  origin: string;
  /** The product's own path, e.g. /shop/product/ground-i-print. */
  path: string;
  artistName: string;
  image: string | null;
}) {
  const url = `${origin}${path}`;
  const sellable = product.variants.filter(variant => variant.available !== false);
  const prices = sellable.map(variant => variant.price);
  const available = product.variants.some(variant => inStock(variant, 1));
  const availability = available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';

  const offers: JsonLdNode | null = (() => {
    if (prices.length === 0) return null;
    const currency = prices[0].currency;
    const low = prices.reduce((min, price) => (price.amount < min.amount ? price : min));
    const high = prices.reduce((max, price) => (price.amount > max.amount ? price : max));

    if (prices.length === 1 || low.amount === high.amount) {
      return {
        '@type': 'Offer',
        url,
        price: majorUnits(low.amount, currency),
        priceCurrency: currency,
        availability,
      };
    }

    return {
      '@type': 'AggregateOffer',
      url,
      priceCurrency: currency,
      lowPrice: majorUnits(low.amount, currency),
      highPrice: majorUnits(high.amount, currency),
      offerCount: sellable.length,
      availability,
    };
  })();

  const node: JsonLdNode = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': url,
    name: product.title,
    url,
    ...(product.description ? { description: product.description } : {}),
    ...(image ? { image } : {}),
    brand: { '@type': 'Brand', name: artistName },
    ...(product.materials ? { material: product.materials } : {}),
    ...(product.variants[0]?.sku ? { sku: product.variants[0].sku } : {}),
    ...(offers ? { offers } : {}),
  };

  return <JsonLd data={node} />;
}

/**
 * "240.00", the way schema.org wants a price: plain digits, no symbol, no
 * grouping, and the currency's own number of decimals.
 */
function majorUnits(amount: number, currency: string): string {
  return fromMinor(amount, currency).toFixed(minorUnits(currency));
}
