import type { ReactNode } from 'react';

import { FactsTable, FactsTableSkeleton } from '@/components/raisonne/shell/facts';
import type { HeadingLevel } from '@/components/raisonne/shell/heading';
import type { Fact } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * The record beside the text: what a catalogue entry states about a show, an
 * installation or an award. It keeps the same shape on every page, so a
 * visitor learns where to look once.
 *
 * `highlights` are the short phrases an artist adds to a show ("24 sheets",
 * "rehung weekly"); they sit under the table because they are claims about
 * the work rather than fields of the record.
 */
export function RecordFacts({
  facts,
  title = 'Record',
  headingLevel = 2,
  highlights,
  actions,
  children,
  className,
}: {
  facts: Fact[];
  title?: string | null;
  headingLevel?: HeadingLevel;
  highlights?: string[];
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const Heading = `h${headingLevel}` as const;
  const hasHighlights = Boolean(highlights && highlights.length > 0);
  if (facts.length === 0 && !hasHighlights && !actions && !children) return null;

  return (
    <section className={cn('flex flex-col gap-3', className)}>
      {title ? <Heading className="text-sm font-medium">{title}</Heading> : null}
      <FactsTable facts={facts} />
      {hasHighlights ? (
        <ul className="flex flex-col gap-1 pt-1">
          {highlights?.map(highlight => (
            <li key={highlight} className="flex gap-2 text-sm text-pretty text-muted-foreground">
              <span aria-hidden>·</span>
              {highlight}
            </li>
          ))}
        </ul>
      ) : null}
      {children}
      {actions ? <div className="flex flex-wrap gap-2 pt-1">{actions}</div> : null}
    </section>
  );
}

export function RecordFactsSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return <FactsTableSkeleton rows={rows} className={className} />;
}
