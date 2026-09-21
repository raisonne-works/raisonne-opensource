import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';

import { READING_LEAD_CLASS } from '@/components/raisonne/shell/measure';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Artist } from '@/lib/types';
import { cn } from '@/lib/utils';

import { joinParts, statementExcerpt } from './format';

/**
 * The top of the artist's home page: portrait, name, what they do and where,
 * the opening of their statement and their links. Text only, capped at
 * reading width, so the work beside and below it carries the page.
 *
 * It is deliberately short on phones: the statement is clamped to two lines
 * behind "Read the full statement", and the links move to the footer, so an
 * artwork is on screen without scrolling.
 */
export function ArtistHero({
  artist,
  statementHref = '/cv#statement',
  headingLevel = 1,
  className,
}: {
  artist: Artist;
  /** Where "Read the full statement" goes when the excerpt is shorter than the statement. */
  statementHref?: string;
  /** 1 on the home page; deeper where the hero is shown inside another page. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
}) {
  const Heading = `h${headingLevel}` as const;
  const subline = joinParts([artist.tagline, artist.location], ' · ');
  const excerpt = artist.statement ? statementExcerpt(artist.statement) : null;

  return (
    <section
      data-slot="artist-hero"
      className={cn('flex max-w-[72ch] flex-col items-start gap-4 sm:gap-6', className)}
    >
      {artist.portrait ? (
        <Avatar className="size-14 sm:size-20">
          <Image
            src={artist.portrait}
            alt={`Portrait of ${artist.name}`}
            fill
            sizes="80px"
            className="rounded-full object-cover"
          />
        </Avatar>
      ) : null}

      <div className="flex flex-col gap-2">
        <Heading className="text-3xl font-semibold tracking-tight text-balance sm:text-5xl 3xl:text-6xl">
          {artist.name}
        </Heading>
        {subline ? <p className="text-base text-pretty text-muted-foreground sm:text-xl">{subline}</p> : null}
      </div>

      {excerpt?.text ? (
        <div className="flex flex-col items-start gap-2">
          <p className={cn('line-clamp-2 text-base/7 text-pretty sm:line-clamp-none sm:text-lg/8', READING_LEAD_CLASS)}>
            {excerpt.text}
          </p>
          {/* On phones the clamp always hides something, so the way to the rest is always there. */}
          <Button
            variant="link"
            className={cn('h-auto px-0 has-data-[icon=inline-end]:pr-0', excerpt.truncated ? '' : 'sm:hidden')}
            nativeButton={false}
            render={<Link href={statementHref} />}
          >
            Read the full statement
            <ArrowRight aria-hidden data-icon="inline-end" />
          </Button>
        </div>
      ) : null}

      {artist.links.length > 0 ? (
        // Below sm the same links are in the footer, so the art comes first here.
        <ul aria-label={`${artist.name} elsewhere`} className="hidden flex-wrap gap-2 sm:flex">
          {artist.links.map(link => (
            <li key={link.href}>
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<a href={link.href} target="_blank" rel="noopener noreferrer" />}
              >
                {link.label}
                <ArrowUpRight aria-hidden data-icon="inline-end" />
                <span className="sr-only"> (opens in a new tab)</span>
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export function ArtistHeroSkeleton({ className }: { className?: string }) {
  return (
    <div role="status" className={cn('flex max-w-[72ch] flex-col gap-6', className)}>
      <span className="sr-only">Loading the artist</span>
      <div aria-hidden className="flex flex-col gap-6">
        <Skeleton className="size-16 rounded-full sm:size-20" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-10 w-72 max-w-full sm:h-12" />
          <Skeleton className="h-6 w-56 max-w-full" />
        </div>
        <div className="flex flex-col gap-2.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-7 w-24" />
        </div>
      </div>
    </div>
  );
}
