'use client';

import { useMemo, useState } from 'react';

import { type HeadingLevel } from '@/components/raisonne/shell/heading';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { Exhibition, ExhibitionKind } from '@/lib/types';
import { cn } from '@/lib/utils';

import { ExhibitionListEmpty, ExhibitionRow } from './exhibition-list';
import { EXHIBITION_KIND_LABEL, EXHIBITION_KIND_ORDER, groupByYear, sortByYearDesc } from './format';
import { YearGroups } from './year-groups';

type KindFilter = ExhibitionKind | 'all';

function isKindFilter(value: unknown): value is KindFilter {
  return value === 'all' || EXHIBITION_KIND_ORDER.includes(value as ExhibitionKind);
}

/**
 * Every exhibition, grouped by year, with a filter by kind (solo, group,
 * biennale...). The filter hides itself in print and when there is only one
 * kind; the list prints as it is filtered on screen.
 */
export function ExhibitionTimeline({
  exhibitions,
  headingLevel = 3,
  className,
}: {
  exhibitions: Exhibition[];
  /** The level of each year heading. */
  headingLevel?: HeadingLevel;
  className?: string;
}) {
  const [filter, setFilter] = useState<KindFilter>('all');

  const sorted = useMemo(() => sortByYearDesc(exhibitions), [exhibitions]);
  const counts = useMemo(() => {
    const byKind = new Map<ExhibitionKind, number>();
    for (const exhibition of exhibitions) byKind.set(exhibition.kind, (byKind.get(exhibition.kind) ?? 0) + 1);
    return byKind;
  }, [exhibitions]);
  const kinds = EXHIBITION_KIND_ORDER.filter(kind => counts.has(kind));

  if (exhibitions.length === 0) return <ExhibitionListEmpty className={className} />;

  const active: KindFilter = filter !== 'all' && counts.has(filter) ? filter : 'all';
  const visible = active === 'all' ? sorted : sorted.filter(exhibition => exhibition.kind === active);
  const status =
    active === 'all'
      ? `Showing all ${visible.length} exhibitions`
      : `Showing ${visible.length} ${EXHIBITION_KIND_LABEL[active].toLowerCase()} of ${exhibitions.length} exhibitions`;

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {kinds.length > 1 ? (
        <ToggleGroup
          aria-label="Filter exhibitions by kind"
          variant="outline"
          size="sm"
          value={[active]}
          onValueChange={value => {
            const next = value[0];
            setFilter(isKindFilter(next) ? next : 'all');
          }}
          className="flex-wrap print:hidden"
        >
          <ToggleGroupItem value="all">
            All
            <span className="text-xs text-muted-foreground tabular-nums">{exhibitions.length}</span>
          </ToggleGroupItem>
          {kinds.map(kind => (
            <ToggleGroupItem key={kind} value={kind}>
              {EXHIBITION_KIND_LABEL[kind]}
              <span className="text-xs text-muted-foreground tabular-nums">{counts.get(kind)}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {status}
      </p>
      <YearGroups
        groups={groupByYear(visible)}
        getKey={exhibition => exhibition.id}
        headingLevel={headingLevel}
        renderItem={exhibition => <ExhibitionRow exhibition={exhibition} showYear={false} />}
      />
    </div>
  );
}
