import Link from 'next/link';

import { formatPressDate } from '@/components/raisonne/profile/format';
import type { HeadingLevel } from '@/components/raisonne/shell/heading';
import { Badge } from '@/components/ui/badge';
import type { PressItem, StoryBlock } from '@/lib/types';
import { cn } from '@/lib/utils';

export type PressStoryBlock = Extract<StoryBlock, { type: 'press' }>;

/** Where a press item is read: on this site when the text is kept here, otherwise at the source. */
export function pressHref(item: PressItem): string | null {
  if (item.slug) return `/press/${encodeURIComponent(item.slug)}`;
  return item.url;
}

const KIND_LABEL: Record<NonNullable<PressItem['kind']>, string> = {
  article: 'Article',
  video: 'Video',
  podcast: 'Podcast',
};

/**
 * What has been written about this record. Each row goes to the piece on
 * this site when the text is kept here, and out to the publication when it
 * is not, so a dead link outside is not the only way to read it.
 */
export function PressBlock({
  block,
  items,
  headingLevel = 2,
  className,
}: {
  block: PressStoryBlock;
  /** The press items the block names, already looked up. */
  items: PressItem[];
  headingLevel?: HeadingLevel;
  className?: string;
}) {
  const Heading = `h${headingLevel}` as const;
  if (items.length === 0) return null;

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <Heading className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">
        {block.title ?? 'Press'}
      </Heading>
      <PressLinkList items={items} />
    </div>
  );
}

/** Press as rows: the headline, the outlet and the date, each row one link. */
export function PressLinkList({ items, className }: { items: PressItem[]; className?: string }) {
  return (
    <ol className={cn('divide-y divide-border border-y border-border', className)}>
      {items.map(item => {
        const href = pressHref(item);
        const date = formatPressDate(item);
        const external = Boolean(href && /^https?:\/\//i.test(href));
        const label = (
          <>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="leading-6 font-medium text-pretty underline-offset-4 group-hover/press:underline">
                {item.title}
              </span>
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                {item.outlet}
                {item.kind && item.kind !== 'article' ? (
                  <Badge variant="outline" className="font-normal">
                    {KIND_LABEL[item.kind]}
                  </Badge>
                ) : null}
              </span>
            </span>
            {date ? (
              <time
                dateTime={date.dateTime}
                className="font-mono text-sm leading-6 whitespace-nowrap text-muted-foreground tabular-nums"
              >
                {date.label}
              </time>
            ) : (
              <span aria-hidden />
            )}
          </>
        );

        const rowClass = 'grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 py-3';

        return (
          <li key={item.id} className="min-w-0">
            {href ? (
              external ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(rowClass, 'group/press rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50')}
                >
                  {label}
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              ) : (
                <Link
                  href={href}
                  className={cn(rowClass, 'group/press rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50')}
                >
                  {label}
                </Link>
              )
            ) : (
              <div className={rowClass}>{label}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
