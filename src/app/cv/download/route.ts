import {
  dateRange,
  displayUrl,
  exhibitionPlace,
  groupSkills,
  joinParts,
  paragraphs,
  SKILL_CATEGORY_LABEL,
  sortByYearDesc,
  sortPress,
  updatedLabel,
} from '@/components/raisonne/profile/format';
import { formatDate } from '@/components/raisonne/works/lib';
import { getSiteData } from '@/fixtures';
import { catalogueCounts, fillTokens } from '@/lib/records';

import { CvPdf } from './pdf';

/**
 * The CV as a file: one click, a paginated PDF, the same sections the page
 * shows and in the same order.
 *
 * It is built from the same data the page renders, so the two cannot drift.
 * An install that uploads its own prepared PDF sets Cv.pdfUrl instead, and
 * the button links there rather than here.
 */

export const dynamic = 'force-static';

/** "Demo-Artist-CV.pdf" */
function fileName(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return `${slug || 'Artist'}-CV.pdf`;
}

export function GET(): Response {
  const data = getSiteData();
  const { artist, exhibitions, awards, press, collaborations, cv } = data;
  const counts = catalogueCounts(data);

  const pdf = new CvPdf({ title: `${artist.name} CV`, author: artist.name });
  pdf.documentTitle(artist.name, joinParts([artist.tagline, artist.location], ' | ') || null);

  const contact = joinParts(
    [artist.email, ...artist.links.filter(link => link.kind !== 'marketplace').map(link => displayUrl(link.href))],
    ' | ',
  );
  if (contact) pdf.paragraph(contact, { size: 9 });
  const updated = updatedLabel(cv?.updatedAt);
  if (updated) pdf.paragraph(updated, { size: 9 });

  const bio = paragraphs(fillTokens(artist.bio, counts));
  if (bio.length > 0) {
    pdf.heading('Biography');
    for (const block of bio) {
      pdf.paragraph(block);
      pdf.space(4);
    }
  }

  const statement = paragraphs(fillTokens(artist.statement, counts));
  if (statement.length > 0) {
    pdf.heading('Statement');
    for (const block of statement) {
      pdf.paragraph(block);
      pdf.space(4);
    }
  }

  if (cv && cv.experience.length > 0) {
    pdf.heading('Experience');
    for (const role of cv.experience) {
      pdf.entry({
        date: dateRange(role.startDate, role.endDate),
        title: role.title,
        subtitle: joinParts([role.organization, role.location]) || null,
        body: role.description,
        bullets: role.highlights,
      });
    }
  }

  if (cv && cv.education.length > 0) {
    pdf.heading('Education');
    for (const entry of cv.education) {
      pdf.entry({
        date: dateRange(entry.startDate, entry.endDate),
        title: entry.title,
        subtitle: joinParts([entry.institution, entry.location]) || null,
        body: entry.description,
      });
    }
  }

  if (cv && cv.skills.length > 0) {
    pdf.heading('Skills');
    for (const group of groupSkills(cv.skills)) {
      pdf.labelled(SKILL_CATEGORY_LABEL[group.category], group.skills.map(skill => skill.name).join(', '));
    }
  }

  if (exhibitions.length > 0) {
    pdf.heading('Exhibitions');
    for (const show of sortByYearDesc(exhibitions)) {
      pdf.entry({
        date: String(show.year),
        title: show.title,
        subtitle: joinParts([exhibitionPlace(show), show.curator ? `Curated by ${show.curator}` : null], ' | ') || null,
      });
    }
  }

  if (awards.length > 0) {
    pdf.heading('Awards');
    for (const award of sortByYearDesc(awards)) {
      pdf.entry({
        date: String(award.year),
        title: award.title,
        subtitle: joinParts([award.organization, award.result]) || null,
      });
    }
  }

  if (collaborations.length > 0) {
    pdf.heading('Collaborations');
    for (const collaboration of collaborations) {
      pdf.entry({
        date: collaboration.year ? String(collaboration.year) : null,
        title: collaboration.title,
        subtitle:
          joinParts([collaboration.kind, collaboration.partners.map(partner => partner.name).join(', ')], ' | ') ||
          null,
      });
    }
  }

  if (press.length > 0) {
    pdf.heading('Press');
    for (const item of sortPress(press)) {
      pdf.entry({
        date: formatDate(item.date) ?? String(item.year),
        title: item.title,
        subtitle: joinParts([item.outlet, item.author]) || null,
      });
    }
  }

  const bytes = pdf.bytes();
  return new Response(bytes as BodyInit, {
    headers: {
      'content-type': 'application/pdf',
      'content-length': String(bytes.byteLength),
      'content-disposition': `attachment; filename="${fileName(artist.name)}"`,
      'cache-control': 'public, max-age=0, must-revalidate',
    },
  });
}
