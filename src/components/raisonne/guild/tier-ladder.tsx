import Link from 'next/link';

import { CardHeading } from '@/components/raisonne/shell/card-heading';
import { formatCount } from '@/components/raisonne/works/lib';
import { Badge } from '@/components/ui/badge';
import { Card, CardAction, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { isAutomatic, tierBand, type TierCount } from '@/lib/guild';
import { cn } from '@/lib/utils';

import { leaderboardHref, tierAnchor, EMPTY_LEADERBOARD_STATE } from './lib';

/**
 * The ladder, highest first: what each tier is, what puts a wallet in it, and
 * how many wallets are in it today.
 *
 * A tier is the artist's writing. The install decides membership and nothing
 * else: it reads the percentile band on each tier and says which band a rank
 * falls in. A tier with no band is never assigned automatically, and says so
 * rather than sitting there looking earnable.
 *
 * It has to look like a ladder. Three identical cards with a neutral count
 * badge is a list of three things, not an order, and the rule used to be
 * stated three times in descending grey inside each one ("Who is in it. The
 * top 20 percent", then the artist's own wording of the same thing, then the
 * current count). One statement of the rule, one of the count, the rung
 * number carried by size and by the accent, and early access folded into the
 * list of what the tier carries, where it always belonged.
 */
export function TierLadder({
  distribution,
  ranked,
  className,
  headingLevel = 3,
}: {
  distribution: readonly TierCount[];
  /** Wallets on the ranked list, so a share can be read against something. */
  ranked: number;
  className?: string;
  headingLevel?: 2 | 3;
}) {
  if (distribution.length === 0) return null;

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <ol className="flex flex-col gap-4">
      {distribution.map(({ tier, wallets, share }, index) => {
        const band = tierBand(tier);
        const top = index === 0;
        // Early access is one of the things the tier carries, so it goes in
        // the list of things the tier carries.
        const carries = tier.earlyAccess ? [...tier.benefits, `Early access: ${tier.earlyAccess}`] : tier.benefits;
        return (
          <li key={tier.id} id={tierAnchor(tier.id)} className="scroll-mt-24">
            <Card
              className={cn(
                'gap-4 border-l-4 border-l-border',
                // The top rung is the only one with the accent and the only
                // one set larger. Rank has to be visible before it is read.
                top && 'border-l-[color:var(--chart-accent)]',
              )}
            >
              <CardHeader>
                <CardHeading level={headingLevel} className={cn(top && 'text-xl')}>
                  {tier.name}
                </CardHeading>
                {tier.description ? <CardDescription>{tier.description}</CardDescription> : null}
                <CardAction>
                  {wallets > 0 ? (
                    <Badge variant="outline" render={<Link href={leaderboardHref(EMPTY_LEADERBOARD_STATE, { tier: tier.id })} />}>
                      <span className="tabular-nums">{formatCount(wallets)}</span>
                      <span>{wallets === 1 ? 'wallet' : 'wallets'}</span>
                    </Badge>
                  ) : (
                    // The same shape as a count, so an empty tier reads as a
                    // tier with nobody in it rather than as a missing field.
                    <Badge variant="outline" className="text-muted-foreground">
                      Nobody yet
                    </Badge>
                  )}
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  {/* The rule, once. The artist's own wording when there is
                      some, the band otherwise; both said the same thing. */}
                  <p className="text-sm">
                    <span className="font-medium">Who is in it. </span>
                    <span className="text-muted-foreground">
                      {tier.requirements ??
                        band ??
                        'Given by the artist. This tier has no percentile band, so the install never assigns it.'}
                    </span>
                  </p>
                  {isAutomatic(tier) && ranked > 0 ? (
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {formatCount(wallets)} of {formatCount(ranked)} ranked wallets, {share.toFixed(share < 10 ? 1 : 0)}{' '}
                      percent.
                    </p>
                  ) : null}
                </div>

                {carries.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs font-medium text-muted-foreground">What it carries</p>
                    <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
                      {carries.map(benefit => (
                        <li key={benefit}>{benefit}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </li>
        );
      })}
      </ol>
      <p className="max-w-[36rem] text-sm text-pretty text-muted-foreground">
        A band is a share of the ranked list, so the count beside a tier can sit either side of it. Wallets level on
        works, series and date take the same rank, and on a short list one rank is a large slice of it.
      </p>
    </div>
  );
}
