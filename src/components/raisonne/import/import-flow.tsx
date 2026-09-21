'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { HistoryIcon, PlayIcon, RotateCcwIcon, ScrollTextIcon } from 'lucide-react';

import type { HeadingLevel } from '@/components/raisonne/shell/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import type { ImportEvent } from '@/lib/import-events';
import { cn } from '@/lib/utils';

import { plural } from '../works/lib';
import { formatSeconds } from './format';
import { ImportProgress } from './import-progress';
import { createReplaySource, type ImportRequest, type ImportSource, isAbortError } from './import-source';
import {
  type ImportAction,
  type IncludeOverrides,
  IMPORT_CHAINS,
  importReducer,
  initialImportState,
} from './import-state';
import { ImportSummary } from './import-summary';
import { SeriesReview } from './series-review';
import { WalletForm } from './wallet-form';
import { WorksPreview } from './works-preview';

export interface ImportFlowProps {
  /** A recorded run, in stream order, played back at its original timing. */
  replay?: ImportEvent[];
  /**
   * Any other source of events, such as a live importer
   * (createStreamSource). Takes precedence over `replay`. Client-side only,
   * since a source carries functions.
   */
  source?: ImportSource;
  /** Start as soon as the page loads, with the source's own wallets. */
  autoStart?: boolean;
  /** The level of each step's title; 2 on the import page. */
  headingLevel?: HeadingLevel;
  className?: string;
}

/**
 * The whole import: wallets in, discovery passes streaming, works appearing,
 * review, summary. All state lives here and the steps only render it, so the
 * switches, the preview and the totals can never disagree.
 *
 * Today the page hands it a recorded run (`replay`), clearly labelled as
 * one. The same flow runs a live importer by passing `source` instead.
 */
export function ImportFlow({
  replay,
  source: sourceProp,
  autoStart = false,
  headingLevel = 2,
  className,
}: ImportFlowProps) {
  const source = useMemo(() => sourceProp ?? createReplaySource(replay ?? []), [sourceProp, replay]);
  const [state, dispatch] = useReducer(importReducer, initialImportState);
  const [overrides, setOverrides] = useState<IncludeOverrides>({});
  const controllerRef = useRef<AbortController | null>(null);
  const lastRequestRef = useRef<ImportRequest | null>(null);

  const isReplay = source.kind === 'replay';
  const fixed = source.fixedRequest;
  const running = state.phase === 'running';

  const start = useCallback(
    (request: ImportRequest) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      lastRequestRef.current = request;
      // A late event from a run that was replaced must not paint over the new one.
      const send = (action: ImportAction) => {
        if (controllerRef.current === controller) dispatch(action);
      };

      setOverrides({});
      send({ kind: 'start', wallets: request.wallets, chains: request.chains, at: performance.now() });
      source
        .run(
          request,
          {
            onEvent: event => send({ kind: 'event', event, at: performance.now() }),
            onMalformed: () => send({ kind: 'malformed' }),
          },
          controller.signal
        )
        // Ended without `done` first reads as cut off, which the reducer handles.
        .then(() => send({ kind: 'ended', at: performance.now() }))
        .catch((error: unknown) => {
          if (isAbortError(error) || controller.signal.aborted) return;
          send({
            kind: 'failed',
            message: error instanceof Error && error.message ? error.message : 'The import could not be read.',
            at: performance.now(),
          });
        });
    },
    [source]
  );

  const stop = useCallback(() => {
    if (!controllerRef.current) return;
    controllerRef.current.abort();
    controllerRef.current = null;
    dispatch({ kind: 'aborted', at: performance.now() });
  }, []);

  const restart = useCallback(() => {
    const request = lastRequestRef.current ?? fixed;
    if (request) start(request);
  }, [fixed, start]);

  // Leaving the page stops the run.
  useEffect(() => () => controllerRef.current?.abort(), []);

  useEffect(() => {
    if (!autoStart || !fixed) return undefined;
    // Deferred a tick so a strict-mode double mount starts one run, not two.
    const id = window.setTimeout(() => start(fixed), 0);
    return () => window.clearTimeout(id);
  }, [autoStart, fixed, start]);

  // Only a change of phase is announced, not every event.
  const announcement =
    state.phase === 'running'
      ? 'Import started.'
      : state.phase === 'done'
        ? `Import finished in ${formatSeconds(state.totalMs) ?? 'no time'}: ${plural(
            state.seriesOrder.length,
            'series',
            'series',
          )} found.`
        : state.phase === 'failed'
          ? 'The import did not finish.'
          : state.phase === 'aborted'
            ? 'Import stopped.'
            : '';

  if (isReplay && !fixed) {
    return (
      <Empty className={cn('max-w-6xl border', className)}>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ScrollTextIcon aria-hidden />
          </EmptyMedia>
          <EmptyTitle>No recorded import yet</EmptyTitle>
          <EmptyDescription>
            This install has no recording of an import run, so there is nothing to play back here. A run recorded by
            the importer appears on this page.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <p role="status" className="sr-only">
        {announcement}
      </p>

      {isReplay ? (
        <div className="flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <Badge variant="secondary" className="self-start sm:self-auto">
              <HistoryIcon data-icon="inline-start" aria-hidden />
              Replay of a recorded import
            </Badge>
            <p className="text-sm text-pretty text-muted-foreground">
              A real run{source.durationMs !== null ? ` of ${formatSeconds(source.durationMs)}` : ''}, played back at
              its original timing. No chain is queried and nothing is saved.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={restart} className="self-start sm:self-auto">
            {state.phase === 'idle' ? (
              <PlayIcon data-icon="inline-start" aria-hidden />
            ) : (
              <RotateCcwIcon data-icon="inline-start" aria-hidden />
            )}
            {state.phase === 'idle' ? 'Play' : 'Restart'}
          </Button>
        </div>
      ) : null}

      <div className="grid max-w-6xl items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <WalletForm
          key={fixed ? fixed.wallets.join(',') : 'live'}
          defaultWallets={fixed?.wallets ?? []}
          defaultChains={fixed?.chains ?? IMPORT_CHAINS}
          locked={Boolean(fixed)}
          running={running}
          headingLevel={headingLevel}
          onStop={stop}
          onSubmit={start}
        />
        <ImportProgress state={state} chains={fixed?.chains} headingLevel={headingLevel} />
      </div>

      {state.phase !== 'idle' ? (
        <WorksPreview state={state} overrides={overrides} headingLevel={headingLevel} className="max-w-6xl py-4" />
      ) : null}

      <SeriesReview
        className="max-w-6xl"
        state={state}
        overrides={overrides}
        headingLevel={headingLevel}
        onOverridesChange={setOverrides}
      />

      {state.phase !== 'idle' ? (
        <ImportSummary className="max-w-6xl" state={state} overrides={overrides} headingLevel={headingLevel} />
      ) : null}
    </div>
  );
}
