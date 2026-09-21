import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { cn } from '@/lib/utils';

import { formatCount } from './lib';

/** The page numbers to show: the first, the last, and a window around the current one. */
function pageWindow(page: number, pages: number): (number | 'gap')[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, index) => index + 1);
  const around = [page - 1, page, page + 1].filter(value => value > 1 && value < pages);
  const shown = [1, ...around, pages];
  const out: (number | 'gap')[] = [];
  let previous = 0;
  for (const value of shown) {
    if (value - previous > 1) out.push('gap');
    out.push(value);
    previous = value;
  }
  return out;
}

/**
 * Every work in a long series is reachable: pages are links with their own
 * URL (?page=2), so a page can be shared, opened in a new tab and crawled.
 */
export function WorksPagination({
  page,
  pages,
  hrefFor,
  className,
}: {
  page: number;
  pages: number;
  /** The URL for a page number; page 1 keeps the plain series URL. */
  hrefFor: (page: number) => string;
  className?: string;
}) {
  if (pages <= 1) return null;

  return (
    <Pagination className={cn('justify-start', className)} aria-label="Works pages">
      <PaginationContent>
        <PaginationItem>
          {page > 1 ? (
            <PaginationPrevious href={hrefFor(page - 1)} />
          ) : (
            <PaginationPrevious aria-disabled className="pointer-events-none opacity-50" />
          )}
        </PaginationItem>
        {pageWindow(page, pages).map((value, index) =>
          value === 'gap' ? (
            <PaginationItem key={`gap-${index}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={value}>
              <PaginationLink
                isActive={value === page}
                aria-label={`Page ${formatCount(value)} of ${formatCount(pages)}`}
                href={hrefFor(value)}
              >
                {value}
              </PaginationLink>
            </PaginationItem>
          ),
        )}
        <PaginationItem>
          {page < pages ? (
            <PaginationNext href={hrefFor(page + 1)} />
          ) : (
            <PaginationNext aria-disabled className="pointer-events-none opacity-50" />
          )}
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
