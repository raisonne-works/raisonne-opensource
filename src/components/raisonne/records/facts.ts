import { formatDate } from '@/components/raisonne/works/lib';
import { type DateStatus, exhibitionStatus } from '@/lib/records';
import type {
  Award,
  Collaboration,
  Exhibition,
  Fact,
  Immersive,
  Installation,
  PhysicalWork,
  PressItem,
  Writing,
} from '@/lib/types';

/**
 * What each kind of record puts in its facts table. Pure functions over the
 * domain types: the page hands the result to FactsTable and nothing here
 * knows about React or where the data came from.
 *
 * A fact with nothing recorded is dropped rather than printed as "unknown",
 * because a catalogue raisonne lists what it knows.
 */

/**
 * A value an importer failed to turn into text. Printing it would put
 * "[object Object]" on a catalogue page, so the fact is dropped and the row
 * disappears, which is what a missing value does everywhere else here.
 */
function isBroken(text: string): boolean {
  return text === '[object Object]';
}

export function fact(label: string, value: string | number | null | undefined, href?: string | null): Fact | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text || isBroken(text)) return null;
  return href ? { label, value: text, href } : { label, value: text };
}

/** The facts that have a value, in the order they were listed. */
export function factList(...entries: (Fact | null | undefined)[]): Fact[] {
  return entries.filter((entry): entry is Fact => Boolean(entry));
}

function joined(parts: (string | null | undefined)[] | null | undefined, separator = ', '): string | null {
  const text = (parts ?? [])
    .map(part => part?.trim())
    .filter((part): part is string => Boolean(part) && !isBroken(part as string))
    .join(separator);
  return text || null;
}

/** "11 Apr to 8 Jun 2025", one date when there is only one, null when there is none. */
export function formatDateRange(start: string | null | undefined, end: string | null | undefined): string | null {
  const from = formatDate(start ?? null);
  const to = formatDate(end ?? null);
  if (from && to) return from === to ? from : `${from} to ${to}`;
  return from ?? to ?? null;
}

export const DATE_STATUS_LABEL: Record<Exclude<DateStatus, 'unknown'>, string> = {
  upcoming: 'Upcoming',
  current: 'On now',
  past: 'Past',
};

/** "On now", "Upcoming" or "Past", or null when the record carries no dates. */
export function statusLabel(status: DateStatus): string | null {
  return status === 'unknown' ? null : DATE_STATUS_LABEL[status];
}

// ---------------------------------------------------------------------------
// One builder per record type
// ---------------------------------------------------------------------------

export function exhibitionFacts(exhibition: Exhibition, now?: number): Fact[] {
  return factList(
    fact('Venue', exhibition.venue),
    fact('Place', joined([exhibition.city, exhibition.country])),
    fact('Dates', formatDateRange(exhibition.startDate, exhibition.endDate) ?? String(exhibition.year)),
    fact('Status', statusLabel(exhibitionStatus(exhibition, now))),
    fact('Format', exhibition.format),
    fact('Event', exhibition.event),
    fact('Curator', exhibition.curator),
    fact('Virtual tour', exhibition.virtualTourUrl ? 'Walk through the show' : null, exhibition.virtualTourUrl),
    fact('Press kit', exhibition.pressKitUrl ? 'Download the press kit' : null, exhibition.pressKitUrl),
    fact('Official page', exhibition.url ? hostLabel(exhibition.url) : null, exhibition.url),
  );
}

/**
 * A show's facts, led by its standing and its kind, then who and where, then
 * when. The second order a pack may read them in; see RecordFacts.
 */
export function exhibitionFactsByStanding(exhibition: Exhibition, now?: number): Fact[] {
  return factList(
    fact('Status', statusLabel(exhibitionStatus(exhibition, now))),
    fact('Format', exhibition.format),
    fact('Event', exhibition.event),
    fact('Curator', exhibition.curator),
    fact('Venue', exhibition.venue),
    fact('Place', joined([exhibition.city, exhibition.country])),
    fact('Dates', formatDateRange(exhibition.startDate, exhibition.endDate) ?? String(exhibition.year)),
    fact('Virtual tour', exhibition.virtualTourUrl ? 'Walk through the show' : null, exhibition.virtualTourUrl),
    fact('Press kit', exhibition.pressKitUrl ? 'Download the press kit' : null, exhibition.pressKitUrl),
    fact('Official page', exhibition.url ? hostLabel(exhibition.url) : null, exhibition.url),
  );
}

export function installationFacts(installation: Installation): Fact[] {
  return factList(
    fact('Year', installation.year),
    fact('Medium', installation.medium),
    fact('Dimensions', installation.dimensions),
    fact('Materials', joined(installation.materials)),
    fact('Location', installation.location),
    fact('Curator', installation.curator),
  );
}

/**
 * The same facts, led by what the piece is made of and ending on when. A
 * pack whose title card already carries the year reads them in this order.
 */
export function installationFactsByMaking(installation: Installation): Fact[] {
  return factList(
    fact('Medium', installation.medium),
    fact('Dimensions', installation.dimensions),
    fact('Curator', installation.curator),
    fact('Location', installation.location),
    fact('Year', installation.year),
    fact('Materials', joined(installation.materials)),
  );
}

export function immersiveFacts(immersive: Immersive): Fact[] {
  return factList(
    fact('Year', immersive.year),
    fact('Platform', immersive.platform),
    fact('Duration', immersive.duration),
    fact('Status', immersive.status),
    fact('Date', formatDate(immersive.date)),
    fact('Curator', immersive.curator),
    fact('What you need', immersive.requirements),
    fact('Experience', immersive.experienceUrl ? hostLabel(immersive.experienceUrl) : null, immersive.experienceUrl),
  );
}

export function physicalWorkFacts(physical: PhysicalWork, seriesTitle?: string | null): Fact[] {
  return factList(
    fact('Year', physical.year),
    fact('Medium', physical.medium),
    fact('Dimensions', physical.dimensions),
    fact('Materials', joined(physical.materials)),
    fact('Location', physical.location),
    fact('Availability', physical.availability),
    physical.seriesSlug
      ? fact('Series', seriesTitle ?? physical.seriesSlug, `/works/${encodeURIComponent(physical.seriesSlug)}`)
      : null,
  );
}

export function collaborationFacts(collaboration: Collaboration): Fact[] {
  return factList(
    fact('Kind', collaboration.kind),
    fact('Year', collaboration.year),
    fact('Date', formatDate(collaboration.date)),
    fact('Status', collaboration.status),
    fact(
      'Project',
      collaboration.projectUrl ? hostLabel(collaboration.projectUrl) : null,
      collaboration.projectUrl,
    ),
  );
}

export function awardFacts(award: Award, projectTitle?: string | null, projectHref?: string | null): Fact[] {
  return factList(
    fact('Year', award.year),
    fact('Organization', award.organization),
    fact('Result', award.prize ?? award.result),
    fact('Category', award.category),
    fact('Ceremony', award.ceremonyLocation),
    projectHref ? fact('Given for', projectTitle ?? 'The project', projectHref) : null,
    fact('Official page', award.url ? hostLabel(award.url) : null, award.url),
    fact('Press release', award.pressReleaseUrl ? 'Read the announcement' : null, award.pressReleaseUrl),
  );
}

/** An award's facts, led by what it was given as and by whom, then when and where. */
export function awardFactsByCategory(award: Award, projectTitle?: string | null, projectHref?: string | null): Fact[] {
  return factList(
    fact('Category', award.category),
    fact('Result', award.prize ?? award.result),
    fact('Organization', award.organization),
    fact('Year', award.year),
    fact('Ceremony', award.ceremonyLocation),
    projectHref ? fact('Given for', projectTitle ?? 'The project', projectHref) : null,
    fact('Official page', award.url ? hostLabel(award.url) : null, award.url),
    fact('Press release', award.pressReleaseUrl ? 'Read the announcement' : null, award.pressReleaseUrl),
  );
}

export function writingFacts(writing: Writing): Fact[] {
  return factList(
    fact('Authors', joined(writing.authors)),
    fact('Published in', writing.publishedIn),
    fact('Published', formatDate(writing.publishedAt) ?? (writing.year === null ? null : String(writing.year))),
    fact('Category', writing.category),
    fact('DOI', writing.doi, writing.doi ? `https://doi.org/${writing.doi}` : null),
    fact('Original', writing.originalUrl ? hostLabel(writing.originalUrl) : null, writing.originalUrl),
  );
}

export function pressFacts(item: PressItem): Fact[] {
  return factList(
    fact('Publication', item.outlet),
    fact('Date', formatDate(item.date) ?? String(item.year)),
    fact('Author', item.author),
    fact('Category', item.category),
    fact('Length', item.minutes ? `${item.minutes} min` : null),
    fact('Original', item.url ? hostLabel(item.url) : null, item.url),
  );
}

/** "example.com" for a link whose label would otherwise be the whole URL. */
function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
