import Link from 'next/link';

import { collectorName } from '@/components/raisonne/collectors/lib';
import { TierChip } from '@/components/raisonne/collectors/tier-badges';
import { CardHeading } from '@/components/raisonne/shell/card-heading';
import { formatCount, formatDate, shortAddress } from '@/components/raisonne/works/lib';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import type { Standing } from '@/lib/guild';
import { cn } from '@/lib/utils';

import { BadgeChips } from './badge-chips';
import { tierHref } from './lib';

/**
 * The signed-in visitor's own row, pinned above the table.
 *
 * A leaderboard is only interesting when you can find yourself on it, and
 * scrolling 400 rows to do that is not finding. The card carries the same
 * figures as the row, and the row itself is marked as well, so the two agree.
 *
 * Every state here is a real answer. A wallet that holds nothing is told so
 * plainly, and the artist's own wallet is told why it is not ranked, because
 * "you are not on this list" with no reason reads as a fault.
 */
export function YourStanding({
  standing,
  address,
  total,
  isOwner = false,
  snapshotDate,
  rowHref = null,
  className,
  headingLevel = 2,
}: {
  standing: Standing | null;
  /** The signed-in wallet, lowercased. */
  address: string;
  /** Wallets on the ranked list, so a rank can be read as "12 of 480". */
  total: number;
  /** True when this wallet owns the install, which is why it is not ranked. */
  isOwner?: boolean;
  /** When the snapshot was taken, in plain words. */
  snapshotDate: string | null;
  /** The page of the table this wallet's own row is on, when it is not the open one. */
  rowHref?: string | null;
  className?: string;
  headingLevel?: 2 | 3;
}) {
  const name = standing ? collectorName(standing.row, { showLabel: standing.namedByArtist }) : shortAddress(address);

  if (!standing) {
    return (
      <Card className={cn('gap-3', className)}>
        <CardHeader>
          <CardHeading level={headingLevel}>Your wallet is not on this list</CardHeading>
          <CardDescription className="font-mono text-xs">{shortAddress(address)}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            {isOwner
              ? "This is one of the artist's own wallets. The artist is left out of the ranking, so the list is of collectors only."
              : 'The snapshot found no works from this catalogue in this wallet.'}
          </p>
          {!isOwner && snapshotDate ? (
            <p className="text-sm text-muted-foreground">
              A work bought since {snapshotDate} will appear when the studio takes the next snapshot. Nothing is
              counted live here, because a ranking has to be the same for everyone reading it.
            </p>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  const first = formatDate(standing.row.firstAcquiredAt ?? null);

  return (
    <Card className={cn('gap-4', className)}>
      <CardHeader>
        <CardHeading level={headingLevel}>Your standing</CardHeading>
        <CardDescription>
          {name}
          {standing.namedByArtist ? null : <span className="sr-only"> ({address})</span>}
        </CardDescription>
        {standing.tier ? (
          <CardAction>
            <Link href={tierHref(standing.tier.id)} className="inline-flex rounded-4xl focus-visible:ring-3 focus-visible:ring-ring/50">
              <TierChip tier={standing.tier} />
            </Link>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Figure
            label="Rank"
            value={formatCount(standing.rank)}
            detail={total > 0 ? `of ${formatCount(total)} ranked` : undefined}
          />
          <Figure label="Works held" value={formatCount(standing.row.worksOwned)} />
          <Figure label="Series" value={formatCount(standing.row.seriesCount)} />
          <Figure label="First acquisition" value={first ?? 'Not recorded'} small={!first} />
        </dl>
        {standing.badges.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">Badges</p>
            <BadgeChips badges={standing.badges} />
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {rowHref ? (
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href={rowHref} />}>
              Find my row
            </Button>
          ) : null}
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/collector" />}>
            My collection
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Figure({ label, value, detail, small = false }: { label: string; value: string; detail?: string; small?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('font-medium tabular-nums', small ? 'text-sm text-muted-foreground' : 'text-lg')}>{value}</dd>
      {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  );
}

/** What a signed-out visitor sees in the same place. */
export function SignInToSeeYourRow({ href, className }: { href: string; className?: string }) {
  return (
    <Card size="sm" className={cn('gap-2', className)}>
      <CardContent className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Sign in with the wallet that holds the work and your own row is pinned here, and marked in the table.
        </p>
        <Button variant="outline" size="sm" nativeButton={false} render={<Link href={href} />} className="shrink-0">
          Sign in
        </Button>
      </CardContent>
    </Card>
  );
}
