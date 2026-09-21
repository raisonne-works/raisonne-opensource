'use client';

import { useMemo } from 'react';

import type { HeadingLevel } from '@/components/raisonne/shell/heading';

import { ImportFlow } from './import-flow';
import { createRemoteReplaySource, type ImportRequest } from './import-source';

/**
 * The import flow over a recording the browser fetches from `endpoint` when
 * the run starts, instead of one the page ships in its HTML. Only the
 * wallets, the chains and the duration come with the page, so the form can
 * show them straight away.
 */
export function ImportReplay({
  endpoint,
  request,
  durationMs,
  headingLevel,
  className,
}: {
  endpoint: string;
  request: ImportRequest | null;
  durationMs: number | null;
  headingLevel?: HeadingLevel;
  className?: string;
}) {
  const wallets = request?.wallets.join(',') ?? '';
  const chains = request?.chains.join(',') ?? '';
  const source = useMemo(
    () => createRemoteReplaySource({ endpoint, request, durationMs }),
    // The request is a fresh object on every render; its contents are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [endpoint, wallets, chains, durationMs],
  );

  return <ImportFlow source={source} headingLevel={headingLevel} className={className} />;
}
