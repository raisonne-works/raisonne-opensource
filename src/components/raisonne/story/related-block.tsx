import type { HeadingLevel } from '@/components/raisonne/shell/heading';
import { nextHeadingLevel } from '@/components/raisonne/shell/heading';
import { READING_CLASS } from '@/components/raisonne/shell/measure';
import { RecordCardGrid } from '@/components/raisonne/records/record-card';
import type { RecordPreview } from '@/components/raisonne/records/preview';
import type { StoryBlock } from '@/lib/types';
import { cn } from '@/lib/utils';

export type RelatedStoryBlock = Extract<StoryBlock, { type: 'related' }>;

/**
 * The records this one points at: the works in a show, the chapters of a
 * series, the series a room was built from. The block's intro paragraphs
 * come first, then one tile per record that this install actually has.
 *
 * References are resolved before they get here, so a link never points at a
 * record the catalogue does not hold.
 */
export function RelatedBlock({
  block,
  previews,
  headingLevel = 2,
  className,
}: {
  block: RelatedStoryBlock;
  /** The resolved references, in the order the record lists them. */
  previews: RecordPreview[];
  headingLevel?: HeadingLevel;
  className?: string;
}) {
  const Heading = `h${headingLevel}` as const;
  const IntroHeading = `h${nextHeadingLevel(headingLevel)}` as const;
  if (previews.length === 0 && block.intro.length === 0) return null;

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {block.title ? (
        <Heading className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">{block.title}</Heading>
      ) : null}

      {block.intro.length > 0 ? (
        <div className={cn('flex flex-col gap-4', READING_CLASS)}>
          {block.intro.map((entry, index) => (
            <div key={index} className="flex flex-col gap-1">
              {entry.title ? (
                <IntroHeading className="text-base font-semibold tracking-tight">{entry.title}</IntroHeading>
              ) : null}
              <p className="text-base/relaxed text-pretty">{entry.text}</p>
            </div>
          ))}
        </div>
      ) : null}

      {previews.length > 0 ? <RecordCardGrid previews={previews} /> : null}
    </div>
  );
}
