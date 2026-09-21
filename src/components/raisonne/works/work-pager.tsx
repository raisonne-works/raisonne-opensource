import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

import type { Work } from '@/lib/types';
import { cn } from '@/lib/utils';

import { workHref, workTitle } from './lib';
import { MediaStill } from './media-still';

/** Previous and next work in the same series, with their stills, at the foot of a work page. */
export function WorkPager({
  previous,
  next,
  hrefFor = workHref,
  className,
}: {
  previous: Work | null;
  next: Work | null;
  hrefFor?: (work: Work) => string;
  className?: string;
}) {
  if (!previous && !next) return null;

  return (
    <nav aria-label="Other works in this series" className={cn('grid grid-cols-2 gap-4 pt-6', className)}>
      {previous ? <PagerLink work={previous} href={hrefFor(previous)} direction="previous" /> : <span />}
      {next ? <PagerLink work={next} href={hrefFor(next)} direction="next" /> : <span />}
    </nav>
  );
}

function PagerLink({ work, href, direction }: { work: Work; href: string; direction: 'previous' | 'next' }) {
  const isNext = direction === 'next';
  const Chevron = isNext ? ChevronRightIcon : ChevronLeftIcon;
  return (
    <Link
      href={href}
      rel={isNext ? 'next' : 'prev'}
      className={cn(
        'group/pager flex min-w-0 items-center gap-3 rounded-lg p-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        isNext && 'flex-row-reverse text-right',
      )}
    >
      <Chevron aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      <MediaStill media={work.media} alt="" sizes="56px" className="size-14 shrink-0 rounded-md" />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">{isNext ? 'Next' : 'Previous'}</span>
        {/* Two lines before anything is cut: "Visions #1" fits on a phone
            and was being truncated to "Visions #…" by a single-line clamp. */}
        <span
          className="line-clamp-2 text-sm font-medium break-words underline-offset-4 group-hover/pager:underline"
          title={work.title}
        >
          {workTitle(work)}
        </span>
      </span>
    </Link>
  );
}
