import Link from 'next/link';
import { ArrowUpRightIcon } from 'lucide-react';

import { CardHeading } from '@/components/raisonne/shell/card-heading';
import { dropHref, formatDate } from '@/components/raisonne/works/lib';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@/components/ui/item';
import type { HeadingLevel } from '@/components/raisonne/shell/heading';
import { dropStatus } from '@/lib/records';
import type { CollectorUpdate, Drop, Tier } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * Two blocks a collector sees that nobody else does: what the artist has
 * said to the people holding their work, and what is coming next.
 *
 * Both are real records or nothing. There is no placeholder release and no
 * invented perk: an install that has announced nothing shows neither block.
 */

export function CollectorUpdates({
  updates,
  headingLevel = 2,
  className,
}: {
  updates: CollectorUpdate[];
  headingLevel?: HeadingLevel;
  className?: string;
}) {
  if (updates.length === 0) return null;

  return (
    <Card className={cn('gap-4', className)}>
      <CardHeader>
        <CardHeading level={headingLevel}>From the artist</CardHeading>
        <CardDescription>Notes to the people holding the work.</CardDescription>
      </CardHeader>
      <CardContent>
        <ItemGroup>
          {updates.map(update => (
            <Item key={update.id} size="sm" variant="muted" className="items-start">
              <ItemContent>
                <ItemTitle className="flex flex-wrap items-center gap-2">
                  {update.url ? (
                    <a
                      href={update.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                    >
                      {update.title}
                      <ArrowUpRightIcon aria-hidden className="size-3" />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  ) : (
                    update.title
                  )}
                  {update.date ? (
                    <span className="text-xs font-normal text-muted-foreground tabular-nums">
                      {formatDate(update.date)}
                    </span>
                  ) : null}
                </ItemTitle>
                {update.body ? <ItemDescription>{update.body}</ItemDescription> : null}
              </ItemContent>
            </Item>
          ))}
        </ItemGroup>
      </CardContent>
    </Card>
  );
}

const DROP_STATUS_LABELS: Record<ReturnType<typeof dropStatus>, string> = {
  announced: 'Date to be announced',
  scheduled: 'Scheduled',
  live: 'Open now',
  ended: 'Closed',
};

/**
 * Releases that have not closed, with whatever early access this collector's
 * tier actually grants, in the artist's own words.
 */
export function UpcomingReleases({
  drops,
  tier,
  headingLevel = 2,
  className,
}: {
  drops: Drop[];
  tier: Tier | null;
  headingLevel?: HeadingLevel;
  className?: string;
}) {
  if (drops.length === 0) return null;
  const earlyAccess = tier?.earlyAccess?.trim();

  return (
    <Card className={cn('gap-4', className)}>
      <CardHeader>
        <CardHeading level={headingLevel}>Coming next</CardHeading>
        <CardDescription>
          {earlyAccess ? `${tier?.name}: ${earlyAccess}` : 'Announced releases, open to everyone unless the artist says otherwise.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ItemGroup>
          {drops.map(drop => {
            const status = dropStatus(drop);
            return (
              <Item key={drop.slug} size="sm" variant="muted" className="items-start">
                <ItemContent>
                  <ItemTitle className="flex flex-wrap items-center gap-2">
                    <Link href={dropHref(drop.slug)} className="underline-offset-4 hover:underline">
                      {drop.title}
                    </Link>
                    <Badge variant="outline">{DROP_STATUS_LABELS[status]}</Badge>
                  </ItemTitle>
                  <ItemDescription>
                    {[formatDate(drop.startsAt), drop.kind, drop.description].filter(Boolean).join(' · ')}
                  </ItemDescription>
                </ItemContent>
              </Item>
            );
          })}
        </ItemGroup>
      </CardContent>
    </Card>
  );
}
