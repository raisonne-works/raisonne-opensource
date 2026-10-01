import type { ModuleId } from '@/lib/types';

/**
 * Features every pack places. A pack may move one into an overflow.
 * It may not omit one.
 */
export const REQUIRED = [
  'home',
  'works',
  'series',
  'work',
  'exhibitions',
  'exhibition',
  'installations',
  'installation',
  'physical-works',
  'physical-work',
  'about',
  'cv',
  'press',
  'press-item',
  'awards',
  'award',
  'collaborations',
  'collaboration',
] as const;

/**
 * Features a pack still places, named with the module that keeps them off.
 * shop and product name `store`. A singular page names the same module as its list.
 */
export const MODULE_GATED = [
  { id: 'writings', module: 'writings' },
  { id: 'writing', module: 'writings' },
  { id: 'drops', module: 'drops' },
  { id: 'collectors', module: 'collectors' },
  { id: 'collector', module: 'collectors' },
  { id: 'shop', module: 'store' },
  { id: 'product', module: 'store' },
  { id: 'insights', module: 'insights' },
  { id: 'commissions', module: 'commissions' },
] as const satisfies readonly { id: string; module: ModuleId }[];

export type FeatureId = (typeof REQUIRED)[number] | (typeof MODULE_GATED)[number]['id'];
