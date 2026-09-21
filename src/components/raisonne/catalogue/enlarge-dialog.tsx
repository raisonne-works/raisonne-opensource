'use client';

import Link from 'next/link';
import { ArrowUpRightIcon, ExpandIcon, InfoIcon } from 'lucide-react';

import { CopyButton } from '@/components/raisonne/shell/copy-button';
import { hostOf, shortAddress } from '@/components/raisonne/works/lib';
import { MediaStill } from '@/components/raisonne/works/media-still';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import type { CatalogueEntry } from './entry';

/**
 * Enlarge a record without leaving the list: the image fills a dialog over
 * the page, Escape or a click outside closes it, the route never changes and
 * the list keeps its scroll position. Visitors use it to scan a series
 * quickly, which is a different job from the work page's viewer.
 *
 * Interactive works are not run here. A grid must never start running code,
 * so the dialog shows the still and points at the work's own page, where the
 * artist has allowed it to run in a sandbox.
 */
export function EnlargeButton({ entry, className }: { entry: CatalogueEntry; className?: string }) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            className={className}
            aria-label={`Enlarge ${entry.title}`}
            title="Enlarge"
          />
        }
      >
        <ExpandIcon aria-hidden />
      </DialogTrigger>
      <EnlargeContent entry={entry} />
    </Dialog>
  );
}

/**
 * The gallery wall and the contact sheet enlarge from the image itself, so
 * the trigger is whatever the caller renders.
 */
export function EnlargeTrigger({
  entry,
  children,
  className,
}: {
  entry: CatalogueEntry;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            className={className}
            aria-label={`Enlarge ${entry.title}`}
          />
        }
      >
        {children}
      </DialogTrigger>
      <EnlargeContent entry={entry} />
    </Dialog>
  );
}

function EnlargeContent({ entry }: { entry: CatalogueEntry }) {
  const href = entry.href ?? entry.externalHref;
  const external = !entry.href && Boolean(entry.externalHref);
  const openLabel = external && href ? `Open on ${hostOf(href)}` : `Open the ${entry.typeLabel.toLowerCase()}`;

  return (
    <DialogContent className="flex h-[min(92dvh,1200px)] w-[calc(100vw-2rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(calc(100vw-4rem),1600px)]">
      <DialogHeader className="gap-1 border-b px-4 py-3 pr-12">
        <DialogTitle className="truncate leading-snug">{entry.title}</DialogTitle>
        <DialogDescription className="truncate">
          {[entry.typeLabel, entry.subtitle, ...entry.meta].filter(Boolean).join(' · ')}
        </DialogDescription>
      </DialogHeader>

      <div className="relative min-h-0 flex-1 bg-muted/40">
        <MediaStill
          media={entry.media}
          alt={entry.title}
          sizes="90vw"
          source="stage"
          fit="contain"
          className="absolute inset-0 aspect-auto h-full w-full rounded-none bg-transparent"
        />
      </div>

      <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
          {entry.interactive ? (
            <span className="flex items-center gap-1.5">
              <InfoIcon aria-hidden className="size-4 shrink-0" />
              Interactive work, it runs on its own page
            </span>
          ) : null}
          {entry.fullTitle ? <span className="truncate">{entry.fullTitle}</span> : null}
          {entry.contract ? (
            <span className="flex items-center gap-1">
              <span className="font-mono text-xs" title={entry.contract}>
                {shortAddress(entry.contract)}
              </span>
              <CopyButton value={entry.contract} label={`Copy the contract address for ${entry.title}`} />
              {entry.explorerUrl ? (
                <a
                  href={entry.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-sm underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {hostOf(entry.explorerUrl)}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : null}
            </span>
          ) : null}
          {entry.status ? <Badge variant="secondary">{entry.status}</Badge> : null}
        </div>

        {href ? (
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={
              external ? (
                <a href={href} target="_blank" rel="noopener noreferrer" />
              ) : (
                <Link href={href} />
              )
            }
          >
            {openLabel}
            <ArrowUpRightIcon aria-hidden data-icon="inline-end" />
          </Button>
        ) : null}
      </div>
    </DialogContent>
  );
}
