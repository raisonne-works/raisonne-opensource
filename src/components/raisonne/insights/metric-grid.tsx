import { CircleSlashIcon } from 'lucide-react';

import { CardHeading } from '@/components/raisonne/shell/card-heading';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { NOT_COMPUTED, type Metric } from './lib';

/**
 * One figure, its source and, when there is none, the reason.
 *
 * The source line is not decoration. These pages mix three kinds of number:
 * what the catalogue holds, what the chain reported, and what was worked out
 * from the second. A reader checking a claim needs to know which, and the
 * date the chain was read.
 */
export function MetricCard({ metric, headingLevel = 3 }: { metric: Metric; headingLevel?: 2 | 3 | 4 | 5 | 6 }) {
  const absent = metric.value === null;

  return (
    <Card className="gap-3">
      <CardHeader className="gap-1">
        <CardHeading level={headingLevel} className="text-sm font-medium text-muted-foreground">
          {metric.label}
        </CardHeading>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2">
        {absent ? (
          <p className="flex items-center gap-1.5 text-base text-muted-foreground">
            <CircleSlashIcon aria-hidden className="size-4 shrink-0" />
            Not recorded
          </p>
        ) : (
          <p className="text-2xl font-semibold tracking-tight tabular-nums">{metric.value}</p>
        )}
        {absent && metric.absent ? <CardDescription>{metric.absent}.</CardDescription> : null}
        {!absent && metric.hint ? <CardDescription>{metric.hint}</CardDescription> : null}
        <p className="mt-auto pt-1 text-xs text-muted-foreground">{metric.source}</p>
      </CardContent>
    </Card>
  );
}

/** The tile grid. Four across at 1280 and wider, never more: these are sentences, not pixels. */
export function MetricGrid({
  metrics,
  headingLevel = 3,
  className,
}: {
  metrics: Metric[];
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}) {
  if (metrics.length === 0) return null;

  return (
    <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4', className)}>
      {metrics.map(metric => (
        <MetricCard key={metric.id} metric={metric} headingLevel={headingLevel} />
      ))}
    </div>
  );
}

/**
 * A few figures at the top, and the rest as a list.
 *
 * Thirteen equal-weight cards in a four-column grid is not a dashboard, it
 * is a wall: "Works in the catalogue 22" carried exactly the weight of
 * "Highest priced sale 1.15 ETH", so the page had to be read label by label
 * and the fifth row held one orphan. The figures a reader opens this page
 * for lead; everything else stays on the page, in full, as a definition
 * list that can be scanned in one pass.
 *
 * Nothing is hidden and no figure loses its source line, because a number
 * whose provenance is not on screen is a number nobody can check.
 */
export function MetricSummary({
  metrics,
  /** How many lead. Three or four; more and the hierarchy stops being one. */
  lead = 4,
  headingLevel = 3,
  className,
}: {
  metrics: Metric[];
  lead?: number;
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}) {
  if (metrics.length === 0) return null;
  if (metrics.length <= lead) return <MetricGrid metrics={metrics} headingLevel={headingLevel} className={className} />;

  const [headline, rest] = [metrics.slice(0, lead), metrics.slice(lead)];

  return (
    <div className={cn('flex flex-col gap-8', className)}>
      <MetricGrid metrics={headline} headingLevel={headingLevel} />

      <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 xl:grid-cols-3">
        {rest.map(metric => (
          <div key={metric.id} className="flex flex-wrap items-baseline justify-between gap-x-4 border-b py-3">
            <dt className="text-sm text-muted-foreground">
              {metric.label}
              <span className="block text-xs">{metric.source}</span>
            </dt>
            <dd className="text-lg font-medium tabular-nums">
              {metric.value ?? <span className="text-base font-normal text-muted-foreground">Not recorded</span>}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function MetricGridSkeleton({ tiles = 8 }: { tiles?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading the figures"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      {Array.from({ length: tiles }, (_, index) => (
        <Card key={index} className="gap-3">
          <CardHeader>
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * The figures this install will not print, and why.
 *
 * A marketplace dashboard shows a floor price, a market cap and a listing
 * count. None of the three can be worked out from public chain data alone,
 * and a zero in their place would read as a fact. Naming them is the honest
 * version of showing them.
 */
export function NotComputedCard({ headingLevel = 3 }: { headingLevel?: 2 | 3 | 4 | 5 | 6 }) {
  return (
    <Card>
      <CardHeader className="gap-1">
        <CardHeading level={headingLevel}>What this page does not show</CardHeading>
        <CardDescription>
          Five figures a marketplace would print and a self-hosted catalogue cannot work out from the chain alone. They
          are absent rather than zero.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {NOT_COMPUTED.map(item => (
            <div key={item.label} className="flex flex-col gap-1">
              <dt className="text-sm font-medium">{item.label}</dt>
              <dd className="text-sm text-pretty text-muted-foreground">{item.reason}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
