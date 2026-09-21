/**
 * Reading the chain.
 *
 * `src/lib/chain/address.ts` and `src/lib/chain/derive.ts` are pure and run
 * anywhere, including in the browser and in `scripts/snapshot-chain.ts`.
 * Everything re-exported from here reaches the network or the fixtures, so
 * importing this file from a client component is a build error, by design:
 * a page reads on the server and hands the components plain data.
 */

export * from './address';
export * from './alchemy';
export * from './cache';
export * from './derive';
export * from './holdings';
