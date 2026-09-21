import { ArrowUpRightIcon, FileTextIcon } from 'lucide-react';

import { FactsTable } from '@/components/raisonne/shell/facts';
import type { HeadingLevel } from '@/components/raisonne/shell/heading';
import { nextHeadingLevel } from '@/components/raisonne/shell/heading';
import { READING_CLASS } from '@/components/raisonne/shell/measure';
import { RichTextView } from '@/components/raisonne/shell/rich-text';
import { formatDate } from '@/components/raisonne/works/lib';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Writing } from '@/lib/types';
import { cn } from '@/lib/utils';

import { writingFacts } from './facts';

/**
 * A paper or an essay read on the site: who wrote it, where it appeared, the
 * abstract set apart from the body, the text itself and what it cites.
 *
 * The column is capped at a reading measure at every width, because this is
 * the one page on the site that is only words.
 */
export function WritingArticle({
  writing,
  headingLevel = 1,
  className,
}: {
  writing: Writing;
  headingLevel?: HeadingLevel;
  className?: string;
}) {
  const Heading = `h${headingLevel}` as const;
  const SubHeading = `h${nextHeadingLevel(headingLevel)}` as const;
  const bodyLevel = nextHeadingLevel(headingLevel);
  const published = formatDate(writing.publishedAt);
  const facts = writingFacts(writing);

  return (
    <article className={cn('flex flex-col gap-8', className)}>
      <header className="flex max-w-[52rem] flex-col gap-3">
        <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
          <FileTextIcon aria-hidden className="size-4" />
          {writing.category ?? 'Writing'}
          {published ? (
            <>
              <span aria-hidden>·</span>
              <time dateTime={writing.publishedAt ?? undefined}>{published}</time>
            </>
          ) : null}
        </p>
        <Heading className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{writing.title}</Heading>
        {writing.subtitle ? <p className="text-lg text-pretty text-muted-foreground">{writing.subtitle}</p> : null}
        {writing.authors.length > 0 ? <p className="text-base">{writing.authors.join(', ')}</p> : null}

        {writing.pdfUrl || writing.originalUrl ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {writing.pdfUrl ? (
              <Button
                variant="outline"
                nativeButton={false}
                render={<a href={writing.pdfUrl} target="_blank" rel="noopener noreferrer" />}
              >
                Download the PDF
                <ArrowUpRightIcon aria-hidden data-icon="inline-end" />
                <span className="sr-only">(opens in a new tab)</span>
              </Button>
            ) : null}
            {writing.originalUrl ? (
              <Button
                variant="outline"
                nativeButton={false}
                render={<a href={writing.originalUrl} target="_blank" rel="noopener noreferrer" />}
              >
                Read it at the publisher
                <ArrowUpRightIcon aria-hidden data-icon="inline-end" />
                <span className="sr-only">(opens in a new tab)</span>
              </Button>
            ) : null}
          </div>
        ) : null}
      </header>

      {writing.abstract && writing.abstract.length > 0 ? (
        <section className={cn('flex flex-col gap-2 border-l-2 border-border pl-4', READING_CLASS)}>
          <SubHeading className="text-sm font-medium">Abstract</SubHeading>
          <RichTextView value={writing.abstract} headingLevel={bodyLevel} />
        </section>
      ) : null}

      {writing.body && writing.body.length > 0 ? (
        <RichTextView value={writing.body} headingLevel={bodyLevel} className={READING_CLASS} />
      ) : null}

      {writing.references.length > 0 ? (
        <section className={cn('flex flex-col gap-3', READING_CLASS)}>
          <SubHeading className="text-sm font-medium">References</SubHeading>
          <ol className="flex list-outside list-decimal flex-col gap-2 pl-5 text-sm/relaxed text-muted-foreground">
            {writing.references.map((reference, index) => (
              <li key={index} className="pl-1 text-pretty">
                {reference}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {facts.length > 0 ? (
        <section className={cn('flex flex-col gap-3', READING_CLASS)}>
          <SubHeading className="text-sm font-medium">Details</SubHeading>
          <FactsTable facts={facts} />
        </section>
      ) : null}
    </article>
  );
}

export function WritingArticleSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-8', className)} role="status" aria-label="Loading the text">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className={cn('h-4 w-full', index % 4 === 3 && 'w-2/3')} />
        ))}
      </div>
    </div>
  );
}
