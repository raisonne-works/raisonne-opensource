import Image from 'next/image';
import { ArrowUpRightIcon } from 'lucide-react';

import type { HeadingLevel } from '@/components/raisonne/shell/heading';
import { Badge } from '@/components/ui/badge';
import type { StoryBlock } from '@/lib/types';
import { cn } from '@/lib/utils';

export type ChapterStoryBlock = Extract<StoryBlock, { type: 'chapter' }>;

/**
 * A title section that separates one part of a long page from the next. The
 * background is a picture, so the text sits on a scrim dark enough to read
 * against any image rather than on a colour picked per record.
 *
 * Without a background it is a quiet panel, which is what a chapter is when
 * the artist has not given it an image.
 */
export function ChapterBlock({
  block,
  headingLevel = 2,
  className,
}: {
  block: ChapterStoryBlock;
  headingLevel?: HeadingLevel;
  className?: string;
}) {
  const Heading = `h${headingLevel}` as const;
  const background = block.background;

  return (
    <section
      className={cn(
        'relative isolate flex min-h-64 flex-col justify-end overflow-hidden rounded-xl p-6 sm:min-h-80 sm:p-10',
        background ? 'border' : 'border bg-muted/40',
        className,
      )}
    >
      {background ? (
        <>
          <Image
            src={background.kind === 'video' ? (background.poster ?? background.src) : background.src}
            alt=""
            fill
            sizes="(min-width: 2976px) 2880px, 100vw"
            className="-z-20 object-cover"
          />
          {/* A scrim in the theme's own background colour, so the text reads in light and in dark. */}
          <div aria-hidden className="absolute inset-0 -z-10 bg-background/80" />
        </>
      ) : null}

      <div className="flex max-w-[48rem] flex-col gap-3">
        <Heading className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{block.title}</Heading>
        {block.text ? (
          <p className="text-base/relaxed text-pretty text-muted-foreground">{block.text}</p>
        ) : null}
        {block.labels.length > 0 ? (
          <ul className="flex flex-wrap gap-2 pt-1">
            {block.labels.map(label => (
              <li key={`${label.label}-${label.href}`}>
                {label.href && label.href !== '#' ? (
                  <Badge
                    variant="outline"
                    className="bg-background font-normal"
                    render={<a href={label.href} target="_blank" rel="noopener noreferrer" />}
                  >
                    {label.label}
                    <ArrowUpRightIcon aria-hidden data-icon="inline-end" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-background font-normal">
                    {label.label}
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
