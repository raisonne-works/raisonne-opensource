import Link from 'next/link';
import { DownloadIcon, MicIcon, PlayIcon } from 'lucide-react';

import { ExternalLink } from '@/components/raisonne/profile/external-link';
import { formatPressDate, sortPress } from '@/components/raisonne/profile/format';
import { plural } from '@/components/raisonne/works/lib';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { recordHref } from '@/lib/records';
import type { Artist, PressItem } from '@/lib/types';
import { cn } from '@/lib/utils';

import { CatalogueCard } from './catalogue-card';
import { pressEntry } from './entry';
import { EMPTY_BLOCK_CLASS } from '@/components/raisonne/shell/measure';

/**
 * The press index, in the four blocks a press page needs: the pieces the
 * artist leads with, the interviews on video, the podcasts, and the full
 * table of mentions.
 *
 * Nothing plays here. A video or a podcast opens on its own page, where the
 * player loads only when the visitor asks for it, or at the outlet when the
 * catalogue keeps no copy of the piece.
 */

/** Where one item goes: its page on this site, or the original. */
function pressHref(item: PressItem): { href: string | null; external: boolean } {
  const own = item.slug ? recordHref({ type: 'press', key: item.slug }) : null;
  if (own) return { href: own, external: false };
  return { href: item.url, external: Boolean(item.url) };
}

export function PressFeatured({
  press,
  limit = 3,
  className,
}: {
  press: PressItem[];
  limit?: number;
  className?: string;
}) {
  const featured = sortPress(press.filter(item => item.featured)).slice(0, limit);
  if (featured.length === 0) return null;

  return (
    <ul className={cn('grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {featured.map((item, index) => (
        <li key={item.id} className="min-w-0">
          <CatalogueCard
            entry={pressEntry(item)}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            priority={index === 0}
          />
        </li>
      ))}
    </ul>
  );
}

/** Interviews and features on video. */
export function PressVideos({ press, className }: { press: PressItem[]; className?: string }) {
  const videos = sortPress(press.filter(item => item.kind === 'video'));
  if (videos.length === 0) return null;

  return (
    <ul className={cn('grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3', className)}>
      {videos.map(item => (
        <li key={item.id} className="min-w-0">
          <CatalogueCard entry={pressEntry(item)} sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw" />
        </li>
      ))}
    </ul>
  );
}

/** Podcast appearances, as a list: an episode is a thing to listen to, not to look at. */
export function PressPodcasts({ press, className }: { press: PressItem[]; className?: string }) {
  const podcasts = sortPress(press.filter(item => item.kind === 'podcast'));
  if (podcasts.length === 0) return null;

  return (
    <ol className={cn('divide-y divide-border border-y border-border', className)}>
      {podcasts.map(item => {
        const { href, external } = pressHref(item);
        const date = formatPressDate(item);
        return (
          <li key={item.id} className="flex items-start gap-3 py-3">
            <MicIcon aria-hidden className="mt-1 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="leading-6 font-medium text-pretty">
                {href ? (
                  external ? (
                    <ExternalLink href={href}>{item.title}</ExternalLink>
                  ) : (
                    <Link
                      href={href}
                      className="rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      {item.title}
                    </Link>
                  )
                ) : (
                  item.title
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                {[item.outlet, item.minutes ? `${item.minutes} min` : null].filter(Boolean).join(' · ')}
              </p>
            </div>
            {date ? (
              <time dateTime={date.dateTime} className="font-mono text-sm whitespace-nowrap text-muted-foreground">
                {date.label}
              </time>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/** Every mention: publication, headline, date, and what kind of piece it is. */
export function PressTable({ press, className }: { press: PressItem[]; className?: string }) {
  if (press.length === 0) {
    return (
      <Empty className={cn(EMPTY_BLOCK_CLASS, className)}>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <PlayIcon />
          </EmptyMedia>
          <EmptyTitle>No press yet</EmptyTitle>
          <EmptyDescription>
            Reviews, interviews, features and podcast appearances appear here once they are added.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const items = sortPress(press);

  return (
    <Table className={className}>
      <caption className="sr-only">{plural(items.length, 'press item')}, newest first</caption>
      <TableHeader>
        <TableRow>
          <TableHead className="hidden sm:table-cell">Publication</TableHead>
          <TableHead>Title</TableHead>
          <TableHead className="hidden md:table-cell">Kind</TableHead>
          <TableHead className="w-28 text-right">Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map(item => {
          const { href, external } = pressHref(item);
          const date = formatPressDate(item);
          return (
            <TableRow key={item.id}>
              <TableCell className="hidden max-w-[20ch] truncate text-muted-foreground sm:table-cell">
                {item.outlet}
              </TableCell>
              <TableCell className="max-w-[40ch] font-medium">
                <span className="block truncate">
                  {href ? (
                    external ? (
                      <ExternalLink href={href}>{item.title}</ExternalLink>
                    ) : (
                      <Link
                        href={href}
                        className="rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        {item.title}
                      </Link>
                    )
                  ) : (
                    item.title
                  )}
                </span>
                <span className="block truncate text-xs text-muted-foreground sm:hidden">{item.outlet}</span>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Badge variant="outline" className="font-normal">
                  {item.category ?? kindLabel(item)}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {date ? (
                  <time dateTime={date.dateTime} className="font-mono text-xs whitespace-nowrap text-muted-foreground">
                    {date.label}
                  </time>
                ) : null}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function kindLabel(item: PressItem): string {
  switch (item.kind) {
    case 'video':
      return 'Video';
    case 'podcast':
      return 'Podcast';
    default:
      return 'Article';
  }
}

/**
 * The press kit, when the artist publishes one: a title, a line about what
 * is in it and the file itself.
 */
export function PressKit({ artist, className }: { artist: Artist; className?: string }) {
  const kit = artist.pressKit;
  if (!kit?.fileUrl) return null;

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4', className)}>
      <div className="min-w-0">
        <p className="font-medium">{kit.title ?? 'Press kit'}</p>
        <p className="text-sm text-muted-foreground">
          Biography, portrait and images, ready to publish.
        </p>
      </div>
      <Button
        variant="outline"
        nativeButton={false}
        render={<a href={kit.fileUrl} download target="_blank" rel="noopener noreferrer" />}
      >
        <DownloadIcon aria-hidden data-icon="inline-start" />
        Download the press kit
        <span className="sr-only"> (opens in a new tab)</span>
      </Button>
    </div>
  );
}
