import { formatDate, formatMonth } from '@/components/raisonne/works/lib';
import type { CvSkill, Exhibition, ExhibitionKind, PressItem, SkillCategory } from '@/lib/types';

/**
 * Small, pure helpers the profile components share. No React here, so both
 * server and client components can import them.
 */

export const EXHIBITION_KIND_LABEL: Record<ExhibitionKind, string> = {
  solo: 'Solo',
  group: 'Group',
  biennale: 'Biennale',
  festival: 'Festival',
  fair: 'Fair',
  conference: 'Conference',
  other: 'Other',
};

/** The order kinds appear in filters and summaries. */
export const EXHIBITION_KIND_ORDER: readonly ExhibitionKind[] = ['solo', 'group', 'biennale', 'festival', 'fair', 'conference', 'other'];

/** Joins the parts that are present. */
export function joinParts(parts: ReadonlyArray<string | null | undefined>, separator = ', '): string {
  return parts
    .map(part => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(separator);
}

/**
 * "Venue, City, Country". The city is dropped when the venue already ends
 * with it ("Veletrzni Palac Prague, Prague" reads as a typo).
 */
export function exhibitionPlace(exhibition: Pick<Exhibition, 'venue' | 'city' | 'country'>): string {
  const venue = exhibition.venue?.trim() ?? '';
  const city = exhibition.city?.trim() ?? '';
  const cityInVenue = city !== '' && venue.toLowerCase().endsWith(city.toLowerCase());
  return joinParts([venue, cityInVenue ? null : city, exhibition.country]);
}

/** Newest year first; items keep their fixture order within a year. */
export function sortByYearDesc<T extends { year: number }>(items: readonly T[]): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => b.item.year - a.item.year || a.index - b.index)
    .map(entry => entry.item);
}

/** Newest first by year, then by date inside a year; undated items close their year. */
export function sortPress(items: readonly PressItem[]): PressItem[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      if (a.item.year !== b.item.year) return b.item.year - a.item.year;
      if (a.item.date && b.item.date && a.item.date !== b.item.date) return a.item.date < b.item.date ? 1 : -1;
      if (a.item.date && !b.item.date) return -1;
      if (!a.item.date && b.item.date) return 1;
      return a.index - b.index;
    })
    .map(entry => entry.item);
}

export interface YearGroup<T> {
  year: number;
  items: T[];
}

/** Groups already-sorted items by year, keeping their order. */
export function groupByYear<T extends { year: number }>(items: readonly T[]): YearGroup<T>[] {
  const groups: YearGroup<T>[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.year === item.year) last.items.push(item);
    else groups.push({ year: item.year, items: [item] });
  }
  return groups;
}

/**
 * One shape for every press date: "Apr 2025" when the day is known and the
 * year otherwise, so a list never mixes "2025" with "31 Oct 2024". Lists
 * that print the year as a heading pass withYear: false and get "Apr", or
 * nothing for an undated item.
 */
export function formatPressDate(
  item: Pick<PressItem, 'date' | 'year'>,
  { withYear = true }: { withYear?: boolean } = {},
): { label: string; dateTime: string } | null {
  const month = formatMonth(item.date, { withYear });
  if (month && item.date) return { label: month, dateTime: item.date };
  return withYear ? { label: String(item.year), dateTime: String(item.year) } : null;
}

/** "2013 to 2026", or a single year. */
export function yearSpan(years: readonly number[]): string | null {
  if (years.length === 0) return null;
  const min = Math.min(...years);
  const max = Math.max(...years);
  return min === max ? String(min) : `${min} to ${max}`;
}

/** Splits stored text into paragraphs on blank lines. */
export function paragraphs(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\n\s*\n/)
    .map(paragraph => paragraph.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean);
}

/**
 * The opening of a statement for the home page: whole sentences from the
 * first paragraph, up to about maxChars. `truncated` says whether there is
 * more to read.
 */
export function statementExcerpt(text: string, maxChars = 320): { text: string; truncated: boolean } {
  const [first = '', ...rest] = paragraphs(text);
  if (first.length <= maxChars) return { text: first, truncated: rest.length > 0 };

  const sentences = first.match(/[^.!?]+(?:[.!?]+["'”’)\]]*|$)\s*/g) ?? [first];
  let excerpt = '';
  for (const sentence of sentences) {
    if (excerpt && excerpt.length + sentence.length > maxChars) break;
    excerpt += sentence;
  }
  excerpt = excerpt.trim();

  // One very long opening sentence: cut on a word boundary instead.
  if (excerpt.length > maxChars * 1.5) {
    const cut = excerpt.slice(0, maxChars);
    excerpt = `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 1)).replace(/[,;:]$/, '')}…`;
  }
  return { text: excerpt, truncated: true };
}

/** "example.com/about" from a URL, for printed links. */
export function displayUrl(href: string): string {
  try {
    const url = new URL(href);
    const path = url.pathname.replace(/\/$/, '');
    return `${url.hostname.replace(/^www\./, '')}${path}`;
  } catch {
    return href;
  }
}

/**
 * "Sep 2016 to Dec 2018", "Jan 2019 to Present", or a single month. A role
 * with no dates at all comes back null, so nothing prints an empty dash.
 */
export function dateRange(
  start: string | null | undefined,
  end: string | null | undefined,
  { present = 'Present' }: { present?: string } = {},
): string | null {
  const from = formatMonth(start ?? null);
  const to = formatMonth(end ?? null);
  if (from && to) return from === to ? from : `${from} to ${to}`;
  if (from) return `${from} to ${present}`;
  return to;
}

/** "Updated 15 Jan 2026", or nothing when the date is missing or unreadable. */
export function updatedLabel(iso: string | null | undefined): string | null {
  const date = formatDate(iso ?? null);
  return date ? `Updated ${date}` : null;
}

export const SKILL_CATEGORY_LABEL: Record<SkillCategory, string> = {
  technical: 'Technical',
  software: 'Software',
  artistic: 'Artistic',
  conceptual: 'Conceptual',
  other: 'Other',
};

/** The order skill groups are printed in. */
export const SKILL_CATEGORY_ORDER: readonly SkillCategory[] = [
  'artistic',
  'technical',
  'software',
  'conceptual',
  'other',
];

/** Skills by category, in a fixed order, keeping each group's own order. */
export function groupSkills(skills: readonly CvSkill[]): { category: SkillCategory; skills: CvSkill[] }[] {
  return SKILL_CATEGORY_ORDER.map(category => ({
    category,
    skills: skills.filter(skill => skill.category === category),
  })).filter(group => group.skills.length > 0);
}
