import type { HeadingLevel } from '@/components/raisonne/shell/heading';
import { nextHeadingLevel } from '@/components/raisonne/shell/heading';
import { READING_CLASS } from '@/components/raisonne/shell/measure';
import { RichTextView } from '@/components/raisonne/shell/rich-text';
import type { RichText } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * The curatorial text on a record: an exhibition's statement, a
 * collaboration's account of the project. It is rich text rather than a
 * story block, because it belongs to the record itself and comes before
 * whatever documentation follows.
 */
export function AboutSection({
  title,
  body,
  headingLevel = 2,
  className,
}: {
  title?: string | null;
  body: RichText | null | undefined;
  headingLevel?: HeadingLevel;
  className?: string;
}) {
  if (!body || body.length === 0) return null;
  const Heading = `h${headingLevel}` as const;

  return (
    <section className={cn('flex flex-col gap-4', className)}>
      {title ? (
        <Heading className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">{title}</Heading>
      ) : null}
      <RichTextView value={body} headingLevel={nextHeadingLevel(headingLevel)} className={READING_CLASS} />
    </section>
  );
}
