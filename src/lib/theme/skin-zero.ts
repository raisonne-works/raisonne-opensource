import type { Composition } from './composition';
import type { FeatureId } from './features';

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

/**
 * The pack this install wears. A later worn-pack setting uses this.
 * No pack means skin-zero.
 */
export function getWornPackId(): 'skin-zero' {
  return 'skin-zero';
}

/** The layout this page renders. Skin zero only has the default. */
export function slot(id: FeatureId): 'default' {
  return SKIN_ZERO.slots[id].variant;
}
