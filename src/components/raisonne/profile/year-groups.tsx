import { Fragment } from 'react';

import { type HeadingLevel } from '@/components/raisonne/shell/heading';
import { cn } from '@/lib/utils';

import { type YearGroup } from './format';

/**
 * A year column beside the entries of that year, the layout the CV uses for
 * exhibitions, awards and press. Groups must already be sorted; renderItem
 * returns the <li> for one entry.
 */
export function YearGroups<T>({
  groups,
  renderItem,
  getKey,
  headingLevel = 3,
  className,
}: {
  groups: YearGroup<T>[];
  renderItem: (item: T) => React.ReactNode;
  getKey: (item: T) => string;
  /** The level of each year heading; one below the section around it. */
  headingLevel?: HeadingLevel;
  className?: string;
}) {
  const Heading = `h${headingLevel}` as const;
  return (
    <div className={cn('divide-y divide-border border-y border-border', className)}>
      {groups.map(group => (
        <div key={group.year} className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-4 sm:grid-cols-[4.5rem_minmax(0,1fr)]">
          <Heading className="pt-3 font-mono text-sm leading-6 text-muted-foreground tabular-nums">
            {group.year}
          </Heading>
          <ol className="min-w-0 divide-y divide-border">
            {group.items.map(item => (
              <Fragment key={getKey(item)}>{renderItem(item)}</Fragment>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}
