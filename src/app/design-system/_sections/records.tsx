import { ClientLogos, ClientLogosSkeleton } from '@/components/raisonne/commissions/client-logos';
import { FeaturedCollaborations } from '@/components/raisonne/commissions/featured-collaborations';
import { CommissionsHero, CommissionsHeroSkeleton } from '@/components/raisonne/commissions/hero';
import { Services, ServicesSkeleton } from '@/components/raisonne/commissions/services';
import { AboutSection } from '@/components/raisonne/records/about-section';
import {
  awardFacts,
  collaborationFacts,
  exhibitionFacts,
  installationFacts,
  pressFacts,
} from '@/components/raisonne/records/facts';
import { PartnerList } from '@/components/raisonne/records/partner-list';
import { PressDetailSkeleton } from '@/components/raisonne/records/press-detail';
import { PressPlayer } from '@/components/raisonne/records/press-player';
import { RecordBreadcrumb } from '@/components/raisonne/records/record-breadcrumb';
import { RecordCard, RecordCardGrid, RecordCardGridSkeleton } from '@/components/raisonne/records/record-card';
import { RecordFacts, RecordFactsSkeleton } from '@/components/raisonne/records/record-facts';
import { RecordHero, RecordHeroSkeleton } from '@/components/raisonne/records/record-hero';
import { RecordIntro } from '@/components/raisonne/records/record-intro';
import { resolveRecordRefs } from '@/components/raisonne/records/resolve';
import { WritingArticleSkeleton } from '@/components/raisonne/records/writing-article';
import { Section } from '@/components/raisonne/shell/page';
import { RichTextView } from '@/components/raisonne/shell/rich-text';
import { ChapterBlock } from '@/components/raisonne/story/chapter-block';
import { EmbedBlock } from '@/components/raisonne/story/embed-block';
import { FilmBlock } from '@/components/raisonne/story/film-block';
import { GalleryBlock } from '@/components/raisonne/story/gallery-block';
import { ImmersiveBlock } from '@/components/raisonne/story/immersive-block';
import { MediaBlock } from '@/components/raisonne/story/media-block';
import { PressBlock, PressLinkList } from '@/components/raisonne/story/press-block';
import { ProcessBlock } from '@/components/raisonne/story/process-block';
import { RelatedBlock } from '@/components/raisonne/story/related-block';
import { SketchbookBlock } from '@/components/raisonne/story/sketchbook-block';
import { StoryBlocksSkeleton } from '@/components/raisonne/story/story-blocks';
import { TextBlock } from '@/components/raisonne/story/text-block';
import { getSiteData } from '@/fixtures';
import type { RecordRef, StoryBlock } from '@/lib/types';

import { Specimen, SpecimenGrid } from '../_foundations/specimen';
import {
  SAMPLE_TEXT,
  SAMPLE_TEXT_TITLE_ONLY,
  anyImage,
  anyVideo,
  firstBlock,
  sampleChapter,
  sampleEmbed,
} from './records-samples';

/** The in-page anchors of this section, for the design system's navigation. */
export const RECORDS_TOPICS = [
  { id: 'records-text', label: 'Text blocks' },
  { id: 'records-media-blocks', label: 'Media blocks' },
  { id: 'records-link-blocks', label: 'Links and embeds' },
  { id: 'records-pages', label: 'Record pages' },
  { id: 'records-press', label: 'Press and writing' },
  { id: 'records-commissions', label: 'Commissions' },
] as const;

/** Sections sit under a sticky bar on phones, and only under the header from lg. */
const SUBSECTION_CLASS = 'scroll-mt-28 lg:scroll-mt-20';

const SPECIMEN_HEADING = 5;

/**
 * The eleven story blocks and the record pages built from them, rendered
 * with this install's own content. Where the install uses no block of a
 * kind, a written sample stands in and the note says so.
 */
export function RecordsSection() {
  const data = getSiteData();
  const image = anyImage(data);
  const video = anyVideo(data);

  const text = firstBlock(data, 'text') ?? SAMPLE_TEXT;
  const media =
    firstBlock(data, 'media') ?? (image ? ({ type: 'media', id: 'sample-media', asset: image } as StoryBlock) : null);
  const gallery = firstBlock(data, 'gallery');
  const film = firstBlock(data, 'film') ?? (video ? { type: 'film' as const, id: 'sample-film', title: 'A sample film', description: 'The first video this install holds, shown as a documentary block.', video } : null);
  const process = firstBlock(data, 'process');
  const sketchbook = firstBlock(data, 'sketchbook');
  const related = firstBlock(data, 'related');
  const press = firstBlock(data, 'press');
  const embed = firstBlock(data, 'embed') ?? sampleEmbed(image);
  const chapter = firstBlock(data, 'chapter') ?? sampleChapter(image);
  const immersive =
    firstBlock(data, 'immersive') ??
    (video ? { type: 'immersive' as const, id: 'sample-room', title: 'A walk-in room', poster: image, video, room: 'cylinder' as const } : null);

  const sampleRefs: RecordRef[] = [
    data.series[0] ? ({ type: 'series', key: data.series[0].slug } as RecordRef) : null,
    data.installations[0] ? ({ type: 'installation', key: data.installations[0].slug } as RecordRef) : null,
    data.exhibitions.find(show => show.slug) ? ({ type: 'exhibition', key: data.exhibitions.find(show => show.slug)!.slug! } as RecordRef) : null,
  ].filter((ref): ref is RecordRef => ref !== null);
  const previews = resolveRecordRefs(related ? related.refs : sampleRefs);

  const pressItems = press ? data.press.filter(item => press.pressIds.includes(item.id)) : data.press.slice(0, 3);
  const playable = data.press.find(item => (item.kind ?? 'article') !== 'article') ?? null;

  const exhibition = data.exhibitions.find(show => show.slug) ?? data.exhibitions[0] ?? null;
  const installation = data.installations[0] ?? data.immersives[0] ?? null;
  const collaboration = data.collaborations[0] ?? null;
  const award = data.awards[0] ?? null;
  const commissions = data.commissions;

  return (
    <div className="flex flex-col">
      <Section
        id="records-text"
        headingLevel={3}
        title="Text blocks"
        className={SUBSECTION_CLASS}
        description="Every page that is not a token is built from story blocks. They render this install's own content; where a kind is unused, a written sample stands in."
      >
        <SpecimenGrid>
          <Specimen
            title="TextBlock"
            source="raisonne/story/text-block"
            span="full"
            stageClassName="block"
            note="One to four columns, capped at a readable measure each. Paragraphs are kept whole across a column break, and the longer passage opens in place."
          >
            <TextBlock block={text} headingLevel={SPECIMEN_HEADING} />
          </Specimen>

          <Specimen
            title="TextBlock, nothing written yet"
            source="raisonne/story/text-block"
            span={2}
            stageClassName="block"
            note="A block with a title and no body renders the title alone rather than an empty frame."
          >
            <TextBlock block={SAMPLE_TEXT_TITLE_ONLY} headingLevel={SPECIMEN_HEADING} />
          </Specimen>

          <Specimen
            title="RichTextView"
            source="raisonne/shell/rich-text"
            span={2}
            stageClassName="block"
            note="The only renderer of rich text: paragraphs, headings, quotes, lists, links and inline images. Heading levels are relative to where it sits."
          >
            <RichTextView
              value={[
                { type: 'heading', level: 2, children: [{ text: 'A heading' }] },
                {
                  type: 'paragraph',
                  children: [
                    { text: 'Rich text carries ' },
                    { text: 'bold', bold: true },
                    { text: ', ' },
                    { text: 'italic', italic: true },
                    { text: ' and ' },
                    { text: 'links', href: 'https://example.com' },
                    { text: '.' },
                  ],
                },
                { type: 'quote', children: [{ text: 'A quotation sits against a rule, not in a box.' }] },
                { type: 'list', ordered: true, items: [[{ text: 'First' }], [{ text: 'Second' }]] },
              ]}
              headingLevel={SPECIMEN_HEADING}
            />
          </Specimen>

          {process ? (
            <Specimen
              title="ProcessBlock"
              source="raisonne/story/process-block"
              span="full"
              stageClassName="block"
              note="Numbered steps beside one picture. The picture stays in view while the steps scroll from xl up."
            >
              <ProcessBlock block={process} headingLevel={SPECIMEN_HEADING} />
            </Specimen>
          ) : (
            <Specimen title="ProcessBlock" source="raisonne/story/process-block" span={2} note="This install has no process block yet." >
              <p className="text-sm text-muted-foreground">Nothing to show: no record here documents its process.</p>
            </Specimen>
          )}

          <Specimen
            title="ChapterBlock"
            source="raisonne/story/chapter-block"
            span="full"
            stageClassName="block"
            note="A title section for a long page. Over a picture the text sits on a scrim in the theme's own background colour, so it reads in light and in dark."
          >
            <ChapterBlock block={chapter} headingLevel={SPECIMEN_HEADING} />
          </Specimen>
        </SpecimenGrid>
      </Section>

      <Section
        id="records-media-blocks"
        headingLevel={3}
        title="Media blocks"
        className={SUBSECTION_CLASS}
        description="Pictures and video. Nothing plays on its own, and no video file is fetched until the visitor presses play."
      >
        <SpecimenGrid>
          {media ? (
            <Specimen
              title="MediaBlock"
              source="raisonne/story/media-block"
              span="full"
              stageClassName="block"
              note="One image or video at full width, capped at most of the viewport so a tall picture does not take the whole screen."
            >
              <MediaBlock block={media as Extract<StoryBlock, { type: 'media' }>} />
            </Specimen>
          ) : null}

          {gallery ? (
            <Specimen
              title="GalleryBlock"
              source="raisonne/story/gallery-block"
              span="full"
              stageClassName="block"
              note="Captioned photographs and videos: one column on a phone, then two, three and four as the screen widens. Captions carry the credit lines a museum image needs."
            >
              <GalleryBlock block={gallery} headingLevel={SPECIMEN_HEADING} />
            </Specimen>
          ) : (
            <Specimen title="GalleryBlock" source="raisonne/story/gallery-block" span={2} note="This install has no gallery block yet.">
              <p className="text-sm text-muted-foreground">Nothing to show: no record here carries a photo gallery.</p>
            </Specimen>
          )}

          {sketchbook ? (
            <Specimen
              title="SketchbookBlock"
              source="raisonne/story/sketchbook-block"
              span="full"
              stageClassName="block"
              note="Studies in the same dense grid the catalogue uses for works, because they are read as a set."
            >
              <SketchbookBlock block={sketchbook} headingLevel={SPECIMEN_HEADING} />
            </Specimen>
          ) : null}

          {film ? (
            <Specimen
              title="FilmBlock"
              source="raisonne/story/film-block"
              span="full"
              stageClassName="block"
              note="A documentary or making-of film. The poster is all that loads; pressing play picks the encoded size that suits the screen."
            >
              <FilmBlock block={film} headingLevel={SPECIMEN_HEADING} />
            </Specimen>
          ) : (
            <Specimen title="FilmBlock" source="raisonne/story/film-block" span={2} note="This install holds no video yet.">
              <p className="text-sm text-muted-foreground">Nothing to show: no record here carries a film.</p>
            </Specimen>
          )}

          {immersive ? (
            <Specimen
              title="ImmersiveBlock"
              source="raisonne/story/immersive-block"
              span="full"
              stageClassName="block"
              note="A work made for a room, shown as its recording. Wave 1 ships no 3D engine, so the poster and the video are the honest version. Without the immersive-rooms module, StoryBlocks renders it as plain media."
            >
              <ImmersiveBlock block={immersive} headingLevel={SPECIMEN_HEADING} />
            </Specimen>
          ) : null}
        </SpecimenGrid>
      </Section>

      <Section
        id="records-link-blocks"
        headingLevel={3}
        title="Links and embeds"
        className={SUBSECTION_CLASS}
        description="Blocks that point somewhere else: other records, press, and video published on another site."
      >
        <SpecimenGrid>
          <Specimen
            title="RelatedBlock"
            source="raisonne/story/related-block"
            span="full"
            stageClassName="block"
            note="The records a page points at, of any type. References are resolved before they reach the component, so a link never points at a record this install does not hold."
          >
            <RelatedBlock
              block={
                related ?? {
                  type: 'related',
                  id: 'sample-related',
                  title: 'Related records',
                  intro: [{ title: null, text: 'One tile shape for every type, so a mixed row reads as one list.' }],
                  refs: sampleRefs,
                }
              }
              previews={previews}
              headingLevel={SPECIMEN_HEADING}
            />
          </Specimen>

          <Specimen
            title="RecordCardGrid, empty"
            source="raisonne/records/record-card"
            span={2}
            stageClassName="block"
            note="What a list of linked records says when there is nothing in it yet."
          >
            <RecordCardGrid previews={[]} />
          </Specimen>

          <Specimen title="RecordCardGrid, loading" source="RecordCardGridSkeleton" span={2} stageClassName="block">
            <RecordCardGridSkeleton count={4} />
          </Specimen>

          <Specimen
            title="PressBlock"
            source="raisonne/story/press-block"
            span="full"
            stageClassName="block"
            note="What has been written about one record. Each row goes to the piece on this site when the text is kept here, and out to the publication when it is not."
          >
            <PressBlock
              block={press ?? { type: 'press', id: 'sample-press', title: 'Written about', pressIds: [] }}
              items={pressItems}
              headingLevel={SPECIMEN_HEADING}
            />
          </Specimen>

          <Specimen
            title="EmbedBlock"
            source="raisonne/story/embed-block"
            span="full"
            stageClassName="block"
            note="Nothing is requested from the other site until the visitor presses play, and the title, context and attribution are in the page's own markup, so they read without JavaScript. An X post cannot be framed without its script, so it is a link out instead."
          >
            <EmbedBlock block={embed} headingLevel={SPECIMEN_HEADING} />
          </Specimen>
        </SpecimenGrid>
      </Section>

      <Section
        id="records-pages"
        headingLevel={3}
        title="Record pages"
        className={SUBSECTION_CLASS}
        description="The parts every page that is not a token is assembled from: the trail, the hero, the facts, and the pairing of the opening text with the record."
      >
        <SpecimenGrid>
          <Specimen title="RecordBreadcrumb" source="raisonne/records/record-breadcrumb" span={2} stageClassName="block">
            <RecordBreadcrumb
              parents={[{ href: '/exhibitions', label: 'Exhibitions' }]}
              current={exhibition?.title ?? 'A show with a long title that has to truncate somewhere'}
            />
          </Specimen>

          {installation ? (
            <Specimen
              title="RecordHero"
              source="raisonne/records/record-hero"
              span="full"
              stageClassName="block"
              note="The picture leads, then the type, the title, the place and one paragraph. A long on-chain title wraps rather than overflowing."
            >
              <RecordHero
                eyebrow="Installation"
                title={installation.title}
                subtitle={installation.subtitle}
                description={installation.description}
                cover={installation.cover}
                tags={installation.tags}
                headingLevel={SPECIMEN_HEADING}
                priority={false}
              />
            </Specimen>
          ) : null}

          <Specimen
            title="RecordHero, no cover"
            source="raisonne/records/record-hero"
            span={2}
            stageClassName="block"
            note="Without a picture the header is text only; nothing reserves space for an image that does not exist."
          >
            <RecordHero
              eyebrow="Award"
              title={award?.title ?? 'An award'}
              subtitle={award?.organization ?? null}
              description={award?.description ?? null}
              headingLevel={SPECIMEN_HEADING}
            />
          </Specimen>

          <Specimen title="RecordHero, loading" source="RecordHeroSkeleton" span={2} stageClassName="block">
            <RecordHeroSkeleton />
          </Specimen>

          {exhibition ? (
            <Specimen
              title="RecordFacts"
              source="raisonne/records/record-facts"
              span={2}
              stageClassName="block"
              note="One row per fact, the label as a row header. Facts with nothing recorded are left out, and the highlights an artist adds sit under the table."
            >
              <RecordFacts
                facts={exhibitionFacts(exhibition)}
                highlights={exhibition.highlights}
                title="The show"
                headingLevel={SPECIMEN_HEADING}
              />
            </Specimen>
          ) : null}

          {installation && 'medium' in installation ? (
            <Specimen title="RecordFacts, an installation" source="raisonne/records/facts" span={2} stageClassName="block">
              <RecordFacts facts={installationFacts(installation)} title="The work" headingLevel={SPECIMEN_HEADING} />
            </Specimen>
          ) : null}

          {award ? (
            <Specimen title="RecordFacts, an award" source="raisonne/records/facts" span={2} stageClassName="block">
              <RecordFacts facts={awardFacts(award)} title="The award" headingLevel={SPECIMEN_HEADING} />
            </Specimen>
          ) : null}

          <Specimen
            title="RecordFacts, nothing recorded"
            source="raisonne/records/record-facts"
            span={2}
            stageClassName="block"
            note="A record with no facts renders nothing at all, rather than an empty table."
          >
            <div className="flex flex-col gap-2">
              <RecordFacts facts={[]} title="The record" headingLevel={SPECIMEN_HEADING} />
              <p className="text-sm text-muted-foreground">Nothing renders here, which is the point.</p>
            </div>
          </Specimen>

          <Specimen title="RecordFacts, loading" source="RecordFactsSkeleton" span={2} stageClassName="block">
            <RecordFactsSkeleton />
          </Specimen>

          {collaboration ? (
            <>
              <Specimen
                title="PartnerList"
                source="raisonne/records/partner-list"
                span={2}
                stageClassName="block"
                note="Credit is a fact of the record, so partners are a list with roles rather than a row of logos."
              >
                <PartnerList partners={collaboration.partners} headingLevel={SPECIMEN_HEADING} />
              </Specimen>

              {collaboration.about ? (
                <Specimen
                  title="AboutSection and RecordIntro"
                  source="raisonne/records/about-section"
                  span="full"
                  stageClassName="block"
                  note="The opening text and the record side by side from xl up, one under the other below that. StoryBlocks makes the same pairing with its first text block."
                >
                  <RecordIntro
                    aside={
                      <RecordFacts
                        facts={collaborationFacts(collaboration)}
                        title="The project"
                        headingLevel={SPECIMEN_HEADING}
                      />
                    }
                  >
                    <AboutSection
                      title="About the project"
                      body={collaboration.about}
                      headingLevel={SPECIMEN_HEADING}
                    />
                  </RecordIntro>
                </Specimen>
              ) : null}
            </>
          ) : null}

          {previews[0] ? (
            <Specimen
              title="RecordCard"
              source="raisonne/records/record-card"
              span={2}
              stageClassName="block"
              note="The tile a reference becomes. The type is named on it, because a catalogue mixes kinds and a picture alone does not say which is which."
            >
              <div className="w-48">
                <RecordCard preview={previews[0]} sizes="12rem" />
              </div>
            </Specimen>
          ) : null}

          <Specimen title="StoryBlocks, loading" source="StoryBlocksSkeleton" span="full" stageClassName="block">
            <StoryBlocksSkeleton />
          </Specimen>
        </SpecimenGrid>
      </Section>

      <Section
        id="records-press"
        headingLevel={3}
        title="Press and writing"
        className={SUBSECTION_CLASS}
        description="The pieces written about the work, kept on this site against link rot, and the artist's own texts."
      >
        <SpecimenGrid>
          <Specimen
            title="PressLinkList"
            source="raisonne/story/press-block"
            span="full"
            stageClassName="block"
            note="The headline, the publication and the date. A piece kept on this site links here; everything else links to the publication in a new tab."
          >
            <PressLinkList items={data.press.slice(0, 5)} />
          </Specimen>

          {data.press[0] ? (
            <Specimen
              title="Press facts"
              source="raisonne/records/facts"
              span={2}
              stageClassName="block"
              note="The same facts table, filled by pressFacts()."
            >
              <RecordFacts facts={pressFacts(data.press[0])} title="Details" headingLevel={SPECIMEN_HEADING} />
            </Specimen>
          ) : null}

          {playable ? (
            <Specimen
              title="PressPlayer"
              source="raisonne/records/press-player"
              span={2}
              stageClassName="block"
              note="An uploaded file plays in the browser's own player. A video on YouTube or Vimeo loads only on play. Anything else is a link to where it lives."
            >
              <PressPlayer item={playable} />
            </Specimen>
          ) : (
            <Specimen title="PressPlayer" source="raisonne/records/press-player" span={2} note="This install has no video or podcast entry yet.">
              <p className="text-sm text-muted-foreground">Nothing to show: every press entry here is an article.</p>
            </Specimen>
          )}

          <Specimen title="PressDetail, loading" source="PressDetailSkeleton" span={2} stageClassName="block">
            <PressDetailSkeleton />
          </Specimen>

          <Specimen title="WritingArticle, loading" source="WritingArticleSkeleton" span={2} stageClassName="block">
            <WritingArticleSkeleton />
          </Specimen>
        </SpecimenGrid>
      </Section>

      <Section
        id="records-commissions"
        headingLevel={3}
        title="Commissions"
        className={SUBSECTION_CLASS}
        description="The page that explains how to work with the artist. It is an optional module, so an install without it answers 404 rather than showing an empty pitch."
      >
        <SpecimenGrid>
          {commissions ? (
            <>
              <Specimen
                title="CommissionsHero"
                source="raisonne/commissions/hero"
                span="full"
                stageClassName="block"
                note="The call to action says whether it opens a mail or a page, rather than opening a surprise."
              >
                <CommissionsHero
                  title={commissions.title}
                  description={commissions.description}
                  cta={commissions.cta}
                  headingLevel={SPECIMEN_HEADING}
                />
              </Specimen>

              <Specimen
                title="Services"
                source="raisonne/commissions/services"
                span="full"
                stageClassName="block"
                note="One card per kind of work. Each enquiry carries the service's name in its subject line, so the artist knows what the message is about. Without a call to action the cards carry no button."
              >
                <Services services={commissions.services} cta={commissions.cta} headingLevel={SPECIMEN_HEADING} />
              </Specimen>

              <Specimen
                title="ClientLogos"
                source="raisonne/commissions/client-logos"
                span="full"
                stageClassName="block"
                note="A logo where there is one, the name set as text where there is not, so the wall has no holes. Vector logos are served as they are, because next/image does not optimize them."
              >
                <ClientLogos clients={commissions.clients} />
              </Specimen>
            </>
          ) : (
            <Specimen title="Commissions" source="raisonne/commissions" span={2} note="This install has no commissions page.">
              <p className="text-sm text-muted-foreground">
                Nothing to show: the commissions module is off, or the page has not been written.
              </p>
            </Specimen>
          )}

          {data.collaborations.length > 0 ? (
            <Specimen
              title="FeaturedCollaborations"
              source="raisonne/commissions/featured-collaborations"
              span="full"
              stageClassName="block"
              note="The projects the artist leads with, in the same tile the rest of the catalogue uses."
            >
              <FeaturedCollaborations collaborations={data.collaborations.slice(0, 4)} />
            </Specimen>
          ) : null}

          <Specimen title="Commissions, loading" source="CommissionsHeroSkeleton" span="full" stageClassName="block">
            <div className="flex w-full flex-col gap-8">
              <CommissionsHeroSkeleton />
              <ServicesSkeleton count={2} />
              <ClientLogosSkeleton count={4} />
            </div>
          </Specimen>
        </SpecimenGrid>
      </Section>
    </div>
  );
}
