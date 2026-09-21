/** Seconds with one decimal, the resolution the importer's timings are worth. Null when there is no time yet. */
export function formatSeconds(ms: number | null | undefined): string | null {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return null;
  return `${(Math.max(0, ms) / 1000).toFixed(1)} s`;
}
