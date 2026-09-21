import Link from 'next/link';
import { ExternalLinkIcon } from 'lucide-react';

import type { HeadingLevel } from '@/components/raisonne/shell/heading';
import { WorkGrid } from '@/components/raisonne/works/work-grid';
import {
  contractExplorerUrl,
  formatCount,
  plural,
  seriesHref,
  shortTokenId,
  workHref,
} from '@/components/raisonne/works/lib';
import { Badge } from '@/components/ui/badge';
import type { HeldGroup } from '@/lib/collectors';
import { cn } from '@/lib/utils';

/**
 * The works a wallet holds, grouped by the series they belong to, each group
 * a link into the catalogue.
 *
 * A collector holds tens of works, not thousands, so the whole holding is on
 * one page rather than paged: this is somebody's own collection and it
 * should read as one thing.
 *
 * A token on one of the artist's contracts that the catalogue has no record
 * of is listed as itself, by token id, instead of being dropped. The
 * catalogue can be behind the chain, and a collector should be able to see
 * that their token is held and not yet catalogued rather than see nothing.
 */

export function HeldWorks({
  groups,
  headingLevel = 3,
  className,
}: {
  groups: HeldGroup[];
  headingLevel?: HeadingLevel;
  className?: string;
}) {
  if (groups.length === 0) return null;

  return (
    <div className={cn('flex flex-col gap-10', className)}>
      {groups.map(group => (
        <HeldGroupBlock key={group.seriesSlug ?? 'uncatalogued'} group={group} headingLevel={headingLevel} />
      ))}
    </div>
  );
}

function HeldGroupBlock({ group, headingLevel }: { group: HeldGroup; headingLevel: HeadingLevel }) {
  const Heading = `h${headingLevel}` as const;
  const held = group.works.length + group.unresolved.length;
  const extraEditions = group.editions - held;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <Heading className="text-lg font-semibold tracking-tight">
          {group.series ? (
            <Link href={seriesHref(group.series)} className="underline-offset-4 hover:underline">
              {group.series.displayTitle?.trim() || group.series.name}
            </Link>
          ) : (
            'Not in the catalogue'
          )}
        </Heading>
        <p className="text-sm text-muted-foreground">
          {plural(held, 'work')}
          {extraEditions > 0 ? `, ${formatCount(group.editions)} editions` : ''}
        </p>
      </div>

      {group.works.length > 0 ? <WorkGrid works={group.works} hrefFor={workHref} /> : null}

      {group.unresolved.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border border-y border-border">
          {group.unresolved.map(holding => {
            const explorer = contractExplorerUrl(holding.chain, holding.contract);
            return (
              <li
                key={holding.workId}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="font-mono text-xs" title={holding.tokenId}>
                    Token {shortTokenId(holding.tokenId)}
                  </span>
                  <Badge variant="outline">Not catalogued</Badge>
                  {holding.balance > 1 ? (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatCount(holding.balance)} editions
                    </span>
                  ) : null}
                </span>
                {explorer ? (
                  <a
                    href={explorer}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
                  >
                    On the explorer
                    <ExternalLinkIcon aria-hidden className="size-3" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
