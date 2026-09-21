import type { Asset, SiteData, StoryBlock } from '@/lib/types';

/**
 * Real content for the design system, with a written sample where the
 * install has none.
 *
 * The rule for this page is that every specimen shows the site's own data
 * first: a block the artist actually uses is worth more than an invented
 * one. Only when a type is unused here does a sample stand in, and it is
 * marked as one.
 */

/** Every record that can carry story blocks, in the order the design system shows them. */
function storiedRecords(data: SiteData): { story: StoryBlock[] }[] {
  return [
    ...data.series.map(series => ({ story: series.story ?? [] })),
    ...data.installations,
    ...data.immersives,
    ...data.collaborations,
    ...data.exhibitions.map(exhibition => ({ story: exhibition.story ?? [] })),
    ...data.awards.map(award => ({ story: award.story ?? [] })),
    ...data.physicalWorks,
    ...data.writings,
    ...data.drops,
  ];
}

/** The first block of a type this install actually uses, or null. */
export function firstBlock<T extends StoryBlock['type']>(
  data: SiteData,
  type: T,
): Extract<StoryBlock, { type: T }> | null {
  for (const record of storiedRecords(data)) {
    for (const block of record.story) {
      if (block.type === type) return block as Extract<StoryBlock, { type: T }>;
    }
  }
  return null;
}

/** Any still the install holds, so a sample block has a real picture in it. */
export function anyImage(data: SiteData): Asset | null {
  const covers: (Asset | null)[] = [
    ...data.installations.map(record => record.cover),
    ...data.immersives.map(record => record.cover),
    ...data.collaborations.map(record => record.cover),
    ...data.exhibitions.map(record => record.cover ?? null),
    ...data.physicalWorks.map(record => record.cover),
    ...data.writings.map(record => record.cover),
    ...data.press.map(record => record.image ?? null),
  ];
  const asset = covers.find((entry): entry is Asset => Boolean(entry && entry.kind === 'image' && entry.src));
  if (asset) return asset;

  const still = data.works.find(work => work.media.still)?.media;
  if (still?.still) {
    return {
      kind: 'image',
      src: still.still,
      poster: null,
      alt: null,
      caption: null,
      width: still.width,
      height: still.height,
    };
  }
  return null;
}

/** Any video the install holds, for the film and walk-in room specimens. */
export function anyVideo(data: SiteData): Asset | null {
  for (const record of storiedRecords(data)) {
    for (const block of record.story) {
      if (block.type === 'film') return block.video;
      if (block.type === 'immersive') return block.video;
      if (block.type === 'media' && block.asset.kind === 'video') return block.asset;
    }
  }
  const fromRecord = [...data.installations, ...data.immersives, ...data.collaborations].flatMap(
    record => record.videos,
  );
  return fromRecord[0] ?? null;
}

export const SAMPLE_TEXT: Extract<StoryBlock, { type: 'text' }> = {
  type: 'text',
  id: 'sample-text',
  title: 'About this series',
  columns: 2,
  body: 'This is a sample text block. It carries the paragraph an artist writes about a body of work, set in one to four columns, with the longer version behind a control so the page opens short.\n\nA second paragraph stays whole rather than breaking across a column, because a broken paragraph is harder to read than a longer column.',
  moreTitle: 'Read the full note',
  more: [
    {
      type: 'paragraph',
      children: [
        { text: 'The longer text is rich text: ' },
        { text: 'bold', bold: true },
        { text: ', italic, links and lists all render through one component.' },
      ],
    },
    {
      type: 'list',
      ordered: false,
      items: [[{ text: 'A list item' }], [{ text: 'Another one' }]],
    },
  ],
  cta: { label: 'See the works', href: 'https://example.com', kind: 'site' },
};

export const SAMPLE_TEXT_TITLE_ONLY: Extract<StoryBlock, { type: 'text' }> = {
  type: 'text',
  id: 'sample-text-empty',
  title: 'A block with nothing written in it yet',
  columns: 1,
  body: null,
  moreTitle: null,
  more: null,
  cta: null,
};

export function sampleChapter(background: Asset | null): Extract<StoryBlock, { type: 'chapter' }> {
  return {
    type: 'chapter',
    id: 'sample-chapter',
    title: 'A chapter of a longer page',
    text: 'A chapter separates one part of a long record from the next. Without a picture behind it, it is a quiet panel.',
    background,
    labels: [
      { label: '2025', href: '#', kind: 'other' },
      { label: 'Four rooms', href: '#', kind: 'other' },
    ],
  };
}

export function sampleEmbed(poster: Asset | null): Extract<StoryBlock, { type: 'embed' }> {
  return {
    type: 'embed',
    id: 'sample-embed',
    provider: 'youtube',
    url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    title: 'A film published somewhere else',
    context:
      'Nothing is requested from the other site until the visitor presses play, so opening this page tells them nothing.',
    attribution: 'Sample attribution line',
    poster,
  };
}
