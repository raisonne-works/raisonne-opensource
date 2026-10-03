import type { Composition, Variant } from './composition';
import type { FeatureId } from './features';
import { getWornPack } from './worn';

/** The frame an install wears when no pack is selected. Not a second site. */
export const SKIN_ZERO: Composition = {
  id: 'skin-zero',
  slots: {
    home: { variant: 'default' },
    works: { variant: 'default' },
    series: { variant: 'default' },
    work: { variant: 'default' },
    exhibitions: { variant: 'default' },
    exhibition: { variant: 'default' },
    installations: { variant: 'default' },
    installation: { variant: 'default' },
    'physical-works': { variant: 'default' },
    'physical-work': { variant: 'default' },
    about: { variant: 'default' },
    cv: { variant: 'default' },
    press: { variant: 'default' },
    'press-item': { variant: 'default' },
    awards: { variant: 'default' },
    award: { variant: 'default' },
    collaborations: { variant: 'default' },
    collaboration: { variant: 'default' },
    writings: { variant: 'default' },
    writing: { variant: 'default' },
    drops: { variant: 'default' },
    collectors: { variant: 'default' },
    collector: { variant: 'default' },
    shop: { variant: 'default' },
    product: { variant: 'default' },
    insights: { variant: 'default' },
    commissions: { variant: 'default' },
  },
};

/** The id of the pack this install wears. No pack, or one that failed its checks, means skin-zero. */
export function getWornPackId(): string {
  return getWornPack()?.id ?? SKIN_ZERO.id;
}

/** The layout this page renders: the worn pack's choice for the slot, or skin zero's. */
export function slot(id: FeatureId): Variant {
  return (getWornPack()?.composition ?? SKIN_ZERO).slots[id].variant;
}
