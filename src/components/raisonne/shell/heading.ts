/**
 * Heading levels as a prop. A component that owns a heading takes the level
 * its page gives it, so the same component can be an h1 on its own page and
 * sit under an h4 in the design system without breaking the outline.
 */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

/** The level for a heading nested inside one at `level` (never past h6). */
export function nextHeadingLevel(level: HeadingLevel): HeadingLevel {
  return (level < 6 ? level + 1 : 6) as HeadingLevel;
}
