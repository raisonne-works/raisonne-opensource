import { addMoney, multiplyMoney, sumMoney, zeroMoney } from '@/lib/money';
import type { CartLine, CartTotals, Money, Product, ProductVariant, ShippingMethod, StoreData } from '@/lib/types';

/**
 * The cart, and the one rule that matters: a price never comes from the
 * browser.
 *
 * The cart in local storage holds slugs, variant ids and quantities and
 * nothing else. Every figure a visitor sees, and every figure that reaches a
 * payment provider, is worked out here from the install's own fixtures. A
 * page that displays a total and a server that charges one call the same
 * function with the same data, so they cannot disagree, and a tampered cart
 * can ask for a different product but never for a different price.
 *
 * Everything in this file is pure, so the same code runs in the browser for
 * the cart panel and on the server at checkout.
 */

/** Where the browser keeps the cart. Read it through readStoredCart, never directly. */
export const CART_STORAGE_KEY = 'raisonne.cart.v1';

/** The most of one variant anybody can put in a cart. Editions are small; this is a typo guard. */
export const MAX_LINE_QUANTITY = 20;

/** The most distinct lines a cart may hold. */
export const MAX_LINES = 30;

// ---------------------------------------------------------------------------
// Lines
// ---------------------------------------------------------------------------

/** What makes two lines the same line: the same variant of the same product, for the same work. */
export function lineKey(line: Pick<CartLine, 'productSlug' | 'variantId' | 'workId'>): string {
  return `${line.productSlug}::${line.variantId}::${line.workId ?? ''}`;
}

export function isSameLine(a: CartLine, b: CartLine): boolean {
  return lineKey(a) === lineKey(b);
}

export function addLine(lines: readonly CartLine[], line: CartLine): CartLine[] {
  const quantity = clampQuantity(line.quantity);
  if (quantity === 0) return [...lines];
  const existing = lines.find(entry => isSameLine(entry, line));
  if (existing) {
    return lines.map(entry => (isSameLine(entry, line) ? { ...entry, quantity: clampQuantity(entry.quantity + quantity) } : entry));
  }
  if (lines.length >= MAX_LINES) return [...lines];
  return [...lines, { ...line, quantity }];
}

export function setQuantity(lines: readonly CartLine[], line: Pick<CartLine, 'productSlug' | 'variantId' | 'workId'>, quantity: number): CartLine[] {
  const next = clampQuantity(quantity);
  if (next === 0) return removeLine(lines, line);
  return lines.map(entry => (lineKey(entry) === lineKey(line) ? { ...entry, quantity: next } : entry));
}

export function removeLine(lines: readonly CartLine[], line: Pick<CartLine, 'productSlug' | 'variantId' | 'workId'>): CartLine[] {
  return lines.filter(entry => lineKey(entry) !== lineKey(line));
}

export function cartCount(lines: readonly CartLine[]): number {
  return lines.reduce((total, line) => total + line.quantity, 0);
}

function clampQuantity(value: unknown): number {
  const quantity = Math.floor(Number(value));
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;
  return Math.min(quantity, MAX_LINE_QUANTITY);
}

// ---------------------------------------------------------------------------
// Storage, and anything that arrives from outside
// ---------------------------------------------------------------------------

/**
 * A cart out of local storage, a request body or a URL. Everything is
 * checked: the shape, the types and the limits, because all three of those
 * places are things a visitor can edit.
 */
export function parseCart(value: unknown): CartLine[] {
  const raw = typeof value === 'string' ? safeJson(value) : value;
  if (!Array.isArray(raw)) return [];
  const lines: CartLine[] = [];
  for (const entry of raw.slice(0, MAX_LINES)) {
    if (typeof entry !== 'object' || entry === null) continue;
    const line = entry as Partial<CartLine>;
    const quantity = clampQuantity(line.quantity);
    if (typeof line.productSlug !== 'string' || typeof line.variantId !== 'string' || quantity === 0) continue;
    lines.push({
      productSlug: line.productSlug.slice(0, 200),
      variantId: line.variantId.slice(0, 200),
      quantity,
      ...(typeof line.workId === 'string' ? { workId: line.workId.slice(0, 200) } : {}),
    });
  }
  return lines;
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

export function serializeCart(lines: readonly CartLine[]): string {
  return JSON.stringify(lines);
}

// ---------------------------------------------------------------------------
// Looking things up
// ---------------------------------------------------------------------------

/** Every sellable product, the plain ones and the phygitals. */
export function allProducts(store: StoreData): Product[] {
  return [...store.products, ...store.phygitals];
}

export function findProduct(store: StoreData, slug: string): Product | null {
  return allProducts(store).find(product => product.slug === slug) ?? null;
}

export function findVariant(product: Product, variantId: string): ProductVariant | null {
  return product.variants.find(variant => variant.id === variantId) ?? null;
}

/** The price a product leads with: its cheapest available variant. */
export function fromPrice(product: Product): Money | null {
  const prices = product.variants.filter(variant => variant.available !== false).map(variant => variant.price);
  if (!prices.length) return null;
  return prices.reduce((low, price) => (price.amount < low.amount ? price : low));
}

export function inStock(variant: ProductVariant, quantity = 1): boolean {
  if (variant.available === false) return false;
  if (typeof variant.stock !== 'number') return true;
  return variant.stock >= quantity;
}

export function isLowStock(variant: ProductVariant): boolean {
  return typeof variant.stock === 'number' && typeof variant.lowStockAt === 'number' && variant.stock > 0 && variant.stock <= variant.lowStockAt;
}

// ---------------------------------------------------------------------------
// Shipping
// ---------------------------------------------------------------------------

/** One postage method, and whether this basket may have it. */
export interface ShippingChoice {
  method: ShippingMethod;
  available: boolean;
  /** Why not, in a sentence the buyer can act on. Null when it is available. */
  reason: string | null;
}

/**
 * Every method, in order, each one marked with whether this basket can have
 * it and why not.
 *
 * Silently dropping the cheap one is the problem this exists to solve. A
 * basket too heavy for Standard would preselect Express at $45 with nothing
 * on screen to say a $15 option had been considered and ruled out, so the
 * buyer sees the expensive choice and no reason for it. Listing it greyed
 * with the reason makes the preselected price visibly the only one.
 */
export function shippingChoices(
  store: StoreData,
  { country, weight }: { country?: string | null; weight?: number | null } = {},
): ShippingChoice[] {
  return store.shippingMethods
    .map(method => {
      if (country && method.countries?.length && !method.countries.includes(country.toUpperCase())) {
        return { method, available: false, reason: `${method.name} does not go to ${country.toUpperCase()}` };
      }
      if (typeof weight === 'number' && typeof method.maxWeight === 'number' && weight > method.maxWeight) {
        return { method, available: false, reason: `${method.name} is not available for this weight` };
      }
      return { method, available: true, reason: null };
    })
    .sort((a, b) => (a.method.order ?? 0) - (b.method.order ?? 0) || a.method.price.amount - b.method.price.amount);
}

/** The methods that can carry this basket to this country. */
export function shippingOptions(store: StoreData, options: { country?: string | null; weight?: number | null } = {}): ShippingMethod[] {
  return shippingChoices(store, options)
    .filter(choice => choice.available)
    .map(choice => choice.method);
}

/** What a method costs for this subtotal, which may be nothing above its threshold. */
export function shippingCost(method: ShippingMethod | null, subtotal: Money): Money {
  if (!method) return zeroMoney(subtotal.currency);
  if (method.freeAbove && subtotal.amount >= method.freeAbove.amount) return zeroMoney(subtotal.currency);
  return method.price;
}

/** Grams, for the shipping rules. Unknown weights count as zero rather than blocking checkout. */
export function cartWeight(store: StoreData, lines: readonly CartLine[]): number {
  return lines.reduce((total, line) => {
    const product = findProduct(store, line.productSlug);
    const variant = product ? findVariant(product, line.variantId) : null;
    return total + (variant?.weight ?? 0) * line.quantity;
  }, 0);
}

// ---------------------------------------------------------------------------
// Pricing a cart
// ---------------------------------------------------------------------------

/**
 * What a cart costs, from the fixtures and nothing else.
 *
 * A line whose product, variant or stock does not hold up is priced at zero
 * and carries a `problem`, so the page can show the visitor exactly which
 * line went away rather than silently emptying their cart. The totals count
 * only the lines that held up, which is also what gets charged.
 */
export function priceCart(
  store: StoreData,
  lines: readonly CartLine[],
  { shippingMethodId = null }: { shippingMethodId?: string | null } = {},
): CartTotals {
  const currency = store.currency.toUpperCase();
  const problems: string[] = [];

  const priced = lines.map(line => {
    const product = findProduct(store, line.productSlug);
    const variant = product ? findVariant(product, line.variantId) : null;

    if (!product || !variant) {
      const problem = 'That product is no longer for sale';
      problems.push(problem);
      return {
        line,
        title: line.productSlug,
        variantName: '',
        unitPrice: zeroMoney(currency),
        lineTotal: zeroMoney(currency),
        image: null,
        problem,
        problemShort: 'No longer for sale',
        available: 0,
      };
    }

    // "Out of stock" for a variant with four on the shelf is not true, and it
    // sends the buyer away from a sale that could have gone through. A
    // shortfall is reported as a shortfall, with the number, so the page can
    // offer to reduce the line rather than only offer to remove it.
    const stock = typeof variant.stock === 'number' && variant.available !== false ? variant.stock : null;
    const short = stock !== null && stock > 0 && stock < line.quantity;
    const problem = inStock(variant, line.quantity)
      ? null
      : short
        ? `${product.title}: only ${stock} left, and ${line.quantity} are in the cart`
        : `${product.title} is out of stock`;
    if (problem) problems.push(problem);

    return {
      line,
      title: product.title,
      variantName: variant.name,
      unitPrice: variant.price,
      lineTotal: problem ? zeroMoney(currency) : multiplyMoney(variant.price, line.quantity),
      image: product.cover ?? product.gallery[0] ?? null,
      problem,
      problemShort: problem ? (short ? `Only ${stock} left` : 'Out of stock') : null,
      available: problem ? (stock ?? 0) : null,
    };
  });

  const subtotal = sumMoney(
    priced.map(entry => entry.lineTotal),
    currency,
  );
  const method = store.shippingMethods.find(entry => entry.id === shippingMethodId) ?? null;
  // A basket whose every line fell away is worth nothing, and nothing does
  // not cost postage: without this, a cart of one out-of-stock print reads
  // "Total $15".
  const shipping = subtotal.amount > 0 ? shippingCost(method, subtotal) : zeroMoney(currency);

  return {
    currency,
    lines: priced,
    subtotal,
    shipping,
    total: addMoney(subtotal, shipping),
    problems: [...new Set(problems)],
  };
}

/** True when a cart can be paid for: something in it, and nothing wrong with it. */
export function isPayable(totals: CartTotals): boolean {
  return totals.lines.length > 0 && totals.problems.length === 0 && totals.total.amount > 0;
}
