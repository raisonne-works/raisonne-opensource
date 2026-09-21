import Link from 'next/link';
import { ArrowDownUpIcon, CheckIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

import { SHOP_PATH, SORTS, type Facet, type SortId, sortHref } from './lib';

/**
 * How a visitor narrows the shop: categories and collections as links, and
 * the order as a menu of links.
 *
 * Every one of them is a real URL, so a filtered shop can be shared, opened
 * in a new tab, bookmarked and crawled, and the page works with no
 * JavaScript at all. Categories and collections are pages of their own
 * rather than query parameters, because they carry the artist's own words
 * about what is in them.
 */
export function ShopFacets({
  categories,
  collections,
  active,
  path,
  sort,
  count,
  className,
}: {
  categories: Facet[];
  collections: Facet[];
  /** The href of the page being shown, so its own chip reads as current. */
  active?: string | null;
  /** The page the sort links stay on. */
  path: string;
  sort: SortId;
  /** How many products are on the page, named in the live region. */
  count: number;
  className?: string;
}) {
  const facets: Facet[] = [
    { slug: '', name: 'Everything', href: SHOP_PATH, count: 0 },
    ...categories,
    ...collections,
  ];
  const showFacets = categories.length + collections.length > 0;

  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      {showFacets ? (
        <nav aria-label="Shop sections" className="min-w-0">
          <ul className="flex flex-wrap items-center gap-1.5">
            {facets.map(facet => {
              const current = active ? facet.href === active : facet.href === SHOP_PATH;
              return (
                <li key={facet.href}>
                  <Button
                    variant={current ? 'secondary' : 'ghost'}
                    size="sm"
                    nativeButton={false}
                    render={<Link href={facet.href} aria-current={current ? 'page' : undefined} />}
                  >
                    {facet.name}
                    {facet.count > 0 ? (
                      <span className="text-xs tabular-nums text-muted-foreground">{facet.count}</span>
                    ) : null}
                  </Button>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : (
        <span />
      )}

      <div className="flex shrink-0 items-center gap-2">
        <p className="sr-only" aria-live="polite">
          {count === 1 ? 'Showing 1 product' : `Showing ${count} products`}
        </p>
        <ShopSortMenu path={path} sort={sort} />
      </div>
    </div>
  );
}

export function ShopSortMenu({ path, sort, className }: { path: string; sort: SortId; className?: string }) {
  const current = SORTS.find(entry => entry.id === sort) ?? SORTS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="sm" className={className} aria-label={`Sort: ${current.label}`} />}
      >
        <ArrowDownUpIcon aria-hidden="true" data-icon="inline-start" />
        <span>{current.label}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-48">
        <DropdownMenuLabel>Sort</DropdownMenuLabel>
        {SORTS.map(entry => {
          const selected = entry.id === sort;
          return (
            <DropdownMenuItem
              key={entry.id}
              render={
                <Link href={sortHref(path, entry.id)} scroll={false} aria-current={selected ? 'true' : undefined} />
              }
            >
              <CheckIcon aria-hidden="true" className={selected ? undefined : 'invisible'} />
              {entry.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
