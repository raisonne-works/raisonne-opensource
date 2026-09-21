'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

import { isBareRoute } from './bare-shell';
import { breadcrumbsFor } from './nav';
import { Container } from './page';

/**
 * The trail every page carries, worked out from the URL, so a new route gets
 * one without asking for it.
 *
 * `labels` carries the few names the install's own data decides, so the
 * trail calls a destination what the page calls itself rather than what the
 * path segment happens to spell.
 *
 * A page that knows better renders its own (a work page can print the
 * series' real name, which the URL only spells as a slug). The stylesheet
 * below hides this one whenever a breadcrumb exists inside the main region,
 * so the two never stack and no page has to switch it off by hand.
 */
export function SiteBreadcrumbs({ labels }: { labels?: Record<string, string> }) {
  const pathname = usePathname();
  const crumbs = breadcrumbsFor(pathname, labels);
  // A bare route carries no site chrome, and a trail is chrome.
  if (crumbs.length === 0 || isBareRoute(pathname)) return null;

  return (
    <>
      <style href="site-breadcrumbs" precedence="medium">
        {'body:has(main [data-slot="breadcrumb"]) [data-slot="site-breadcrumbs"]{display:none}'}
      </style>
      <div data-slot="site-breadcrumbs" className="border-b print:hidden">
        <Container className="py-2.5">
          <Breadcrumb>
            <BreadcrumbList>
              {crumbs.map((crumb, index) => (
                <Fragment key={`${crumb.label}-${index}`}>
                  {/* min-w-0 and truncate on every crumb: a segment is text a
                      URL carries, so any of them can be longer than the
                      screen, and a trail must shorten rather than push the
                      page sideways. */}
                  <BreadcrumbItem className="min-w-0">
                    {crumb.href ? (
                      <BreadcrumbLink
                        className="truncate rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                        render={<Link href={crumb.href} />}
                      >
                        {crumb.label}
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage className="truncate">{crumb.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                  {crumb.href ? <BreadcrumbSeparator /> : null}
                </Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </Container>
      </div>
    </>
  );
}
