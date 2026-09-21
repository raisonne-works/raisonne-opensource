import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { mediumHref, terms } from './lib';

/**
 * The mediums and categories a work or a series is filed under, as links into
 * the catalogue index filtered to that medium. A visitor who likes one thing
 * can see everything else like it in one click.
 */
export function WorkTags({
  tags,
  label = 'Categories',
  className,
}: {
  tags: string[] | undefined | null;
  /** Names the group for screen readers. */
  label?: string;
  className?: string;
}) {
  // The same spelling the facet uses, so a badge and the filter it links to agree.
  const items = terms(tags);
  if (items.length === 0) return null;

  return (
    <ul aria-label={label} className={cn('flex flex-wrap gap-1.5', className)}>
      {items.map(tag => (
        <li key={tag}>
          <Badge variant="outline" className="font-normal" render={<Link href={mediumHref(tag)} />}>
            {tag}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
