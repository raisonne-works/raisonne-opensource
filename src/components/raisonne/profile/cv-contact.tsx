import { Skeleton } from '@/components/ui/skeleton';
import type { Artist } from '@/lib/types';
import { cn } from '@/lib/utils';

import { displayUrl, updatedLabel } from './format';

/**
 * The block at the top of a CV that says how to reach the person and when
 * the document was last true.
 *
 * It prints: on paper a CV without an address is not much use, so the links
 * are written out as text rather than hidden behind words.
 */
export function CvContact({
  artist,
  updatedAt,
  className,
}: {
  artist: Artist;
  /** ISO date from Cv.updatedAt; null hides the line. */
  updatedAt?: string | null;
  className?: string;
}) {
  const updated = updatedLabel(updatedAt);
  const links = artist.links.filter(link => link.kind !== 'marketplace');
  const hasContact = Boolean(artist.email || artist.location) || links.length > 0;
  if (!hasContact && !updated) return null;

  return (
    <div
      data-slot="cv-contact"
      className={cn('flex flex-col gap-1 text-sm text-muted-foreground print:text-xs', className)}
    >
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {artist.location ? <span>{artist.location}</span> : null}
        {artist.email ? (
          <a
            href={`mailto:${artist.email}`}
            className="rounded-sm underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {artist.email}
          </a>
        ) : null}
      </p>
      {links.length > 0 ? (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {links.map(link => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-sm underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {displayUrl(link.href)}
            </a>
          ))}
        </p>
      ) : null}
      {updated && updatedAt ? (
        <p>
          <time dateTime={updatedAt}>{updated}</time>
        </p>
      ) : null}
    </div>
  );
}

export function CvContactSkeleton({ className }: { className?: string }) {
  return (
    <div role="status" className={cn('flex flex-col gap-2', className)}>
      <span className="sr-only">Loading the contact details</span>
      <Skeleton aria-hidden className="h-4 w-64 max-w-full" />
      <Skeleton aria-hidden className="h-4 w-80 max-w-full" />
    </div>
  );
}
