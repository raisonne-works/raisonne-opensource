import { type HeadingLevel, nextHeadingLevel } from '@/components/raisonne/shell/heading';
import { READING_CLASS } from '@/components/raisonne/shell/measure';
import { Section } from '@/components/raisonne/shell/page';
import { plural } from '@/components/raisonne/works/lib';
import { Skeleton } from '@/components/ui/skeleton';
import { catalogueCounts, fillTokens } from '@/lib/records';
import type { SiteData } from '@/lib/types';
import { cn } from '@/lib/utils';

import { AwardListEmpty, AwardListSkeleton, AwardRow } from './award-list';
import { CollaborationList, CollaborationListSkeleton } from './collaboration-list';
import { CvContact } from './cv-contact';
import { EducationList, ExperienceList, ExperienceListSkeleton } from './experience-list';
import { ExhibitionListSkeleton } from './exhibition-list';
import { ExhibitionTimeline } from './exhibition-timeline';
import { groupByYear, paragraphs, sortByYearDesc, sortPress, yearSpan } from './format';
import { PressListEmpty, PressListSkeleton, PressRow } from './press-list';
import { SkillGroups } from './skill-groups';
import { YearGroups } from './year-groups';

interface ContentsEntry {
  id: string;
  label: string;
  count: number | null;
}

/** Sections are airy on screen and compact on paper. */
const SECTION_CLASS = 'print:gap-3 print:py-4';

function Prose({ blocks }: { blocks: string[] }) {
  return (
    <div className={cn('flex flex-col gap-4 text-base/7 text-pretty', READING_CLASS)}>
      {blocks.map((block, index) => (
        <p key={index}>{block}</p>
      ))}
    </div>
  );
}

/**
 * The artist's full CV: contact details and the date it was last true,
 * biography, statement, roles, study, skills, every exhibition grouped by
 * year, awards, collaborations and press.
 *
 * A contents list sits beside it from lg, and from 2xl the body splits into
 * two columns so a 2000 px screen is used without stretching any text past
 * reading width: the person on the left, the record on the right. It prints
 * as one plain column, in that same order, with the print styles in
 * src/app/cv/print.css.
 *
 * A section with nothing in it is not printed at all, so a CV that has no
 * roles yet does not carry an empty heading onto paper.
 */
export function Cv({
  data,
  idPrefix = '',
  headingLevel = 2,
  className,
}: {
  data: SiteData;
  /** Prefixes the section ids (#biography, #exhibitions...) where the CV is shown inside another page. */
  idPrefix?: string;
  /** The level of each section's title; 2 on the CV page. */
  headingLevel?: HeadingLevel;
  className?: string;
}) {
  const { artist, exhibitions, awards, press, collaborations, cv } = data;
  const entryLevel = nextHeadingLevel(headingLevel);
  // The same substitution the About page and the PDF run, so the three
  // never disagree and no visitor reads "{{soloExhibitions}}".
  const counts = catalogueCounts(data);
  const bio = paragraphs(fillTokens(artist.bio, counts));
  const statement = paragraphs(fillTokens(artist.statement, counts));
  const experience = cv?.experience ?? [];
  const education = cv?.education ?? [];
  const skills = cv?.skills ?? [];
  const exhibitionYears = yearSpan(exhibitions.map(exhibition => exhibition.year));
  const pressYears = yearSpan(press.map(item => item.year));

  const contents: ContentsEntry[] = [
    ...(bio.length > 0 ? [{ id: `${idPrefix}biography`, label: 'Biography', count: null }] : []),
    ...(statement.length > 0 ? [{ id: `${idPrefix}statement`, label: 'Statement', count: null }] : []),
    ...(experience.length > 0
      ? [{ id: `${idPrefix}experience`, label: 'Experience', count: experience.length }]
      : []),
    ...(education.length > 0 ? [{ id: `${idPrefix}education`, label: 'Education', count: education.length }] : []),
    ...(skills.length > 0 ? [{ id: `${idPrefix}skills`, label: 'Skills', count: skills.length }] : []),
    { id: `${idPrefix}exhibitions`, label: 'Exhibitions', count: exhibitions.length },
    { id: `${idPrefix}awards`, label: 'Awards', count: awards.length },
    ...(collaborations.length > 0
      ? [{ id: `${idPrefix}collaborations`, label: 'Collaborations', count: collaborations.length }]
      : []),
    { id: `${idPrefix}press`, label: 'Press', count: press.length },
  ];

  return (
    <div
      data-slot="cv"
      className={cn('grid gap-x-12 lg:grid-cols-[12rem_minmax(0,1fr)] xl:gap-x-16 print:block', className)}
    >
      <aside className="hidden lg:block print:hidden">
        <nav aria-label="On this page" className="sticky top-14 flex flex-col gap-3 py-10 md:py-12">
          <p className="text-sm font-medium">On this page</p>
          <ul className="flex flex-col gap-0.5 border-l border-border">
            {contents.map(entry => (
              <li key={entry.id}>
                <a
                  href={`#${entry.id}`}
                  className="-ml-px flex items-baseline justify-between gap-3 border-l border-transparent py-1 pr-1 pl-3 text-sm text-muted-foreground outline-none hover:border-foreground hover:text-foreground focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {entry.label}
                  {entry.count !== null ? <span className="text-xs tabular-nums">{entry.count}</span> : null}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className="min-w-0 max-w-4xl 2xl:grid 2xl:max-w-none 2xl:grid-cols-2 2xl:items-start 2xl:gap-x-16 print:block">
        <CvContact artist={artist} updatedAt={cv?.updatedAt} className="pt-6 2xl:col-span-2 print:pt-2" />

        {/* The person. */}
        <div className="min-w-0">
          {bio.length > 0 ? (
            <Section
              id={`${idPrefix}biography`}
              title="Biography"
              headingLevel={headingLevel}
              size="default"
              className={SECTION_CLASS}
            >
              <Prose blocks={bio} />
            </Section>
          ) : null}

          {statement.length > 0 ? (
            <Section
              id={`${idPrefix}statement`}
              title="Statement"
              headingLevel={headingLevel}
              size="default"
              className={SECTION_CLASS}
            >
              <Prose blocks={statement} />
            </Section>
          ) : null}

          {experience.length > 0 ? (
            <Section
              id={`${idPrefix}experience`}
              title="Experience"
              headingLevel={headingLevel}
              size="default"
              className={SECTION_CLASS}
            >
              <ExperienceList roles={experience} headingLevel={entryLevel} />
            </Section>
          ) : null}

          {education.length > 0 ? (
            <Section
              id={`${idPrefix}education`}
              title="Education"
              headingLevel={headingLevel}
              size="default"
              className={SECTION_CLASS}
            >
              <EducationList education={education} headingLevel={entryLevel} />
            </Section>
          ) : null}

          {skills.length > 0 ? (
            <Section
              id={`${idPrefix}skills`}
              title="Skills"
              headingLevel={headingLevel}
              size="default"
              className={SECTION_CLASS}
            >
              <SkillGroups skills={skills} />
            </Section>
          ) : null}
        </div>

        {/* The record. */}
        <div className="min-w-0">
          <Section
            id={`${idPrefix}exhibitions`}
            title="Exhibitions"
            headingLevel={headingLevel}
            size="default"
            className={SECTION_CLASS}
            description={
              exhibitions.length > 0 ? `${plural(exhibitions.length, 'exhibition')}, ${exhibitionYears}.` : undefined
            }
          >
            <ExhibitionTimeline exhibitions={exhibitions} headingLevel={entryLevel} />
          </Section>

          <Section
            id={`${idPrefix}awards`}
            title="Awards"
            headingLevel={headingLevel}
            size="default"
            className={SECTION_CLASS}
          >
            {awards.length > 0 ? (
              <YearGroups
                groups={groupByYear(sortByYearDesc(awards))}
                getKey={award => award.id}
                headingLevel={entryLevel}
                renderItem={award => <AwardRow award={award} showYear={false} />}
              />
            ) : (
              <AwardListEmpty />
            )}
          </Section>

          {collaborations.length > 0 ? (
            <Section
              id={`${idPrefix}collaborations`}
              title="Collaborations"
              headingLevel={headingLevel}
              size="default"
              className={SECTION_CLASS}
            >
              <CollaborationList collaborations={collaborations} headingLevel={entryLevel} />
            </Section>
          ) : null}

          <Section
            id={`${idPrefix}press`}
            title="Press"
            headingLevel={headingLevel}
            size="default"
            className={SECTION_CLASS}
            description={press.length > 0 ? `${plural(press.length, 'article')}, ${pressYears}.` : undefined}
          >
            {press.length > 0 ? (
              <YearGroups
                groups={groupByYear(sortPress(press))}
                getKey={item => item.id}
                headingLevel={entryLevel}
                renderItem={item => <PressRow item={item} withYear={false} />}
              />
            ) : (
              <PressListEmpty />
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

/** The CV's loading state: the same columns, in skeleton. */
export function CvSkeleton({ className }: { className?: string }) {
  return (
    <div role="status" className={cn('grid gap-x-12 lg:grid-cols-[12rem_minmax(0,1fr)] xl:gap-x-16', className)}>
      <span className="sr-only">Loading the CV</span>
      <div aria-hidden className="hidden flex-col gap-3 py-10 md:py-12 lg:flex">
        <Skeleton className="h-4 w-24" />
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-4 w-32" />
        ))}
      </div>
      <div aria-hidden className="flex min-w-0 max-w-4xl flex-col gap-6 py-10 md:py-12">
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-7 w-40" />
        <div className={cn('flex flex-col gap-2.5', READING_CLASS)}>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <Skeleton className="mt-6 h-7 w-40" />
        <ExperienceListSkeleton rows={2} />
        <Skeleton className="mt-6 h-7 w-40" />
        <ExhibitionListSkeleton rows={6} />
        <Skeleton className="mt-6 h-7 w-28" />
        <AwardListSkeleton rows={2} />
        <Skeleton className="mt-6 h-7 w-36" />
        <CollaborationListSkeleton rows={2} />
        <Skeleton className="mt-6 h-7 w-24" />
        <PressListSkeleton rows={3} />
      </div>
    </div>
  );
}
