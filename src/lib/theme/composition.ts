import type { FeatureId } from './features';

/** A pack is a placement of features the app already renders. Not a new route. */
export type Composition = {
  id: 'skin-zero';
  slots: Record<FeatureId, { variant: 'default' }>;
};
