import type { ReactNode } from 'react';
import { CircleAlertIcon, PlusIcon } from 'lucide-react';

import { CardHeading } from '@/components/raisonne/shell/card-heading';
import type { HeadingLevel } from '@/components/raisonne/shell/heading';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { formatCount } from '../works/lib';
import { formatSeconds } from './format';
import { type ImportState, type IncludeOverrides, includedKeys, seriesWorkCount } from './import-state';

export interface ImportSummaryProps {
  state: ImportState;
  /** The review's switches, so the totals count what would be added. */
  overrides?: IncludeOverrides;
  /** The level of this step's title in the page's outline. */
  headingLevel?: HeadingLevel;
  className?: string;
}

/**
 * Step four: what the import found and what would go into the catalogue, and
 * the next step. Adding to the site needs an installed Raisonne, so on this
 * page the button is shown but switched off, with the reason on hover and
 * keyboard focus.
 */
export function ImportSummary({ state, overrides = {}, headingLevel = 2, className }: ImportSummaryProps) {
  const running = state.phase === 'running';
  const keys = includedKeys(state, overrides);
  const works = keys.reduce((sum, key) => sum + (seriesWorkCount(state, key) ?? 0), 0);
  const found = state.seriesOrder.length;
  const partial = state.phase === 'failed' || state.phase === 'aborted';

  return (
    <Card className={className}>
      <CardHeader>
        <CardHeading level={headingLevel}>Summary</CardHeading>
        <CardDescription>
          {running
            ? 'Totals settle when the last pass finishes.'
            : state.phase === 'idle'
              ? 'Totals appear once an import runs.'
              : 'What goes into your catalogue with the series you switched on.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {partial ? (
          <Alert variant="destructive">
            <CircleAlertIcon aria-hidden />
            <AlertTitle>{state.phase === 'aborted' ? 'The import was stopped' : 'The import did not finish'}</AlertTitle>
            <AlertDescription>These totals only cover what was found before it ended.</AlertDescription>
          </Alert>
        ) : null}
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
          <Stat label="Series" loading={running} note={found > 0 ? `of ${formatCount(found)} found` : undefined}>
            {formatCount(keys.length)}
          </Stat>
          <Stat label="Works" loading={running}>
            {formatCount(works)}
          </Stat>
          <Stat label="First series" note={state.firstSeriesMs !== null ? 'after the import began' : undefined}>
            {formatSeconds(state.firstSeriesMs) ?? 'Not yet'}
          </Stat>
          <Stat label="Total time" loading={running}>
            {formatSeconds(state.phase === 'done' ? (state.totalMs ?? state.lastMs) : partial ? state.lastMs : null) ??
              'Not yet'}
          </Stat>
        </dl>
      </CardContent>
      <CardFooter className="flex-wrap justify-between gap-3">
        <p className="text-sm text-pretty text-muted-foreground">
          Next, add the series you switched on to your catalogue.
        </p>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                disabled
                focusableWhenDisabled
                className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:active:translate-y-0"
              />
            }
          >
            <PlusIcon data-icon="inline-start" aria-hidden />
            Add to your site
          </TooltipTrigger>
          <TooltipContent>Available after install</TooltipContent>
        </Tooltip>
      </CardFooter>
    </Card>
  );
}

function Stat({
  label,
  note,
  loading = false,
  children,
}: {
  label: string;
  note?: string;
  loading?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-2xl font-semibold tracking-tight tabular-nums">
        {loading ? (
          <>
            <Skeleton aria-hidden className="h-8 w-16" />
            <span className="sr-only">Counting</span>
          </>
        ) : (
          children
        )}
      </dd>
      {note && !loading ? <dd className="text-xs text-muted-foreground">{note}</dd> : null}
    </div>
  );
}
