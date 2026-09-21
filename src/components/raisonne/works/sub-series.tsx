import type { HeadingLevel } from '@/components/raisonne/shell/heading';
import { Section } from '@/components/raisonne/shell/page';
import type { Series } from '@/lib/types';

import { plural } from './lib';
import { SeriesGrid } from './series-grid';

/**
 * The chapters of a series, listed before its works. A visitor lands on the
 * parent, sees how the body of work is divided, and can open a chapter or
 * keep scrolling through everything the family holds.
 */
export function SubSeries({
  series,
  title = 'Chapters',
  headingLevel = 2,
  className,
}: {
  series: Series[];
  title?: string;
  headingLevel?: HeadingLevel;
  className?: string;
}) {
  if (series.length === 0) return null;
  const works = series.reduce((sum, item) => sum + (item.workCount || 0), 0);

  return (
    <Section
      id="chapters"
      headingLevel={headingLevel}
      title={title}
      description={`${plural(series.length, 'chapter')}, ${plural(works, 'work')} between them.`}
      className={className}
    >
      <SeriesGrid series={series} priorityCount={2} />
    </Section>
  );
}
