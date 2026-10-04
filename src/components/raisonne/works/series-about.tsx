import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRightIcon } from 'lucide-react';

import { type HeadingLevel, nextHeadingLevel } from '@/components/raisonne/shell/heading';
import { Section } from '@/components/raisonne/shell/page';
import { StoryBlocks } from '@/components/raisonne/story/story-blocks';
import { Button } from '@/components/ui/button';
import type { Series, StoryBlock } from '@/lib/types';

import { seriesTitle } from './lib';

/**
 * The essay behind a series, on the series page and on its own page.
 *
 * A chapter with no story of its own shows its parent's, and says so, so a
 * visitor who lands on a chapter still reads what the body of work is about.
 * The section has an id, so "About this series" is a link anyone can share.
 */
export function SeriesAbout({
  story,
  inheritedFrom = null,
  moreHref,
  specs,
  title = 'About this series',
  headingLevel = 2,
  id = 'about',
  className,
}: {
  story: StoryBlock[];
  /** The series the story was taken from, when this series has none of its own. */
  inheritedFrom?: Series | null;
  /** Where the whole essay lives, when this is the shortened version on a series page. */
  moreHref?: string;
  /** The series' facts (SeriesSpecs), kept out of sight beside the opening text for a pack to show. */
  specs?: ReactNode;
  /** null on a page whose own heading already names the series. */
  title?: string | null;
  headingLevel?: HeadingLevel;
  id?: string;
  className?: string;
}) {
  if (story.length === 0) return null;

  return (
    <Section
      id={id}
      headingLevel={headingLevel}
      title={title ?? undefined}
      description={
        inheritedFrom ? (
          <p>
            From the story of{' '}
            <Link
              href={`/works/${encodeURIComponent(inheritedFrom.slug)}`}
              className="underline underline-offset-4 hover:text-foreground"
            >
              {seriesTitle(inheritedFrom)}
            </Link>
            , the series this chapter belongs to.
          </p>
        ) : undefined
      }
      action={
        moreHref ? (
          <>
            {/* The way back up to the works, for a pack that opens this story as a sheet of its own. */}
            <a data-slot="series-about-back" href="#works" className="hidden">
              Back to artworks
            </a>
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href={moreHref} />}>
              Read it on its own page
              <ArrowRightIcon aria-hidden data-icon="inline-end" />
            </Button>
          </>
        ) : undefined
      }
      className={className}
    >
      <StoryBlocks blocks={story} tucked={specs} headingLevel={title ? nextHeadingLevel(headingLevel) : headingLevel} />
    </Section>
  );
}
