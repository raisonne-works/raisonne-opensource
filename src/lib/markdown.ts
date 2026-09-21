import type { RichInline, RichText } from '@/lib/types';

/**
 * Token metadata is plain text with markdown habits in it.
 *
 * A contract's `description` is a single string, and artists write it the way
 * they write everywhere else: *emphasis*, **strong**, [a link](https://…), a
 * bare URL, and a trailing backslash where they meant a line break. Printed
 * raw, that reads as an unfinished template ("Controls \", "[ 1 ] • Save
 * Image \"). This turns one of those strings into the same RichText every
 * other passage on the site is made of, so one renderer draws them all and no
 * markup reaches the page as markup.
 *
 * It is deliberately small. This is not a markdown engine: it handles what
 * token descriptions actually contain, and anything it does not recognise is
 * left as the characters the artist typed. The raw string stays on the record
 * for the owner tools, which is why nothing here mutates the data.
 */

/** A hard line break written as a trailing backslash, the way markdown spells it. */
const TRAILING_BACKSLASH = /\\+[ \t]*(?=\n|$)/g;

/** [label](https://example.com) */
const MARKDOWN_LINK = /\[([^\]\n]+)\]\(\s*(<?)([^\s<>)]+)\2\s*\)/g;

/** A bare address, stopped before the punctuation that usually ends a sentence. */
const BARE_URL = /\b(https?:\/\/[^\s<>()[\]]+|www\.[^\s<>()[\]]+)/g;

/** **strong** or __strong__, then *emphasis* or _emphasis_. */
const STRONG = /(\*\*|__)(?=\S)([\s\S]*?\S)\1/g;
const EMPHASIS = /(\*|_)(?=\S)([^*_\n]*?\S)\1/g;

/** A URL without a scheme still needs one before it can be a link. */
function absolute(href: string): string {
  return /^(https?:|mailto:)/i.test(href) ? href : `https://${href}`;
}

/** Trailing punctuation belongs to the sentence, not to the address. */
function trimUrlTail(url: string): { href: string; tail: string } {
  const match = /[.,;:!?'"]+$/.exec(url);
  if (!match) return { href: url, tail: '' };
  return { href: url.slice(0, -match[0].length), tail: match[0] };
}

interface Piece {
  text: string;
  href?: string;
}

/** Splits one line into plain runs and linked runs, markdown links first. */
function linkPieces(line: string): Piece[] {
  const pieces: Piece[] = [];
  let index = 0;

  for (const match of line.matchAll(MARKDOWN_LINK)) {
    const start = match.index ?? 0;
    if (start > index) pieces.push({ text: line.slice(index, start) });
    pieces.push({ text: match[1], href: absolute(match[3]) });
    index = start + match[0].length;
  }
  if (index < line.length) pieces.push({ text: line.slice(index) });

  // Then the addresses nobody wrapped in brackets, inside the plain runs only.
  const out: Piece[] = [];
  for (const piece of pieces) {
    if (piece.href) {
      out.push(piece);
      continue;
    }
    let cursor = 0;
    for (const match of piece.text.matchAll(BARE_URL)) {
      const start = match.index ?? 0;
      const { href, tail } = trimUrlTail(match[0]);
      if (!href) continue;
      if (start > cursor) out.push({ text: piece.text.slice(cursor, start) });
      out.push({ text: href, href: absolute(href) });
      if (tail) out.push({ text: tail });
      cursor = start + match[0].length;
    }
    if (cursor < piece.text.length) out.push({ text: piece.text.slice(cursor) });
  }
  return out.filter(piece => piece.text.length > 0);
}

/** Applies the emphasis marks inside one run of text. */
function emphasize(text: string, base: Omit<RichInline, 'text'>): RichInline[] {
  const nodes: RichInline[] = [];
  let index = 0;

  const marks = [...text.matchAll(STRONG)].map(match => ({ match, bold: true }));
  for (const match of text.matchAll(EMPHASIS)) {
    const start = match.index ?? 0;
    // An emphasis inside a strong pair was already taken by it.
    if (marks.some(mark => start >= (mark.match.index ?? 0) && start < (mark.match.index ?? 0) + mark.match[0].length)) {
      continue;
    }
    marks.push({ match, bold: false });
  }
  marks.sort((a, b) => (a.match.index ?? 0) - (b.match.index ?? 0));

  for (const { match, bold } of marks) {
    const start = match.index ?? 0;
    if (start < index) continue;
    if (start > index) nodes.push({ ...base, text: text.slice(index, start) });
    nodes.push({ ...base, text: match[2], ...(bold ? { bold: true } : { italic: true }) });
    index = start + match[0].length;
  }
  if (index < text.length) nodes.push({ ...base, text: text.slice(index) });
  return nodes;
}

function inlines(line: string): RichInline[] {
  return linkPieces(line).flatMap(piece => emphasize(piece.text, piece.href ? { href: piece.href } : {}));
}

/**
 * A plain-text description as RichText: one paragraph per blank line, a
 * newline inside a paragraph kept as a break, and the markdown the artist
 * typed resolved into links and emphasis.
 */
export function plainTextToRichText(text: string | null | undefined): RichText {
  if (!text) return [];
  const normalized = text
    .replace(/\r\n?/g, '\n')
    // "Controls \" means "Controls", then a new line.
    .replace(TRAILING_BACKSLASH, '')
    .replace(/[ \t]+$/gm, '');

  const blocks: RichText = [];
  for (const paragraph of normalized.split(/\n{2,}/)) {
    const lines = paragraph.split('\n').filter(line => line.trim().length > 0);
    if (lines.length === 0) continue;
    const children: RichInline[] = [];
    lines.forEach((line, index) => {
      if (index > 0) children.push({ text: '\n' });
      children.push(...inlines(line));
    });
    if (children.length > 0) blocks.push({ type: 'paragraph', children });
  }
  return blocks;
}

/**
 * True when the string carries markup a reader should not see as characters.
 * The patterns are rebuilt here rather than reused: a global regex keeps its
 * lastIndex between calls, so test() on a shared one answers differently the
 * second time.
 */
export function hasMarkup(text: string | null | undefined): boolean {
  if (!text) return false;
  return /\\+[ \t]*(?:\n|$)/.test(text) || /\[[^\]\n]+\]\(\s*<?[^\s<>)]+>?\s*\)/.test(text) || /(\*\*|__|\*|_)\S/.test(text);
}

/**
 * The same text with its markup taken off rather than resolved, for the
 * places that can hold only characters: a meta description, a share card, an
 * alt text.
 */
export function plainText(text: string | null | undefined): string | null {
  if (!text) return null;
  const flat = plainTextToRichText(text)
    .map(block => (block.type === 'paragraph' ? block.children.map(node => node.text).join('') : ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  return flat || null;
}
