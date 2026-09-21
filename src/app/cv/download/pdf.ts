/**
 * A very small PDF writer, enough for a CV.
 *
 * Printing from the browser is not the same feature as downloading a CV: an
 * artist asked for a document needs a file they can attach to an email, with
 * page breaks and page numbers that are the same everywhere. A PDF library
 * would be a dependency and a megabyte of fonts for one page of the site, so
 * this writes the file directly, using the two fonts every PDF reader has
 * built in (Helvetica and Helvetica-Bold) and their published metrics.
 *
 * It does text only: headings, paragraphs, two-column dated entries and
 * bullets, laid out on A4 and broken into pages. No images, no colour, no
 * embedded fonts, which is exactly what a CV needs.
 */

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 56;
const MARGIN_TOP = 64;
const MARGIN_BOTTOM = 64;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
/** The date column of a dated entry, and where its body starts. */
const DATE_WIDTH = 96;
const BODY_X = MARGIN_X + DATE_WIDTH + 14;
const BODY_WIDTH = PAGE_WIDTH - MARGIN_X - BODY_X;

type FontName = 'regular' | 'bold';

// ---------------------------------------------------------------------------
// Metrics: the published Helvetica widths, in 1/1000 of the font size.
// ---------------------------------------------------------------------------

const REGULAR_WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556,
  556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833,
  722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556,
  556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334,
  260, 334, 584,
];

const BOLD_WIDTHS = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556,
  556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833,
  722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611,
  556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389,
  280, 389, 584,
];

/**
 * Accented Latin letters are drawn at the width of the letter underneath, so
 * a name with a diacritic wraps at about the right place.
 */
const ACCENT_BASE: Record<number, string> = {
  0xc0: 'A', 0xc1: 'A', 0xc2: 'A', 0xc3: 'A', 0xc4: 'A', 0xc5: 'A', 0xc6: 'A', 0xc7: 'C',
  0xc8: 'E', 0xc9: 'E', 0xca: 'E', 0xcb: 'E', 0xcc: 'I', 0xcd: 'I', 0xce: 'I', 0xcf: 'I',
  0xd0: 'D', 0xd1: 'N', 0xd2: 'O', 0xd3: 'O', 0xd4: 'O', 0xd5: 'O', 0xd6: 'O', 0xd8: 'O',
  0xd9: 'U', 0xda: 'U', 0xdb: 'U', 0xdc: 'U', 0xdd: 'Y', 0xde: 'P', 0xdf: 'B',
  0xe0: 'a', 0xe1: 'a', 0xe2: 'a', 0xe3: 'a', 0xe4: 'a', 0xe5: 'a', 0xe6: 'a', 0xe7: 'c',
  0xe8: 'e', 0xe9: 'e', 0xea: 'e', 0xeb: 'e', 0xec: 'i', 0xed: 'i', 0xee: 'i', 0xef: 'i',
  0xf0: 'o', 0xf1: 'n', 0xf2: 'o', 0xf3: 'o', 0xf4: 'o', 0xf5: 'o', 0xf6: 'o', 0xf8: 'o',
  0xf9: 'u', 0xfa: 'u', 0xfb: 'u', 0xfc: 'u', 0xfd: 'y', 0xfe: 'p', 0xff: 'y',
};

function charWidth(code: number, font: FontName): number {
  const widths = font === 'bold' ? BOLD_WIDTHS : REGULAR_WIDTHS;
  if (code >= 32 && code <= 126) return widths[code - 32];
  const base = ACCENT_BASE[code];
  if (base) return widths[base.charCodeAt(0) - 32];
  return widths[0];
}

function textWidth(text: string, font: FontName, size: number): number {
  let total = 0;
  for (const char of text) total += charWidth(char.codePointAt(0) ?? 32, font);
  return (total * size) / 1000;
}

// ---------------------------------------------------------------------------
// Characters
// ---------------------------------------------------------------------------

/** Typographic characters a PDF reader would not have in WinAnsi, spelled out. */
const REPLACEMENTS: [RegExp, string][] = [
  [/[\u2018\u2019\u201b]/g, "'"],
  [/[\u201c\u201d]/g, '"'],
  [/\u2026/g, '...'],
  [/[\u2013\u2014]/g, '-'],
  [/\u00a0/g, ' '],
  [/\u2022/g, '-'],
];

/** One line of text, with everything a PDF cannot draw turned into something it can. */
export function toWinAnsi(text: string): string {
  let value = text;
  for (const [pattern, replacement] of REPLACEMENTS) value = value.replace(pattern, replacement);
  return [...value].map(char => ((char.codePointAt(0) ?? 63) <= 0xff ? char : '?')).join('');
}

function escapeText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/** Greedy word wrap at a measured width; a word longer than the line is broken. */
function wrap(text: string, font: FontName, size: number, width: number): string[] {
  const words = toWinAnsi(text).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (textWidth(candidate, font, size) <= width) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    if (textWidth(word, font, size) <= width) {
      line = word;
      continue;
    }
    let rest = word;
    while (textWidth(rest, font, size) > width && rest.length > 1) {
      let cut = rest.length;
      while (cut > 1 && textWidth(rest.slice(0, cut), font, size) > width) cut -= 1;
      lines.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    line = rest;
  }
  if (line) lines.push(line);
  return lines;
}

// ---------------------------------------------------------------------------
// The document
// ---------------------------------------------------------------------------

interface Op {
  x: number;
  y: number;
  size: number;
  font: FontName;
  text: string;
}

export interface PdfMeta {
  title: string;
  author: string;
}

export class CvPdf {
  private pages: Op[][] = [[]];
  private y = PAGE_HEIGHT - MARGIN_TOP;
  private readonly meta: PdfMeta;

  constructor(meta: PdfMeta) {
    this.meta = meta;
  }

  private get page(): Op[] {
    return this.pages[this.pages.length - 1];
  }

  private newPage(): void {
    this.pages.push([]);
    this.y = PAGE_HEIGHT - MARGIN_TOP;
  }

  /** Makes room for `height` points, starting a page when there is none left. */
  private reserve(height: number): void {
    if (this.y - height < MARGIN_BOTTOM) this.newPage();
  }

  private draw(text: string, x: number, size: number, font: FontName, leading: number): void {
    this.reserve(leading);
    this.y -= leading;
    this.page.push({ x, y: this.y, size, font, text: toWinAnsi(text) });
  }

  space(points: number): void {
    this.y -= points;
  }

  /** The document's own title, once, at the top of page one. */
  documentTitle(name: string, subtitle?: string | null): void {
    this.draw(name, MARGIN_X, 24, 'bold', 28);
    if (subtitle) this.draw(subtitle, MARGIN_X, 10.5, 'regular', 16);
  }

  heading(text: string): void {
    // A heading with nothing under it belongs on the next page.
    this.reserve(60);
    this.space(14);
    this.draw(text.toUpperCase(), MARGIN_X, 9.5, 'bold', 14);
    this.space(4);
  }

  paragraph(text: string, { size = 9.5, font = 'regular' as FontName, x = MARGIN_X, width = CONTENT_WIDTH } = {}): void {
    for (const line of wrap(text, font, size, width)) this.draw(line, x, size, font, size * 1.45);
  }

  /**
   * A dated entry: the date in its own column, the rest beside it. The whole
   * entry is measured first and kept on one page, so a role is never split
   * from its dates.
   */
  entry({
    date,
    title,
    subtitle,
    body,
    bullets = [],
  }: {
    date?: string | null;
    title: string;
    subtitle?: string | null;
    body?: string | null;
    bullets?: string[];
  }): void {
    const lines: Omit<Op, 'y'>[] = [];
    const add = (text: string, size: number, font: FontName, x: number, width: number) => {
      for (const line of wrap(text, font, size, width)) lines.push({ text: line, size, font, x });
    };

    add(title, 10, 'bold', BODY_X, BODY_WIDTH);
    if (subtitle) add(subtitle, 9.5, 'regular', BODY_X, BODY_WIDTH);
    if (body) add(body, 9.5, 'regular', BODY_X, BODY_WIDTH);
    for (const bullet of bullets) add(`- ${bullet}`, 9.5, 'regular', BODY_X + 8, BODY_WIDTH - 8);
    if (lines.length === 0) return;

    const height = lines.reduce((total, line) => total + line.size * 1.45, 0);
    this.space(8);
    // An entry taller than a page cannot be kept whole; it starts at the top.
    this.reserve(Math.min(height, PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM));

    const firstY = this.y - lines[0].size * 1.45;
    if (date) {
      for (const line of wrap(date, 'regular', 9.5, DATE_WIDTH)) {
        this.page.push({ x: MARGIN_X, y: firstY, size: 9.5, font: 'regular', text: line });
        break;
      }
    }
    for (const line of lines) {
      this.y -= line.size * 1.45;
      this.page.push({ ...line, y: this.y });
    }
  }

  /** A label and its value, in the same two columns as an entry. */
  labelled(label: string, value: string): void {
    const lines = wrap(value, 'regular', 9.5, BODY_WIDTH);
    if (lines.length === 0) return;
    this.space(4);
    this.reserve(lines.length * 9.5 * 1.45);
    const firstY = this.y - 9.5 * 1.45;
    this.page.push({ x: MARGIN_X, y: firstY, size: 9.5, font: 'bold', text: toWinAnsi(label) });
    for (const line of lines) {
      this.y -= 9.5 * 1.45;
      this.page.push({ x: BODY_X, y: this.y, size: 9.5, font: 'regular', text: line });
    }
  }

  /** The finished file. */
  bytes(): Uint8Array {
    const chunks: string[] = [];
    const offsets: number[] = [];
    let length = 0;
    const push = (text: string) => {
      chunks.push(text);
      length += byteLength(text);
    };
    const object = (body: string) => {
      offsets.push(length);
      push(`${offsets.length} 0 obj\n${body}\nendobj\n`);
    };

    const total = this.pages.length;
    const pageIds = this.pages.map((_, index) => 5 + index * 2);

    push('%PDF-1.4\n');
    object(`<< /Type /Catalog /Pages 2 0 R >>`);
    object(`<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${total} >>`);
    object(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`);
    object(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`);

    this.pages.forEach((ops, index) => {
      const footer = `${this.meta.title} - page ${index + 1} of ${total}`;
      const stream = [
        ...ops.map(op => streamText(op)),
        streamText({
          x: MARGIN_X,
          y: MARGIN_BOTTOM - 24,
          size: 8,
          font: 'regular',
          text: toWinAnsi(footer),
        }),
      ].join('\n');
      const contentId = pageIds[index] + 1;
      object(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
          `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`,
      );
      object(`<< /Length ${byteLength(stream)} >>\nstream\n${stream}\nendstream`);
    });

    object(
      `<< /Title (${escapeText(toWinAnsi(this.meta.title))}) /Author (${escapeText(toWinAnsi(this.meta.author))}) ` +
        `/Producer (Raisonne) >>`,
    );

    const xrefAt = length;
    const count = offsets.length + 1;
    let xref = `xref\n0 ${count}\n0000000000 65535 f \n`;
    for (const offset of offsets) xref += `${String(offset).padStart(10, '0')} 00000 n \n`;
    push(xref);
    push(`trailer\n<< /Size ${count} /Root 1 0 R /Info ${offsets.length} 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`);

    return latin1Bytes(chunks.join(''));
  }
}

function streamText(op: Op): string {
  const font = op.font === 'bold' ? '/F2' : '/F1';
  return `BT ${font} ${op.size} Tf 1 0 0 1 ${round(op.x)} ${round(op.y)} Tm (${escapeText(op.text)}) Tj ET`;
}

function round(value: number): string {
  return (Math.round(value * 100) / 100).toString();
}

/** Every character is one byte, because everything written is WinAnsi. */
function byteLength(text: string): number {
  return text.length;
}

function latin1Bytes(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index += 1) bytes[index] = text.charCodeAt(index) & 0xff;
  return bytes;
}
