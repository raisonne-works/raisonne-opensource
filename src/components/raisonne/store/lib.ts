import { formatMoney, formatMoneyRange } from '@/lib/money';
import { fromPrice, inStock, isLowStock } from '@/lib/store/cart';
import type {
  FulfilmentKind,
  Money,
  Product,
  ProductCategory,
  ProductVariant,
  ShippingMethod,
  StoreCollection,
} from '@/lib/types';

/**
 * Plain-words labels and small pure helpers for the shop, shared by the
 * server pages and the browser's cart. Nothing here reads data or state, so
 * a page and the cart panel say the same thing about the same product.
 *
 * Money is never formatted by hand: src/lib/money.ts owns that, and prices
 * themselves are only ever read from the fixtures (server) or from the
 * priced cart the server answered with. See src/lib/store/cart.ts.
 */

// ---------------------------------------------------------------------------
// Where things live
// ---------------------------------------------------------------------------

export const SHOP_PATH = '/shop';
export const CART_PATH = '/cart';

/** The checkout is the next package's route. The shop only ever links at it. */
export const CHECKOUT_PATH = '/checkout';

/**
 * The two fixed segments under /shop. A category whose slug is one of them
 * would be shadowed by the product or the collection route, so it is left
 * out of the links and reached through /shop instead of 404ing quietly.
 */
export const RESERVED_SHOP_SEGMENTS: readonly string[] = ['product', 'collection'];

export function isAddressableCategory(slug: string): boolean {
  return slug.length > 0 && !RESERVED_SHOP_SEGMENTS.includes(slug);
}

export function productHref(slug: string): string {
  return `${SHOP_PATH}/product/${encodeURIComponent(slug)}`;
}

export function categoryHref(slug: string): string {
  return `${SHOP_PATH}/${encodeURIComponent(slug)}`;
}

export function collectionHref(slug: string): string {
  return `${SHOP_PATH}/collection/${encodeURIComponent(slug)}`;
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export const FULFILMENT_LABELS: Record<FulfilmentKind, string> = {
  ship: 'Shipped from the studio',
  pod: 'Printed on demand',
  digital: 'Digital file',
  pickup: 'Collected in person',
};

export const FULFILMENT_NOTES: Record<FulfilmentKind, string> = {
  ship: 'Packed and sent by the studio.',
  pod: 'Printed by a partner near the delivery address and sent from there.',
  digital: 'Nothing is posted: the file is delivered after payment.',
  pickup: 'Collected from the studio by arrangement, so nothing is posted.',
};

/**
 * What the edition is, in the labels a print buyer expects: the run, whether
 * it is numbered, signed, and whether a certificate comes with it. An
 * edition the artist did not describe returns nothing rather than "Open
 * edition", because an unset field is not a claim.
 */
export function editionLabels(product: Pick<Product, 'edition'>): string[] {
  const edition = product.edition;
  if (!edition) return [];
  const labels: string[] = [];
  if (typeof edition.total === 'number' && edition.total > 0) {
    labels.push(edition.total === 1 ? 'Unique' : `Edition of ${edition.total}`);
  }
  if (edition.numbered) labels.push('Numbered');
  if (edition.signed) labels.push('Signed');
  if (edition.certificate) labels.push('Certificate included');
  return labels;
}

export type StockTone = 'out' | 'low' | 'ok' | 'untracked';

export interface StockState {
  tone: StockTone;
  /** Null when the install does not track stock: silence is better than a guess. */
  label: string | null;
  buyable: boolean;
}

/** What one variant's stock lets a page say, and whether it can be bought at all. */
export function stockState(variant: ProductVariant | null): StockState {
  if (!variant || variant.available === false) {
    return { tone: 'out', label: 'Not available', buyable: false };
  }
  if (typeof variant.stock !== 'number') {
    return { tone: 'untracked', label: null, buyable: true };
  }
  if (variant.stock <= 0) return { tone: 'out', label: 'Sold out', buyable: false };
  if (isLowStock(variant)) {
    return { tone: 'low', label: variant.stock === 1 ? 'One left' : `Only ${variant.stock} left`, buyable: true };
  }
  return { tone: 'ok', label: 'In stock', buyable: true };
}

/** True when at least one variant of the product can be bought today. */
export function productBuyable(product: Product): boolean {
  return product.variants.some(variant => inStock(variant, 1));
}

/** The variant a product page opens on: the first that can be bought, else the first. */
export function defaultVariant(product: Product): ProductVariant | null {
  return product.variants.find(variant => inStock(variant, 1)) ?? product.variants[0] ?? null;
}

/** The most of one variant a visitor may take, given what is in the cart already. */
export function maxQuantityFor(variant: ProductVariant | null, cap: number): number {
  if (!variant) return 0;
  if (typeof variant.stock !== 'number') return cap;
  return Math.max(0, Math.min(cap, variant.stock));
}

/**
 * The price a card leads with. One variant prints its price; several print
 * the range, so nobody clicks through expecting the cheapest size.
 */
export function priceLabel(product: Product): string | null {
  const prices = product.variants.filter(variant => variant.available !== false).map(variant => variant.price);
  if (prices.length === 0) return null;
  const low = prices.reduce((min, price) => (price.amount < min.amount ? price : min));
  const high = prices.reduce((max, price) => (price.amount > max.amount ? price : max));
  if (low.amount === high.amount) return formatMoney(low);
  return formatMoneyRange(low, high);
}

/** The lowest price, for sorting and for structured data. */
export function lowestPrice(product: Product): Money | null {
  return fromPrice(product) ?? product.variants[0]?.price ?? null;
}

/** "5 to 8 working days", or nothing when the artist did not say. */
export function shippingEstimate(method: Pick<ShippingMethod, 'estimatedDays'>): string | null {
  const days = method.estimatedDays;
  if (!days) return null;
  const { min, max } = days;
  if (typeof min === 'number' && typeof max === 'number') {
    return min === max ? `${min} working days` : `${min} to ${max} working days`;
  }
  if (typeof max === 'number') return `up to ${max} working days`;
  if (typeof min === 'number') return `from ${min} working days`;
  return null;
}

/** One line for a shipping option: what it costs, how long it takes, where it goes. */
export function shippingSummary(method: ShippingMethod): string {
  const parts = [formatMoney(method.price) ?? '', shippingEstimate(method)].filter(Boolean);
  if (method.freeAbove) {
    const free = formatMoney(method.freeAbove);
    if (free) parts.push(`free over ${free}`);
  }
  return parts.join(', ');
}

// ---------------------------------------------------------------------------
// Sorting and facets
// ---------------------------------------------------------------------------

export type SortId = 'featured' | 'price-asc' | 'price-desc' | 'newest' | 'title';

export const SORTS: { id: SortId; label: string }[] = [
  { id: 'featured', label: 'Featured first' },
  { id: 'price-asc', label: 'Price, low to high' },
  { id: 'price-desc', label: 'Price, high to low' },
  { id: 'newest', label: 'Newest first' },
  { id: 'title', label: 'Title, A to Z' },
];

export function isSortId(value: unknown): value is SortId {
  return typeof value === 'string' && SORTS.some(sort => sort.id === value);
}

/** The sort a URL asks for, or the default. Anything else is ignored. */
export function sortFrom(value: string | string[] | undefined): SortId {
  const first = Array.isArray(value) ? value[0] : value;
  return isSortId(first) ? first : 'featured';
}

/**
 * Products in the order a page shows them. The fixtures already put featured
 * products first, so 'featured' keeps the given order and the rest sort
 * around it. Sold-out products sink to the end of every order: they are
 * still listed, because a catalogue lists what it made, but they are not the
 * first thing a visitor sees.
 */
export function sortProducts(products: readonly Product[], sort: SortId): Product[] {
  const entries = products.map((product, index) => ({ product, index }));

  const byPrice = (a: Product, b: Product, direction: 1 | -1) => {
    const priceA = lowestPrice(a)?.amount ?? null;
    const priceB = lowestPrice(b)?.amount ?? null;
    if (priceA === null && priceB === null) return 0;
    if (priceA === null) return 1;
    if (priceB === null) return -1;
    return (priceA - priceB) * direction;
  };

  entries.sort((a, b) => {
    const soldOut = Number(!productBuyable(a.product)) - Number(!productBuyable(b.product));
    if (soldOut !== 0) return soldOut;

    switch (sort) {
      case 'price-asc':
        return byPrice(a.product, b.product, 1) || a.index - b.index;
      case 'price-desc':
        return byPrice(a.product, b.product, -1) || a.index - b.index;
      case 'newest':
        return (b.product.year ?? 0) - (a.product.year ?? 0) || a.index - b.index;
      case 'title':
        return a.product.title.localeCompare(b.product.title, 'en') || a.index - b.index;
      default:
        return a.index - b.index;
    }
  });

  return entries.map(entry => entry.product);
}

export interface Facet {
  slug: string;
  name: string;
  href: string;
  count: number;
}

/** Categories that hold something, with their counts, in the store's order. */
export function categoryFacets(categories: readonly ProductCategory[], products: readonly Product[]): Facet[] {
  return categories
    .filter(category => isAddressableCategory(category.slug))
    .map(category => ({
      slug: category.slug,
      name: category.name,
      href: categoryHref(category.slug),
      count: products.filter(product => product.categorySlug === category.slug).length,
    }))
    .filter(facet => facet.count > 0);
}

/** Collections that hold something, with their counts. */
export function collectionFacets(collections: readonly StoreCollection[], products: readonly Product[]): Facet[] {
  return collections
    .map(collection => ({
      slug: collection.slug,
      name: collection.name,
      href: collectionHref(collection.slug),
      count: products.filter(product => product.collectionSlug === collection.slug).length,
    }))
    .filter(facet => facet.count > 0);
}

/** The same path with a different sort, and no ?sort= at all for the default. */
export function sortHref(path: string, sort: SortId): string {
  return sort === 'featured' ? path : `${path}?sort=${sort}`;
}

// ---------------------------------------------------------------------------
// Grids
// ---------------------------------------------------------------------------

/**
 * The product grid. Narrower than the works grid on purpose: a print with a
 * price, a stock label and an edition line needs more room than a tile with
 * a title, and six columns of shop copy at 2560 px reads as a spreadsheet.
 */
export const SHOP_GRID_CLASS = 'grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4 4xl:grid-cols-5';

export const SHOP_GRID_SIZES =
  '(min-width: 2560px) 19vw, (min-width: 1280px) 24vw, (min-width: 768px) 32vw, 48vw';
