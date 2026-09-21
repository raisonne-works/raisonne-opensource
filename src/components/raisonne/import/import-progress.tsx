'use client';

import { useEffect, useState } from 'react';
import { CheckIcon, CircleAlertIcon, CircleDashedIcon, CircleSlashIcon, InfoIcon } from 'lucide-react';

import { CardHeading } from '@/components/raisonne/shell/card-heading';
import type { HeadingLevel } from '@/components/raisonne/shell/heading';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardAction, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ImportChain } from '@/lib/import-events';

import { formatCount, plural } from '../works/lib';
import { formatSeconds } from './format';
import {
  CHAIN_LABELS,
  DISCOVERY_STEPS,
  IMPORT_CHAINS,
  type ImportPhase,
  type ImportState,
  loadedWorkCount,
  type StepState,
  stepFor,
  stepIsShared,
} from './import-state';

export interface ImportProgressProps {
  state: ImportState;
  /** Columns before a run starts. Once it starts, the run's own chains are shown. */
  chains?: readonly ImportChain[];
  /** The level of this step's title in the page's outline. */
  headingLevel?: HeadingLevel;
  className?: string;
}

/**
 * Step two: the six discovery passes for each chain, as they run. Each cell
 * shows its state (waiting, running with a live timer, done with a count and
 * duration, skipped, error) and the importer's note on what it found.
 */
export function ImportProgress({ state, chains, headingLevel = 2, className }: ImportProgressProps) {
  const columns: readonly ImportChain[] =
    state.phase !== 'idle' && state.chains.length > 0 ? state.chains : chains?.length ? chains : IMPORT_CHAINS;
  const live = state.phase === 'running' && state.startedAt !== null;
  const now = useRunClock(live);

  const elapsed = elapsedMs(state, now);
  const settled = settledShare(state, columns);
  const loaded = loadedWorkCount(state);

  return (
    <Card className={className}>
      <CardHeader>
        <CardHeading level={headingLevel}>Discovery</CardHeading>
        <CardDescription>
          Six passes per chain look for contracts your wallets deployed, own or created works on.
        </CardDescription>
        <CardAction className="flex items-center gap-2">
          <PhaseBadge phase={state.phase} />
          {elapsed !== null ? (
            <span className="min-w-12 text-right text-sm text-muted-foreground tabular-nums">
              <span className="sr-only">Elapsed </span>
              {formatSeconds(elapsed)}
            </span>
          ) : null}
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Progress
          value={state.phase === 'idle' ? 0 : Math.round(settled * 100)}
          aria-label="Discovery passes finished"
        />

        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[38%] text-muted-foreground sm:w-[46%]">Pass</TableHead>
              {columns.map(chain => (
                <TableHead key={chain} className="text-muted-foreground">
                  {CHAIN_LABELS[chain]}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {DISCOVERY_STEPS.map(({ step, label, description }) => {
              const shared = stepIsShared(state, columns, step);
              return (
                <TableRow key={step} className="hover:bg-transparent">
                  <TableCell className="py-3 align-top whitespace-normal">
                    <div className="font-medium">{label}</div>
                    <div className="mt-0.5 hidden text-xs text-pretty text-muted-foreground sm:block">{description}</div>
                  </TableCell>
                  {shared ? (
                    <TableCell colSpan={columns.length} className="py-3 align-top whitespace-normal">
                      <StepCell step={stepFor(state, columns[0], step)} state={state} now={now} />
                    </TableCell>
                  ) : (
                    columns.map(chain => (
                      <TableCell key={chain} className="py-3 align-top whitespace-normal">
                        <StepCell step={stepFor(state, chain, step)} state={state} now={now} />
                      </TableCell>
                    ))
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {state.phase !== 'idle' ? (
          <dl className="grid grid-cols-3 gap-4 text-sm">
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">First series</dt>
              <dd className="font-medium tabular-nums">{formatSeconds(state.firstSeriesMs) ?? 'Not yet'}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Series found</dt>
              <dd className="font-medium tabular-nums">{formatCount(state.seriesOrder.length)}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Works loaded</dt>
              <dd className="font-medium tabular-nums">{formatCount(loaded)}</dd>
            </div>
          </dl>
        ) : null}

        <RunNotices state={state} elapsed={elapsed} />
      </CardContent>
    </Card>
  );
}

/**
 * The browser clock for the live timers, ticking only while a run is live.
 * It lives here, in the one component that shows it, so a tick re-renders
 * this card and nothing else. Null until the first tick.
 */
function useRunClock(active: boolean): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!active) return undefined;
    const id = window.setInterval(() => setNow(performance.now()), 100);
    return () => window.clearInterval(id);
  }, [active]);
  return active ? now : null;
}

function elapsedMs(state: ImportState, now: number | null): number | null {
  switch (state.phase) {
    case 'idle':
      return null;
    case 'running':
      return now !== null && state.startedAt !== null ? Math.max(state.lastMs, now - state.startedAt) : state.lastMs;
    case 'done':
      return state.totalMs ?? state.lastMs;
    default:
      return state.startedAt !== null && state.endedAt !== null ? state.endedAt - state.startedAt : state.lastMs;
  }
}

/** Share of pass cells that have settled (done, skipped or error), from 0 to 1. */
function settledShare(state: ImportState, chains: readonly ImportChain[]): number {
  if (state.phase === 'done') return 1;
  const total = DISCOVERY_STEPS.length * chains.length;
  if (!total) return 0;
  let settled = 0;
  for (const { step } of DISCOVERY_STEPS) {
    for (const chain of chains) {
      const status = stepFor(state, chain, step)?.status;
      if (status === 'done' || status === 'skipped' || status === 'error') settled += 1;
    }
  }
  return settled / total;
}

const PHASE_LABELS: Record<ImportPhase, string> = {
  idle: 'Ready',
  running: 'Importing',
  done: 'Done',
  failed: 'Failed',
  aborted: 'Stopped',
};

function PhaseBadge({ phase }: { phase: ImportPhase }) {
  switch (phase) {
    case 'running':
      return (
        <Badge variant="secondary">
          <Spinner data-icon="inline-start" aria-hidden className="motion-reduce:animate-none" />
          {PHASE_LABELS[phase]}
        </Badge>
      );
    case 'done':
      return (
        <Badge variant="secondary">
          <CheckIcon data-icon="inline-start" aria-hidden />
          {PHASE_LABELS[phase]}
        </Badge>
      );
    case 'failed':
      return <Badge variant="destructive">{PHASE_LABELS[phase]}</Badge>;
    default:
      return <Badge variant="outline">{PHASE_LABELS[phase]}</Badge>;
  }
}

function StepCell({ step, state, now }: { step: StepState | null; state: ImportState; now: number | null }) {
  const live = state.phase === 'running';

  if (!step || step.status === 'pending') {
    const label = state.phase === 'idle' ? 'Not started' : live ? 'Waiting' : 'Not run';
    return (
      <span className="flex items-center gap-2 text-muted-foreground">
        <CircleDashedIcon aria-hidden className="size-4 shrink-0 opacity-60" />
        <span className="text-xs">{label}</span>
      </span>
    );
  }

  // The importer's own words, in full: a clipped explanation is no explanation.
  const note = step.message ? (
    <p className="mt-1 hidden text-xs text-pretty break-words text-muted-foreground sm:block">{step.message}</p>
  ) : null;

  const count =
    step.count !== null ? (
      <span className="font-medium text-foreground tabular-nums">{formatCount(step.count)}</span>
    ) : null;

  switch (step.status) {
    case 'running': {
      if (!live) {
        return (
          <div>
            <span className="flex items-center gap-2 text-muted-foreground">
              <CircleSlashIcon aria-hidden className="size-4 shrink-0" />
              <span className="text-xs">Stopped</span>
            </span>
            {note}
          </div>
        );
      }
      const ms =
        now !== null && step.startedAt !== null
          ? now - step.startedAt
          : step.startedMs !== null
            ? state.lastMs - step.startedMs
            : null;
      return (
        <div>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <Spinner aria-hidden className="shrink-0 text-muted-foreground motion-reduce:animate-none" />
            <span className="sr-only">Running</span>
            {count}
            <span className="text-xs text-muted-foreground tabular-nums">{formatSeconds(ms)}</span>
          </span>
          {note}
        </div>
      );
    }
    case 'done': {
      const ms = step.startedMs !== null && step.endedMs !== null ? step.endedMs - step.startedMs : null;
      return (
        <div>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <CheckIcon aria-hidden className="size-4 shrink-0" />
            <span className="sr-only">Done</span>
            {count}
            {ms !== null ? <span className="text-xs text-muted-foreground tabular-nums">{formatSeconds(ms)}</span> : null}
          </span>
          {note}
        </div>
      );
    }
    case 'skipped':
      return (
        <div>
          <span className="flex items-center gap-2 text-muted-foreground">
            <CircleSlashIcon aria-hidden className="size-4 shrink-0" />
            <span className="text-xs">Skipped</span>
          </span>
          {note}
        </div>
      );
    case 'error':
      return (
        <div>
          <span className="flex items-center gap-2 text-destructive">
            <CircleAlertIcon aria-hidden className="size-4 shrink-0" />
            <span className="text-xs font-medium">Error</span>
          </span>
          {note}
        </div>
      );
    default:
      return null;
  }
}

function RunNotices({ state, elapsed }: { state: ImportState; elapsed: number | null }) {
  const problems = [...state.errors];
  if (state.malformedLines > 0) {
    const verb = state.malformedLines === 1 ? 'was' : 'were';
    problems.push(`${plural(state.malformedLines, 'line')} of the stream could not be read and ${verb} skipped.`);
  }

  return (
    <>
      {state.phase === 'aborted' ? (
        <Alert>
          <InfoIcon aria-hidden />
          <AlertTitle>You stopped the import{elapsed !== null ? ` at ${formatSeconds(elapsed)}` : ''}</AlertTitle>
          <AlertDescription>What it found up to then is below. Run it again to finish the search.</AlertDescription>
        </Alert>
      ) : null}
      {problems.length > 0 ? (
        <Alert variant="destructive">
          <CircleAlertIcon aria-hidden />
          <AlertTitle>
            {state.phase === 'failed' ? 'The import did not finish' : 'Some passes reported problems'}
          </AlertTitle>
          <AlertDescription>
            {problems.length === 1 ? (
              <p className="break-words">{problems[0]}</p>
            ) : (
              <ul className="list-disc pl-4">
                {problems.map((problem, index) => (
                  <li key={index} className="break-words">
                    {problem}
                  </li>
                ))}
              </ul>
            )}
            {state.phase === 'failed' ? <p>Anything found before it stopped is still below.</p> : null}
          </AlertDescription>
        </Alert>
      ) : null}
    </>
  );
}
