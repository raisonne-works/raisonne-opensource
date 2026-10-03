'use client';

import { ArrowUpRightIcon, ChevronDownIcon } from 'lucide-react';
import { Fragment } from 'react';

import type { HeadingLevel } from '@/components/raisonne/shell/heading';
import { nextHeadingLevel } from '@/components/raisonne/shell/heading';
import { READING_CLASS } from '@/components/raisonne/shell/measure';
import { RichTextView } from '@/components/raisonne/shell/rich-text';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { StoryBlock } from '@/lib/types';
import { cn } from '@/lib/utils';

export type TextStoryBlock = Extract<StoryBlock, { type: 'text' }>;

/**
 * The block most pages open with: a title, the text itself in one to four
 * columns, and an optional longer passage behind "read more".
 *
 * One column is capped at a readable measure; more columns widen the block
 * and each column keeps that measure, so the text never runs the full width
 * of a 2560 px screen as one line. Paragraphs are kept whole rather than
 * split across a column break.
 *
 * Everything but the longer passage is in the markup from the start, so the
 * block reads without JavaScript.
 */
export function TextBlock({
  block,
  headingLevel = 2,
  className,
}: {
  block: TextStoryBlock;
  headingLevel?: HeadingLevel;
  className?: string;
}) {
  const Heading = `h${headingLevel}` as const;
  const paragraphs = (block.body ?? '').split(/\n{2,}/).filter(part => part.trim().length > 0);
  const hasMore = Boolean(block.more && block.more.length > 0);

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {block.title ? (
        <Heading className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">{block.title}</Heading>
      ) : null}

      {paragraphs.length > 0 ? (
        // Block layout, not flex: CSS columns do nothing inside a flex container.
        <div data-slot="text-body" data-columns={block.columns} className={cn('text-base/relaxed text-pretty [&>p+p]:mt-4', COLUMN_CLASS[block.columns])}>
          {paragraphs.map((paragraph, index) => (
            <p key={index} className="break-inside-avoid-column">
              {/* A line break inside a paragraph reads as a space here. Each
                  line is marked so a pack can stand them apart instead. */}
              {paragraph.includes('\n')
                ? paragraph.split('\n').map((line, at) => (
                    <Fragment key={at}>
                      {at > 0 ? '\n' : null}
                      <span data-slot="text-line">{line}</span>
                    </Fragment>
                  ))
                : paragraph}
            </p>
          ))}
        </div>
      ) : null}

      {hasMore ? (
        <Collapsible className="flex flex-col gap-3">
          <CollapsibleTrigger className="group/more self-start" render={<Button variant="outline" size="sm" />}>
            <span className="group-data-[panel-open]/more:hidden">{block.moreTitle ?? 'Read more'}</span>
            <span className="hidden group-data-[panel-open]/more:inline">Show less</span>
            <ChevronDownIcon
              aria-hidden
              data-icon="inline-end"
              className="transition-transform group-data-[panel-open]/more:rotate-180"
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <RichTextView
              value={block.more}
              headingLevel={nextHeadingLevel(headingLevel)}
              className={cn('pt-1', READING_CLASS)}
            />
          </CollapsibleContent>
        </Collapsible>
      ) : null}

      {block.cta ? (
        <p>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<a href={block.cta.href} target="_blank" rel="noopener noreferrer" />}
          >
            {block.cta.label}
            <ArrowUpRightIcon aria-hidden data-icon="inline-end" />
            <span className="sr-only">(opens in a new tab)</span>
          </Button>
        </p>
      ) : null}
    </div>
  );
}

/**
 * Columns are a maximum, not a promise: a phone always reads one column, and
 * the extra ones appear only once the screen can give each of them a real
 * measure.
 *
 * A second column used to arrive at md, where it left two columns of about
 * 45 characters each and sent the reader's eye back up the page twice as
 * often for no gain. Each step now waits for the width that makes it a
 * reading column rather than a newspaper column: two at xl, three at 3xl,
 * four at 4xl.
 */
const COLUMN_CLASS: Record<1 | 2 | 3 | 4, string> = {
  1: READING_CLASS,
  2: 'max-w-[76rem] xl:columns-2 xl:gap-12',
  3: 'max-w-[110rem] xl:columns-2 xl:gap-12 3xl:columns-3',
  4: 'xl:columns-2 xl:gap-12 3xl:columns-3 4xl:columns-4',
};
