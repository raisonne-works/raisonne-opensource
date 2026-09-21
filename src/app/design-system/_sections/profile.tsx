import { ArtistHero, ArtistHeroSkeleton } from '@/components/raisonne/profile/artist-hero';
import { ArtistLinkList, groupLinks } from '@/components/raisonne/profile/artist-links';
import { AwardList, AwardListSkeleton } from '@/components/raisonne/profile/award-list';
import { BioSkeleton, BioWithCounts } from '@/components/raisonne/profile/bio-with-counts';
import { CollaborationList, CollaborationListSkeleton } from '@/components/raisonne/profile/collaboration-list';
import { CvContact } from '@/components/raisonne/profile/cv-contact';
import {
  EducationList,
  ExperienceList,
  ExperienceListSkeleton,
} from '@/components/raisonne/profile/experience-list';
import { Highlights, HighlightsSkeleton, highlightsFor } from '@/components/raisonne/profile/highlights';
import { MintingAddresses, MintingAddressesSkeleton } from '@/components/raisonne/profile/minting-addresses';
import { PartnerGroups, PartnerGroupsSkeleton } from '@/components/raisonne/profile/partner-groups';
import { ResearchAreas, ResearchAreasSkeleton } from '@/components/raisonne/profile/research-areas';
import { SkillGroups, SkillGroupsSkeleton } from '@/components/raisonne/profile/skill-groups';
import { StudioCarousel, StudioCarouselSkeleton } from '@/components/raisonne/profile/studio-carousel';
import { Cv, CvSkeleton } from '@/components/raisonne/profile/cv';
import {
  ExhibitionKindBadge,
  ExhibitionList,
  ExhibitionListSkeleton,
} from '@/components/raisonne/profile/exhibition-list';
import { EXHIBITION_KIND_ORDER, sortByYearDesc, sortPress } from '@/components/raisonne/profile/format';
import { PressList, PressListSkeleton } from '@/components/raisonne/profile/press-list';
import { DownloadCvButton, PrintButton } from '@/components/raisonne/profile/print-button';
import { ProfileError } from '@/components/raisonne/profile/profile-error';
import { Button } from '@/components/ui/button';
import { getSiteData } from '@/fixtures';
import { catalogueCounts, emptySiteData } from '@/lib/records';
import type { SiteData } from '@/lib/types';

import { Specimen, SpecimenGrid } from '../_foundations/specimen';

export const PROFILE_TOPICS = [
  { id: 'profile-artist', label: 'Artist' },
  { id: 'profile-about', label: 'About blocks' },
  { id: 'profile-exhibitions', label: 'Exhibitions' },
  { id: 'profile-awards', label: 'Awards and press' },
  { id: 'profile-cv-sections', label: 'CV sections' },
  { id: 'profile-cv', label: 'The whole CV' },
] as const;

function Group({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="flex scroll-mt-20 flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        <p className="max-w-prose text-sm text-pretty text-muted-foreground">{description}</p>
      </div>
      <SpecimenGrid>{children}</SpecimenGrid>
    </section>
  );
}

/**
 * The profile components (home hero, exhibitions, awards, press, CV) with
 * the site's own data, each followed by its empty and loading states.
 */
export function ProfileSection({ data = getSiteData() }: { data?: SiteData } = {}) {
  const { artist, exhibitions, awards, press, collaborations, cv } = data;
  const counts = catalogueCounts(data);

  const emptySite = emptySiteData(artist.name);
  const nameOnly = emptySite.artist;
  const links = groupLinks(artist.links);
  const cvSample: SiteData = {
    ...data,
    exhibitions: sortByYearDesc(exhibitions).slice(0, 10),
    press: sortPress(press).slice(0, 6),
  };

  return (
    <div className="flex flex-col gap-16">
      <Group
        id="profile-artist"
        title="Artist"
        description="The top of the home page. Text only and capped at reading width, so the featured work below it carries the page. Every field but the name is optional."
      >
        <Specimen
          title="ArtistHero"
          source="raisonne/profile/artist-hero"
          span="full"
          stageClassName="block"
          note="Shows the opening sentences of the statement and links to the full text on the CV. Links open in a new tab and say so to screen readers."
        >
          <ArtistHero artist={artist} headingLevel={5} />
        </Specimen>
        <Specimen title="ArtistHero, name only" source="raisonne/profile/artist-hero" span={2} stageClassName="block">
          <ArtistHero artist={nameOnly} headingLevel={5} />
        </Specimen>
        <Specimen title="ArtistHero, loading" source="ArtistHeroSkeleton" stageClassName="block">
          <ArtistHeroSkeleton />
        </Specimen>
      </Group>


      <Group
        id="profile-about"
        title="About blocks"
        description="The blocks the About page is made of. The biography writes the catalogue's live counts into the artist's own sentences; the minting addresses are printed in full, because a shortened address is exactly what an impostor's address matches."
      >
        <Specimen
          title="BioWithCounts"
          source="raisonne/profile/bio-with-counts"
          span={2}
          stageClassName="block"
          note="{{artworks}}, {{series}}, {{soloExhibitions}} and their friends resolve from the live counts. A token nobody recognises stays as it was typed."
        >
          <BioWithCounts text={artist.bio} counts={counts} />
        </Specimen>
        <Specimen
          title="BioWithCounts, tokens"
          source="raisonne/profile/bio-with-counts"
          stageClassName="block"
        >
          <BioWithCounts
            text={"{{artworks}} works in {{series}} series, {{soloExhibitions}} solo shows and {{awards}} awards.\n\nAnd one {{typo}} that stays visible."}
            counts={counts}
          />
        </Specimen>
        <Specimen title="BioWithCounts, loading" source="BioSkeleton" stageClassName="block">
          <BioSkeleton />
        </Specimen>

        <Specimen
          title="Highlights"
          source="raisonne/profile/highlights"
          span={2}
          stageClassName="block"
          note="Every number is a link into the records behind it. A count of zero is left out."
        >
          <Highlights highlights={highlightsFor(data, counts)} />
        </Specimen>
        <Specimen title="Highlights, loading" source="HighlightsSkeleton" stageClassName="block">
          <HighlightsSkeleton items={4} />
        </Specimen>

        <Specimen
          title="StudioCarousel"
          source="raisonne/profile/studio-carousel"
          span={2}
          stageClassName="block"
          note="A scroller, not a slideshow: nothing moves on its own, the arrow keys work, and each slide keeps its own caption and credit."
        >
          {(artist.images ?? []).length > 0 ? (
            <StudioCarousel images={artist.images ?? []} />
          ) : (
            <StudioCarouselSkeleton />
          )}
        </Specimen>
        <Specimen title="StudioCarousel, loading" source="StudioCarouselSkeleton" stageClassName="block">
          <StudioCarouselSkeleton />
        </Specimen>

        <Specimen
          title="MintingAddresses"
          source="raisonne/profile/minting-addresses"
          span={2}
          stageClassName="block"
          note="The whole address, a copy button, the chain's explorer, and the artist's own warning above them."
        >
          <MintingAddresses wallets={artist.wallets} notice={artist.securityNotice} />
        </Specimen>
        <Specimen title="MintingAddresses, loading" source="MintingAddressesSkeleton" stageClassName="block">
          <MintingAddressesSkeleton />
        </Specimen>

        <Specimen title="ResearchAreas" source="raisonne/profile/research-areas" span={2} stageClassName="block">
          {(artist.researchAreas ?? []).length > 0 ? (
            <ResearchAreas areas={artist.researchAreas ?? []} headingLevel={6} />
          ) : (
            <ResearchAreasSkeleton />
          )}
        </Specimen>
        <Specimen title="ResearchAreas, loading" source="ResearchAreasSkeleton" stageClassName="block">
          <ResearchAreasSkeleton items={2} />
        </Specimen>

        <Specimen title="PartnerGroups" source="raisonne/profile/partner-groups" span={2} stageClassName="block">
          {(artist.partners ?? []).length > 0 ? (
            <PartnerGroups groups={artist.partners ?? []} headingLevel={6} />
          ) : (
            <PartnerGroupsSkeleton />
          )}
        </Specimen>
        <Specimen title="PartnerGroups, loading" source="PartnerGroupsSkeleton" stageClassName="block">
          <PartnerGroupsSkeleton groups={2} />
        </Specimen>

        <Specimen
          title="ArtistLinkList"
          source="raisonne/profile/artist-links"
          stageClassName="block"
          note="An icon for the kind of place a link points at, the handle beside it, and rel=me on the artist's own other sites. lucide ships no brand marks, and a catalogue should not carry twenty of them."
        >
          <ArtistLinkList links={links.social} className="flex flex-col gap-0.5" />
        </Specimen>
        <Specimen title="ArtistLinkList, marketplaces" source="raisonne/profile/artist-links" stageClassName="block">
          <ArtistLinkList links={links.marketplace} className="flex flex-col gap-0.5" />
        </Specimen>
      </Group>

      <Group
        id="profile-exhibitions"
        title="Exhibitions"
        description="Rows share one rhythm: the year as data on the left, the title and place, the kind on the right. Titles link out when the show has a page."
      >
        <Specimen
          title="ExhibitionList"
          source="raisonne/profile/exhibition-list"
          span={2}
          stageClassName="block"
          note="Newest first. The home page shows eight with limit={8}; this one shows five."
        >
          <ExhibitionList exhibitions={exhibitions} limit={5} />
        </Specimen>
        <Specimen
          title="ExhibitionKindBadge"
          source="raisonne/profile/exhibition-list"
          note="Solo shows get the filled badge; every other kind is outlined."
        >
          {EXHIBITION_KIND_ORDER.map(kind => (
            <ExhibitionKindBadge key={kind} kind={kind} />
          ))}
        </Specimen>
        <Specimen title="ExhibitionList, empty" source="raisonne/profile/exhibition-list" stageClassName="block">
          <ExhibitionList exhibitions={[]} />
        </Specimen>
        <Specimen title="ExhibitionList, loading" source="ExhibitionListSkeleton" span={2} stageClassName="block">
          <ExhibitionListSkeleton rows={3} />
        </Specimen>
      </Group>

      <Group
        id="profile-awards"
        title="Awards and press"
        description="The same row rhythm. Press dates are data, in mono; an article without a known day shows its year."
      >
        <Specimen title="AwardList" source="raisonne/profile/award-list" span={2} stageClassName="block">
          <AwardList awards={awards} />
        </Specimen>
        <Specimen title="AwardList, empty" source="raisonne/profile/award-list" stageClassName="block">
          <AwardList awards={[]} />
        </Specimen>
        <Specimen title="AwardList, loading" source="AwardListSkeleton" stageClassName="block">
          <AwardListSkeleton rows={2} />
        </Specimen>
        <Specimen
          title="PressList"
          source="raisonne/profile/press-list"
          span={2}
          stageClassName="block"
          note="Newest first by date. The home page shows five with limit={5}."
        >
          <PressList press={press} limit={5} />
        </Specimen>
        <Specimen title="PressList, empty" source="raisonne/profile/press-list" stageClassName="block">
          <PressList press={[]} />
        </Specimen>
        <Specimen title="PressList, loading" source="PressListSkeleton" span={2} stageClassName="block">
          <PressListSkeleton rows={3} />
        </Specimen>
      </Group>


      <Group
        id="profile-cv-sections"
        title="CV sections"
        description="The sections a CV needs beyond exhibitions, awards and press. They share one rhythm with the lists above: the dates in their own column, the entry beside them, so a printed page reads as one document."
      >
        <Specimen title="CvContact" source="raisonne/profile/cv-contact" span={2} stageClassName="block">
          <CvContact artist={artist} updatedAt={cv?.updatedAt} />
        </Specimen>
        <Specimen
          title="ExperienceList"
          source="raisonne/profile/experience-list"
          span={2}
          stageClassName="block"
          note="A role with no end date reads 'to Present'. Highlights are a plain bulleted list."
        >
          <ExperienceList roles={cv?.experience ?? []} headingLevel={6} />
        </Specimen>
        <Specimen title="EducationList" source="raisonne/profile/experience-list" span={2} stageClassName="block">
          <EducationList education={cv?.education ?? []} headingLevel={6} />
        </Specimen>
        <Specimen title="ExperienceList, loading" source="ExperienceListSkeleton" stageClassName="block">
          <ExperienceListSkeleton rows={2} />
        </Specimen>
        <Specimen
          title="SkillGroups"
          source="raisonne/profile/skill-groups"
          span={2}
          stageClassName="block"
          note="A definition list, not a cloud of badges: a line of names is faster to read than twenty pills."
        >
          <SkillGroups skills={cv?.skills ?? []} />
        </Specimen>
        <Specimen title="SkillGroups, loading" source="SkillGroupsSkeleton" stageClassName="block">
          <SkillGroupsSkeleton rows={3} />
        </Specimen>
        <Specimen title="CollaborationList" source="raisonne/profile/collaboration-list" span={2} stageClassName="block">
          <CollaborationList collaborations={collaborations} headingLevel={6} limit={4} />
        </Specimen>
        <Specimen title="CollaborationList, loading" source="CollaborationListSkeleton" stageClassName="block">
          <CollaborationListSkeleton rows={2} />
        </Specimen>
      </Group>

      <Group
        id="profile-cv"
        title="CV"
        description="The full CV page: biography, statement, exhibitions by year with a filter by kind, awards and press, with a contents list on wide screens. It prints as one clean column."
      >
        <Specimen
          title="Cv"
          source="raisonne/profile/cv"
          span="full"
          stageClassName="block"
          note="Shown with the ten newest exhibitions and six newest press items. From 2xl it splits into two columns, the person on the left and the record on the right, and prints as one plain column in that order."
        >
          <Cv data={cvSample} idPrefix="ds-cv-" headingLevel={5} />
        </Specimen>
        <Specimen
          title="Cv, empty"
          source="raisonne/profile/cv"
          span={2}
          stageClassName="block"
          note="A new install before anything is added: each list says what will appear there."
        >
          <Cv data={emptySite} idPrefix="ds-cv-empty-" headingLevel={5} />
        </Specimen>
        <Specimen
          title="Download and print"
          source="raisonne/profile/print-button"
          note="Download is a plain link to /cv/download, which builds a paginated PDF from this same data (or to the artist's own uploaded file when Cv.pdfUrl is set). Print is the browser dialogue, which the print styles shape."
        >
          <DownloadCvButton />
          <PrintButton />
        </Specimen>
        <Specimen title="Cv, loading" source="CvSkeleton" span={2} stageClassName="block">
          <CvSkeleton />
        </Specimen>
        <Specimen
          title="Error"
          source="raisonne/profile/profile-error"
          stageClassName="block"
          note="What /cv shows when it fails to load, with a way forward."
        >
          <ProfileError
            title="The CV could not be shown"
            description="Something went wrong while loading the exhibitions, awards and press. Trying again usually works."
          >
            <Button size="sm">Try again</Button>
          </ProfileError>
        </Specimen>
      </Group>
    </div>
  );
}
