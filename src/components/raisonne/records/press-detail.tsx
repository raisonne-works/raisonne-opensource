import { ArrowUpRightIcon } from 'lucide-react';

import { FactsTable } from '@/components/raisonne/shell/facts';
import type { HeadingLevel } from '@/components/raisonne/shell/heading';
import { nextHeadingLevel } from '@/components/raisonne/shell/heading';
import { READING_CLASS } from '@/components/raisonne/shell/measure';
import { RichTextView } from '@/components/raisonne/shell/rich-text';
import { AssetFigure } from '@/components/raisonne/story/asset';
import { formatDate } from '@/components/raisonne/works/lib';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { PressItem } from '@/lib/types';
import { cn } from '@/lib/utils';

import { pressFacts } from './facts';
import { PressPlayer } from './press-player';

const KIND_LABEL: Record<NonNullable<PressItem['kind']>, string> = {
  article: 'Article',
  video: 'Video',
  podcast: 'Podcast',
};

/**
 * A piece of press on this site: the publication, the date, the author and
 * the piece itself. The full text is kept here on purpose, because news
 * sites move and delete their archives and a catalogue outlives them; the
 * original is always linked beside it.
 *
 * An interview or an episode shows its player instead of a text.
 */
export function PressDetail({
  item,
  headingLevel = 1,
  className,
}: {
  item: PressItem;
  headingLevel?: HeadingLevel;
  className?: string;
}) {
  const Heading = `h${headingLevel}` as const;
  const SubHeading = `h${nextHeadingLevel(headingLevel)}` as const;
  const kind = item.kind ?? 'article';
  const date = formatDate(item.date);
  const hasBody = Boolean(item.body && item.body.length > 0);
  const isPlayable = kind !== 'article';

  return (
    <article className={cn('flex flex-col gap-8', className)}>
      <header className="flex max-w-[52rem] flex-col gap-3">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{item.outlet}</span>
          {date ? (
            <>
              <span aria-hidden>·</span>
              <time dateTime={item.date ?? undefined}>{date}</time>
            </>
          ) : (
            <>
              <span aria-hidden>·</span>
              <span>{item.year}</span>
            </>
          )}
          {item.minutes ? (
            <>
              <span aria-hidden>·</span>
              <span>{item.minutes} min</span>
            </>
          ) : null}
        </p>

        <Heading className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{item.title}</Heading>

        {item.description ? <p className="text-lg text-pretty text-muted-foreground">{item.description}</p> : null}

        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <Badge variant="secondary">{KIND_LABEL[kind]}</Badge>
          {item.category ? (
            <Badge variant="outline" className="font-normal">
              {item.category}
            </Badge>
          ) : null}
          {item.author ? <span className="text-sm text-muted-foreground">By {item.author}</span> : null}
        </div>
      </header>

      {isPlayable ? (
        <PressPlayer item={item} />
      ) : item.image ? (
        <AssetFigure
          asset={item.image}
          sizes="(min-width: 2976px) 2880px, 100vw"
          alt={item.image.alt ?? ''}
          priority
          plate
          frameClassName="max-h-[70svh]"
        />
      ) : null}

      {hasBody ? (
        <RichTextView value={item.body} headingLevel={nextHeadingLevel(headingLevel)} className={READING_CLASS} />
      ) : (
        <Alert className={READING_CLASS}>
          <AlertTitle>The text is not kept on this site</AlertTitle>
          <AlertDescription>
            {item.url
              ? 'This entry records the piece; the publication holds the text itself.'
              : 'This entry records the piece. No link to it was kept.'}
          </AlertDescription>
        </Alert>
      )}

      {item.url ? (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<a href={item.url} target="_blank" rel="noopener noreferrer" />}
          >
            Read the original
            <ArrowUpRightIcon aria-hidden data-icon="inline-end" />
            <span className="sr-only">(opens in a new tab)</span>
          </Button>
        </div>
      ) : null}

      {item.tags && item.tags.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {item.tags.map(tag => (
            <li key={tag}>
              <Badge variant="outline" className="font-normal">
                {tag}
              </Badge>
            </li>
          ))}
        </ul>
      ) : null}

      <section className={cn('flex flex-col gap-3', READING_CLASS)}>
        <SubHeading className="text-sm font-medium">Details</SubHeading>
        <FactsTable facts={pressFacts(item)} />
      </section>
    </article>
  );
}

export function PressDetailSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-8', className)} role="status" aria-label="Loading the piece">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-5 w-1/2" />
      </div>
      <Skeleton className="aspect-video w-full rounded-lg" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className={cn('h-4 w-full', index % 3 === 2 && 'w-2/3')} />
        ))}
      </div>
    </div>
  );
}
