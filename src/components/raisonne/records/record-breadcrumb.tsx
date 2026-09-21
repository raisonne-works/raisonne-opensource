import Link from 'next/link';
import { Fragment } from 'react';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

/**
 * Where a record page sits: the list it came from, then the record itself.
 * The current page is the last item and is not a link, and a long title
 * truncates rather than pushing the trail onto three lines.
 */
export function RecordBreadcrumb({
  parents,
  current,
}: {
  /** The trail above this page, nearest last. */
  parents: { href: string; label: string }[];
  current: string;
}) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {/* The separator is a list item of its own, so it sits beside the link, never inside it. */}
        {parents.map(parent => (
          <Fragment key={parent.href}>
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbLink render={<Link href={parent.href} />} className="truncate">
                {parent.label}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </Fragment>
        ))}
        <BreadcrumbItem className="min-w-0">
          <BreadcrumbPage className="truncate">{current}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
