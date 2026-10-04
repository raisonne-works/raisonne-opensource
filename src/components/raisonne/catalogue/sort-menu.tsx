import Link from 'next/link';
import { ArrowDownUpIcon, CheckIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { SORTS, catalogueHref, type CatalogueConfig, type CatalogueState } from './lib';

/**
 * The order of the list. Every option is a link, so a chosen order is part
 * of the URL and can be shared, opened in a new tab and crawled. Featured
 * records lead every order, which is why the default is named for them.
 */
export function SortMenu({
  state,
  config,
  className,
}: {
  state: CatalogueState;
  config: CatalogueConfig;
  className?: string;
}) {
  const current = SORTS.find(sort => sort.id === state.sort) ?? SORTS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="sm" className={className} data-control="sort" aria-label={`Sort: ${current.label}`} />}
      >
        <ArrowDownUpIcon aria-hidden data-icon="inline-start" />
        {/* The label stays: a bare pair of arrows is not a word anyone reads. */}
        <span>{current.label}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-44" data-catalogue-sort={config.basePath}>
        {/* Base UI needs a group label inside a group: on its own it threw and took the list down. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>Sort</DropdownMenuLabel>
          {SORTS.map(sort => {
            const selected = sort.id === state.sort;
            return (
              <DropdownMenuItem
                key={sort.id}
                render={
                  <Link
                    href={catalogueHref(config, state, { sort: sort.id })}
                    scroll={false}
                    aria-current={selected ? 'true' : undefined}
                  />
                }
              >
                <CheckIcon aria-hidden className={selected ? undefined : 'invisible'} />
                {sort.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
