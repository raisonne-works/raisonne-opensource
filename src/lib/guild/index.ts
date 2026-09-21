/**
 * The tier and badge model.
 *
 * This barrel is the pure half: facts, rules, tiers and standings, all of it
 * safe in a client component. The reads that touch the install's own files
 * live in './read', which is server only and has to be imported directly.
 *
 *   import { BADGE_RULES, tierBand } from '@/lib/guild';        // anywhere
 *   import { getGuildBoard } from '@/lib/guild/read';           // server only
 */

export * from './badges';
export * from './facts';
export * from './standings';
export * from './tiers';
