/**
 * How wide long-form text is allowed to run.
 *
 * max-w-prose (65ch) measures in "0" widths; in Geist that comes out at
 * about 90 real characters, well past the 60 to 75 that reads easily. These
 * caps are in rem instead, measured at the size the text is set in.
 */

/** Body text at 16 px: about 70 characters. */
export const READING_CLASS = 'max-w-[36rem]';

/** A lead or description at 18 px: the same measure in characters. */
export const READING_LEAD_CLASS = 'max-w-[40rem]';

/**
 * How wide a designed empty state is allowed to be.
 *
 * An Empty at full container width puts a 2,460 px dashed rectangle around
 * 200 px of centred text on a wide screen, which reads as a placeholder
 * nobody sized. It is an island in the content area instead.
 */
export const EMPTY_BLOCK_CLASS = 'mx-auto w-full max-w-lg border';

/**
 * A panel or a notice addressed to one reader: a setup note, an alert, a
 * form's explanation. Capped so it does not run the width of a 2,560 px
 * screen, which turns one sentence into one line nobody can track back.
 */
export const PANEL_CLASS = 'max-w-[48rem]';

/**
 * The measure a data-led page uses: tables, dashboards, the cart and
 * checkout. 1,312 px of content inside the editorial container. Wide enough
 * for eight columns, narrow enough that a row's first and last cell are
 * still one glance apart.
 */
export const DATA_MEASURE_CLASS = 'max-w-[82rem]';
