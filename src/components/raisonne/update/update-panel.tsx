'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ArrowUpCircleIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  LoaderCircleIcon,
  RefreshCwIcon,
  TriangleAlertIcon,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { READING_CLASS } from '@/components/raisonne/shell/measure';
import type { ApplyResult, UpdateStatus } from '@/lib/update/types';
import { cn } from '@/lib/utils';

/**
 * The artist's control for keeping this install on the latest Raisonne.
 *
 * Reads /api/update (owner-gated). Applying an update rewrites the app tree
 * and leaves local catalogue data, orders and env alone; the running process
 * still needs a rebuild/restart afterwards, and the panel says so.
 */

type LoadState =
  | { phase: 'loading' }
  | { phase: 'ready'; status: UpdateStatus }
  | { phase: 'error'; message: string };

function relationCopy(status: UpdateStatus): { label: string; tone: 'ok' | 'warn' | 'info' } {
  switch (status.relation) {
    case 'behind':
      return { label: 'Update available', tone: 'warn' };
    case 'current':
      return { label: 'Up to date', tone: 'ok' };
    case 'ahead':
      return { label: 'Ahead of latest release', tone: 'info' };
    default:
      return { label: status.checkError ? 'Could not check' : 'Unknown', tone: 'info' };
  }
}

function formatWhen(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function UpdatePanel({ className }: { className?: string }) {
  const [load, setLoad] = useState<LoadState>({ phase: 'loading' });
  const [applying, setApplying] = useState(false);
  const [applyMessage, setApplyMessage] = useState<{ ok: boolean; summary: string; detail: string | null } | null>(
    null,
  );

  const loadStatus = useCallback(async (force = false) => {
    setLoad(current => (current.phase === 'ready' ? current : { phase: 'loading' }));
    try {
      const response = await fetch(force ? '/api/update?force=1' : '/api/update', { cache: 'no-store' });
      if (response.status === 401 || response.status === 403) {
        setLoad({
          phase: 'error',
          message: 'Sign in with an owner wallet to see and run updates.',
        });
        return;
      }
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setLoad({ phase: 'error', message: body?.error ?? `Could not read update status (${response.status}).` });
        return;
      }
      const status = (await response.json()) as UpdateStatus;
      setLoad({ phase: 'ready', status });
    } catch {
      setLoad({ phase: 'error', message: 'Could not reach this install’s update endpoint.' });
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function onApply() {
    if (applying) return;
    setApplying(true);
    setApplyMessage(null);
    try {
      const response = await fetch('/api/update', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      const body = (await response.json().catch(() => null)) as
        | (Partial<ApplyResult> & { error?: string; status?: UpdateStatus })
        | null;
      if (body?.status) {
        setLoad({ phase: 'ready', status: body.status });
      } else {
        await loadStatus(true);
      }
      setApplyMessage({
        ok: body?.ok === true,
        summary: body?.summary ?? body?.error ?? (response.ok ? 'Updated.' : 'Update did not finish.'),
        detail: body?.detail ?? null,
      });
    } catch {
      setApplyMessage({
        ok: false,
        summary: 'The update request failed before the install could answer.',
        detail: null,
      });
    } finally {
      setApplying(false);
    }
  }

  if (load.phase === 'loading') {
    return (
      <Card className={cn('max-w-[46rem]', className)} data-slot="update-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <LoaderCircleIcon className="size-4 animate-spin" aria-hidden />
            Checking for updates
          </CardTitle>
          <CardDescription className={READING_CLASS}>Reading this install’s version and the latest release.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (load.phase === 'error') {
    return (
      <Card className={cn('max-w-[46rem]', className)} data-slot="update-panel">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Update</Badge>
          </div>
          <CardTitle className="text-xl">Cannot check for updates</CardTitle>
          <CardDescription className={READING_CLASS}>{load.message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="outline" onClick={() => void loadStatus(true)}>
            <RefreshCwIcon aria-hidden data-icon="inline-start" />
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { status } = load;
  const relation = relationCopy(status);
  const canApply = status.apply.ok && status.relation === 'behind' && !applying;
  const latestLabel = status.latest ? `v${status.latest.version}` : '—';
  const checked = formatWhen(status.checkedAt);
  const published = formatWhen(status.latest?.publishedAt ?? null);
  const lastApplyWhen = formatWhen(status.lastApply?.finishedAt ?? null);

  return (
    <div data-slot="update-panel" className={cn('flex max-w-[46rem] flex-col gap-6', className)}>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={relation.tone === 'warn' ? 'default' : 'secondary'}>{relation.label}</Badge>
            {status.current.dirty ? <Badge variant="outline">Working tree dirty</Badge> : null}
            {status.lastApply?.restartRequired ? <Badge variant="outline">Restart needed</Badge> : null}
          </div>
          <CardTitle className="text-xl">Raisonne {status.current.version}</CardTitle>
          <CardDescription className={READING_CLASS}>
            This is the app itself — the code this install runs. Your catalogue data, orders and environment files are
            not part of an update and are never overwritten by one.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">This install</dt>
              <dd className="font-mono text-sm">
                v{status.current.version}
                {status.current.commit ? <span className="text-muted-foreground"> · {status.current.commit}</span> : null}
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Latest release</dt>
              <dd className="font-mono text-sm">
                {latestLabel}
                {published ? <span className="text-muted-foreground"> · {published}</span> : null}
              </dd>
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Upstream</dt>
              <dd className="text-sm">
                <a
                  href={status.upstream.releasesUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
                >
                  {status.upstream.repo}
                  <ExternalLinkIcon className="size-3.5" aria-hidden />
                </a>
                {checked ? <span className="text-muted-foreground"> · checked {checked}</span> : null}
              </dd>
            </div>
          </dl>

          {status.checkError ? (
            <p className={cn('flex items-start gap-2 text-sm text-pretty text-muted-foreground', READING_CLASS)}>
              <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
              {status.checkError}
            </p>
          ) : null}

          {status.latest?.notes ? (
            <div className="flex flex-col gap-2 border-l pl-4">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Release notes</p>
              <p className={cn('text-sm text-pretty whitespace-pre-wrap text-muted-foreground', READING_CLASS)}>
                {status.latest.notes}
              </p>
              <a
                href={status.latest.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-fit items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
              >
                Full release
                <ExternalLinkIcon className="size-3.5" aria-hidden />
              </a>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" disabled={!canApply} onClick={() => void onApply()}>
              {applying ? (
                <LoaderCircleIcon className="animate-spin" aria-hidden data-icon="inline-start" />
              ) : (
                <ArrowUpCircleIcon aria-hidden data-icon="inline-start" />
              )}
              {applying ? 'Updating…' : status.relation === 'behind' ? `Update to ${latestLabel}` : 'Up to date'}
            </Button>
            <Button type="button" variant="outline" disabled={applying} onClick={() => void loadStatus(true)}>
              <RefreshCwIcon aria-hidden data-icon="inline-start" />
              Check again
            </Button>
          </div>

          {!status.apply.ok ? (
            <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-4">
              <p className={cn('text-sm text-pretty', READING_CLASS)}>{status.apply.reason}</p>
              {status.apply.command ? (
                <p className="text-sm">
                  On the host:{' '}
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{status.apply.command}</code>
                </p>
              ) : null}
            </div>
          ) : status.relation === 'behind' ? (
            <p className={cn('text-sm text-pretty text-muted-foreground', READING_CLASS)}>
              Update pulls the release into this checkout and runs the package install. Your data stays. Afterwards
              rebuild and restart the app so the running process picks up the new code.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {applyMessage ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {applyMessage.ok ? (
                <CheckCircle2Icon className="size-4 text-muted-foreground" aria-hidden />
              ) : (
                <TriangleAlertIcon className="size-4 text-muted-foreground" aria-hidden />
              )}
              {applyMessage.summary}
            </CardTitle>
            {applyMessage.detail ? (
              <CardDescription className={cn('whitespace-pre-wrap', READING_CLASS)}>{applyMessage.detail}</CardDescription>
            ) : null}
          </CardHeader>
        </Card>
      ) : null}

      {status.lastApply && !applyMessage ? (
        <p className={cn('text-sm text-pretty text-muted-foreground', READING_CLASS)}>
          Last update attempt{lastApplyWhen ? ` · ${lastApplyWhen}` : ''}: {status.lastApply.summary}
          {status.lastApply.restartRequired ? ' Restart still required.' : ''}
        </p>
      ) : null}
    </div>
  );
}
