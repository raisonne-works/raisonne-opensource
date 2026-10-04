import { MODULE_GATED, REQUIRED } from './features';

const FROZEN: readonly string[] = [...REQUIRED, ...MODULE_GATED.map((entry) => entry.id)];

const FROZEN_SET = new Set<string>(FROZEN);

/** Missing is a frozen id with no slot. Unknown is a slot key that is not frozen. */
export function validateComposition(map: {
  slots: object;
}): { ok: true } | { ok: false; missing: string[]; unknown: string[] } {
  const present = Object.keys(map.slots);
  const presentSet = new Set(present);
  const missing = FROZEN.filter((id) => !presentSet.has(id));
  const unknown = present.filter((id) => !FROZEN_SET.has(id));
  if (missing.length === 0 && unknown.length === 0) return { ok: true };
  return { ok: false, missing, unknown };
}
