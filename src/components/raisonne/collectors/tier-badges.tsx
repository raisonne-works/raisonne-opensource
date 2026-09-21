import Link from 'next/link';
import { AwardIcon, StarIcon } from 'lucide-react';

import { BadgeChips } from '@/components/raisonne/guild/badge-chips';
import { tierHref } from '@/components/raisonne/guild/lib';
import { CardHeading } from '@/components/raisonne/shell/card-heading';
import type { HeadingLevel } from '@/components/raisonne/shell/heading';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import type { AwardedBadge } from '@/lib/guild';
import type { Tier } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * A wallet's tier and the badges it has earned.
 *
 * Tiers and badges are the artist's own writing, assigned from the snapshot
 * by the guild package, so a collector reads the same standing here as on the
 * leaderboard. Where the leaderboard is published, each chip links to the
 * paragraph that says what earns it; where it is not, the chip carries that
 * sentence as its title instead of pointing at a page that does not exist.
 *
 * A tier carries a colour token in the data. It is not used: this theme has
 * one accent, and a ladder of coloured chips would be the second.
 */

export function TierCard({
  tier,
  badges,
  /** True when this install publishes the leaderboard, so the chips can link to it. */
  explained = false,
  headingLevel = 2,
  className,
}: {
  tier: Tier | null;
  badges: readonly AwardedBadge[];
  explained?: boolean;
  headingLevel?: HeadingLevel;
  className?: string;
}) {
  if (!tier && badges.length === 0) return null;

  return (
    <Card className={cn('gap-4', className)}>
      <CardHeader>
        <CardHeading level={headingLevel}>
          {tier ? (
            explained ? (
              <Link href={tierHref(tier.id)} className="underline-offset-4 hover:underline">
                {tier.name}
              </Link>
            ) : (
              tier.name
            )
          ) : (
            'Badges'
          )}
        </CardHeading>
        {tier?.description ? <CardDescription>{tier.description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {tier?.requirements ? <p className="text-sm text-muted-foreground">{tier.requirements}</p> : null}
        {tier && tier.benefits.length > 0 ? (
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
            {tier.benefits.map(benefit => (
              <li key={benefit}>{benefit}</li>
            ))}
          </ul>
        ) : null}
        {tier?.earlyAccess ? (
          <p className="text-sm">
            <span className="font-medium">Early access. </span>
            <span className="text-muted-foreground">{tier.earlyAccess}</span>
          </p>
        ) : null}
        {explained ? <BadgeChips badges={badges} /> : <PlainBadgeChips badges={badges} />}
      </CardContent>
    </Card>
  );
}

/**
 * The badges with no link out, for an install that keeps its leaderboard
 * private. The sentence that would have been on the other end of the link is
 * the chip's title instead, so the word is never left unexplained.
 */
export function PlainBadgeChips({ badges, className }: { badges: readonly AwardedBadge[]; className?: string }) {
  if (badges.length === 0) return null;

  return (
    <ul className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {badges.map(badge => (
        <li key={badge.id}>
          <Badge variant={badge.positive === false ? 'outline' : 'secondary'} title={badge.earnedBy ?? undefined}>
            {badge.source === 'given' ? (
              <StarIcon aria-hidden data-icon="inline-start" />
            ) : (
              <AwardIcon aria-hidden data-icon="inline-start" />
            )}
            {badge.name}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

/** The tier alone, for a table row or beside a name. */
export function TierChip({ tier, className }: { tier: Tier | null; className?: string }) {
  if (!tier) return null;
  return (
    <Badge variant="outline" className={className}>
      {tier.name}
    </Badge>
  );
}
