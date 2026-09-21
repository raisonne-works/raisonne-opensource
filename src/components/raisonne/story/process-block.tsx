import type { HeadingLevel } from '@/components/raisonne/shell/heading';
import { nextHeadingLevel } from '@/components/raisonne/shell/heading';
import { RichTextView } from '@/components/raisonne/shell/rich-text';
import type { StoryBlock } from '@/lib/types';
import { cn } from '@/lib/utils';

import { AssetFigure } from './asset';

export type ProcessStoryBlock = Extract<StoryBlock, { type: 'process' }>;

/**
 * How a body of work was made, step by step, with one image or video beside
 * the steps. The steps are an ordered list, numbered in the markup rather
 * than typed into the titles, so the order survives being read aloud.
 *
 * From xl the picture sits beside the steps and stays in view while they
 * scroll; below that it leads, because a phone reads one column.
 */
export function ProcessBlock({
  block,
  headingLevel = 2,
  className,
}: {
  block: ProcessStoryBlock;
  headingLevel?: HeadingLevel;
  className?: string;
}) {
  const Heading = `h${headingLevel}` as const;
  const StepHeading = `h${nextHeadingLevel(headingLevel)}` as const;
  if (block.steps.length === 0) return null;

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {block.title ? (
        <Heading className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">{block.title}</Heading>
      ) : null}

      <div className={cn('grid gap-8', block.asset ? 'xl:grid-cols-2 xl:items-start xl:gap-12' : null)}>
        {block.asset ? (
          <AssetFigure
            asset={block.asset}
            sizes="(min-width: 1280px) 48vw, 100vw"
            className="xl:sticky xl:top-20"
            frameClassName="max-h-[70svh]"
          />
        ) : null}

        <ol className="flex min-w-0 flex-col gap-6">
          {block.steps.map((step, index) => (
            <li key={`${step.title}-${index}`} className="flex min-w-0 gap-4">
              <span
                aria-hidden
                className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium tabular-nums text-muted-foreground"
              >
                {index + 1}
              </span>
              <div className="flex min-w-0 flex-col gap-2">
                <StepHeading className="text-base font-semibold tracking-tight">{step.title}</StepHeading>
                <RichTextView value={step.body} headingLevel={nextHeadingLevel(nextHeadingLevel(headingLevel))} />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
