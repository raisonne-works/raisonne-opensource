/**
 * The store: the cart, the order store, the payment provider and print on
 * demand.
 *
 * `src/lib/store/cart.ts` is pure and safe to import from a client
 * component, and it is the only file here that is. Everything else reaches
 * the filesystem, the network or the environment, so importing this barrel
 * from the browser is a build error, by design.
 */

export * from './cart';
export * from './orders';
export * from './payments';
export * from './pod';
