'use client';

import { useState } from 'react';
import { ArrowUpRightIcon, ChevronRightIcon, LayersIcon, SearchXIcon } from 'lucide-react';

import { CardHeading } from '@/components/raisonne/shell/card-heading';
import type { HeadingLevel } from '@/components/raisonne/shell/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { DiscoveredSeries } from '@/lib/import-events';
import { cn } from '@/lib/utils';

import { ChainBadge } from '../works/chain-badge';
import { EvidenceBadges } from '../works/evidence-badges';
import { contractExplorerUrl, formatCount, hostOf, plural, shortAddress, STANDARD_LABELS } from '../works/lib';
import {
  type ImportState,
  type IncludeOverrides,
  isIncluded,
  partitionSeries,
  seriesWorkCount,
  suggestionReason,
} from './import-state';

export interface SeriesReviewProps {
  state: ImportState;
  /**
   * Switches someone has flipped, by series key; the rest follow the defaults
   * (confirmed on, suggested and co-authored off). Controlled when given,
   * otherwise the component keeps its own.
   */
  overrides?: IncludeOverrides;
  onOverridesChange?: (overrides: IncludeOverrides) => void;
  /** The level of this step's title in the page's outline. */
  headingLevel?: HeadingLevel;
  className?: string;
}

/**
 * Step three: every series the passes found, with the on-chain evidence for
 * it and a switch to include it. Confirmed series come first; the ones that
 * only look like the artist's sit apart under "Probably not yours", each
 * with the reason.
 */
export function SeriesReview({
  state,
  overrides: controlled,
  onOverridesChange,
  headingLevel = 2,
  className,
}: SeriesReviewProps) {
  const [local, setLocal] = useState<IncludeOverrides>({});
  const overrides = controlled ?? local;
  const setOverrides = (next: IncludeOverrides) => {
    if (!controlled) setLocal(next);
    onOverridesChange?.(next);
  };
  const toggle = (key: string, on: boolean) => setOverrides({ ...overrides, [key]: on });

  const { confirmed, suggested } = partitionSeries(state);
  const total = confirmed.length + suggested.length;
  const included = state.seriesOrder.filter(key => isIncluded(state, overrides, key)).length;
  const running = state.phase === 'running';

  return (
    <Card className={className}>
      <CardHeader>
        <CardHeading level={headingLevel}>Review</CardHeading>
        <CardDescription className="max-w-prose text-pretty">
          Switch on the series that are yours. Confirmed series start on; co-authored series, and anything that only
          looks like yours, start off. Nothing is saved until you add it.
        </CardDescription>
        {total > 0 ? (
          <CardAction className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground tabular-nums">
              {formatCount(included)} of {formatCount(total)} included
            </span>
            {Object.keys(overrides).length > 0 ? (
              <Button variant="ghost" size="sm" onClick={() => setOverrides({})}>
                Reset
              </Button>
            ) : null}
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {total === 0 ? (
          <ReviewEmpty phase={state.phase} />
        ) : (
          <>
            {confirmed.length > 0 ? (
              <SeriesTable
                keys={confirmed}
                state={state}
                overrides={overrides}
                onToggle={toggle}
                caption="Confirmed series"
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {running ? 'No confirmed series yet.' : 'No series could be confirmed as yours.'}
              </p>
            )}
            {running ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner aria-hidden className="motion-reduce:animate-none" />
                Still searching. New series appear at the end of the list.
              </p>
            ) : null}
            {suggested.length > 0 ? (
              <SuggestedGroup keys={suggested} state={state} overrides={overrides} onToggle={toggle} />
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ReviewEmpty({ phase }: { phase: ImportState['phase'] }) {
  if (phase === 'running') {
    return (
      <div role="status" aria-label="Looking for series" className="flex flex-col gap-3">
        {[0, 1, 2].map(row => (
          <div key={row} className="flex items-center gap-4 border-b py-3 last:border-0">
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="hidden h-5 w-20 rounded-4xl md:block" />
            <Skeleton className="h-[18px] w-8 rounded-full" />
          </div>
        ))}
      </div>
    );
  }
  const settled = phase !== 'idle';
  return (
    <Empty className="border py-10">
      <EmptyHeader>
        <EmptyMedia variant="icon">{settled ? <SearchXIcon aria-hidden /> : <LayersIcon aria-hidden />}</EmptyMedia>
        <EmptyTitle>{settled ? 'No series found' : 'Nothing to review yet'}</EmptyTitle>
        <EmptyDescription>
          {settled
            ? 'These wallets did not deploy, own or create works on any contract the passes checked. Check the addresses, or add the wallet you minted from.'
            : 'Series appear here as the passes find them, each with the evidence behind it.'}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function SuggestedGroup({
  keys,
  state,
  overrides,
  onToggle,
}: {
  keys: string[];
  state: ImportState;
  overrides: IncludeOverrides;
  onToggle: (key: string, on: boolean) => void;
}) {
  const on = keys.filter(key => isIncluded(state, overrides, key)).length;
  return (
    <Collapsible className="flex flex-col gap-2 border-t pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CollapsibleTrigger render={<Button variant="ghost" className="-ml-2.5" />}>
          <ChevronRightIcon
            data-icon="inline-start"
            aria-hidden
            className="transition-transform group-data-[panel-open]/button:rotate-90 motion-reduce:transition-none"
          />
          Probably not yours
          <Badge variant="secondary" className="tabular-nums">
            {formatCount(keys.length)}
          </Badge>
        </CollapsibleTrigger>
        {on > 0 ? (
          <span className="text-sm text-muted-foreground">{plural(on, 'series', 'series')} switched on</span>
        ) : null}
      </div>
      <p className="max-w-prose text-sm text-pretty text-muted-foreground">
        Contracts that only look connected to your wallets: tokens minted to you, or a contract you control that
        someone else deployed. They stay off unless you switch them on.
      </p>
      <CollapsibleContent>
        <SeriesTable
          keys={keys}
          state={state}
          overrides={overrides}
          onToggle={onToggle}
          caption="Series that are probably not yours"
        />
      </CollapsibleContent>
    </Collapsible>
  );
}

function SeriesTable({
  keys,
  state,
  overrides,
  onToggle,
  caption,
}: {
  keys: string[];
  state: ImportState;
  overrides: IncludeOverrides;
  onToggle: (key: string, on: boolean) => void;
  caption: string;
}) {
  return (
    <Table>
      <caption className="sr-only">{caption}</caption>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="text-muted-foreground">Series</TableHead>
          <TableHead className="hidden w-28 text-muted-foreground md:table-cell">Chain</TableHead>
          <TableHead className="hidden w-24 text-right text-muted-foreground md:table-cell">Works</TableHead>
          <TableHead className="hidden w-[36%] text-muted-foreground lg:table-cell">Evidence</TableHead>
          <TableHead className="w-16 text-right text-muted-foreground">Include</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {keys.map(key => {
          const series = state.series[key];
          if (!series) return null;
          return (
            <SeriesRow
              key={key}
              series={series}
              works={seriesWorkCount(state, key)}
              running={state.phase === 'running'}
              included={isIncluded(state, overrides, key)}
              onToggle={on => onToggle(key, on)}
            />
          );
        })}
      </TableBody>
    </Table>
  );
}

function SeriesRow({
  series,
  works,
  running,
  included,
  onToggle,
}: {
  series: DiscoveredSeries;
  works: number | null;
  running: boolean;
  included: boolean;
  onToggle: (on: boolean) => void;
}) {
  const name = series.name?.trim() || 'Untitled contract';
  const coAuthored = series.reviewFlag === 'co-authored';
  const explorer = contractExplorerUrl(series.chain, series.contract);
  const note = coAuthored
    ? 'Co-authored: your wallets control this contract, but other artists made works in it. It starts off so you can decide.'
    : series.confidence === 'suggested'
      ? suggestionReason(series)
      : series.shared
        ? 'A marketplace contract shared by many artists: only the works your wallets created count.'
        : null;

  const worksLabel =
    works !== null ? (
      <span className="tabular-nums">{plural(works, 'work')}</span>
    ) : running ? (
      <>
        <Skeleton aria-hidden className="h-4 w-14" />
        <span className="sr-only">Counting works</span>
      </>
    ) : (
      <span className="text-muted-foreground">Count unknown</span>
    );

  const evidence = <EvidenceBadges evidence={series.evidence} coAuthored={coAuthored} />;
  // One row per series on a phone: the signals fold into a single badge that
  // opens them all, explanations included.
  const compactEvidence = <EvidenceBadges evidence={series.evidence} coAuthored={coAuthored} compact />;

  return (
    <TableRow className="hover:bg-transparent">
      <TableCell className="py-3 align-top whitespace-normal">
        <div className={cn('font-medium text-pretty break-words', !included && 'text-muted-foreground')}>
          {name}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {explorer ? (
            <a
              href={explorer}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 rounded-sm font-mono underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {shortAddress(series.contract)}
              <ArrowUpRightIcon aria-hidden className="size-3" />
              <span className="sr-only">, contract on {hostOf(explorer)}, opens in a new tab</span>
            </a>
          ) : (
            <span className="font-mono">{shortAddress(series.contract)}</span>
          )}
          {series.tokenType !== 'UNKNOWN' ? <span>{STANDARD_LABELS[series.tokenType]}</span> : null}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs md:hidden">
          <ChainBadge chain={series.chain} />
          {worksLabel}
        </div>
        <div className="mt-2 lg:hidden">{compactEvidence}</div>
        {note ? <p className="mt-2 max-w-prose text-xs text-pretty text-muted-foreground">{note}</p> : null}
      </TableCell>
      <TableCell className="hidden py-3 align-top md:table-cell">
        <ChainBadge chain={series.chain} />
      </TableCell>
      <TableCell className="hidden py-3 text-right align-top md:table-cell">
        <div className="flex justify-end">{worksLabel}</div>
      </TableCell>
      <TableCell className="hidden py-3 align-top whitespace-normal lg:table-cell">{evidence}</TableCell>
      <TableCell className="py-3 text-right align-top">
        <Switch
          checked={included}
          onCheckedChange={onToggle}
          aria-label={`Include ${name}`}
        />
      </TableCell>
    </TableRow>
  );
}
