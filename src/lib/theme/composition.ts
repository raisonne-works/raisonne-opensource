import type { FeatureId } from './features';

/** The layouts the app can render for a slot. A pack chooses among these; it cannot bring its own. */
export const VARIANTS = ['default'] as const;
export type Variant = (typeof VARIANTS)[number];

/** A pack is a placement of features the app already renders. Not a new route. */
export type Composition = {
  id: string;
  slots: Record<FeatureId, { variant: Variant }>;
};
