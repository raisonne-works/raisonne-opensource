import Link from 'next/link';
import { ExternalLinkIcon } from 'lucide-react';

import { CopyButton } from '@/components/raisonne/shell/copy-button';
import { addressExplorerUrl, hostOf, shortAddress } from '@/components/raisonne/works/lib';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Collector } from '@/lib/types';
import { cn } from '@/lib/utils';

import { addressInitials, collectorHref, collectorName, nameIsAddress } from './lib';

/**
 * Who a wallet is, as far as anyone can honestly say.
 *
 * A wallet is named by its ENS record when the chain has one, by the
 * artist's own label where the install publishes collector names, and
 * otherwise by its address, set in mono because that is what it is. Nothing
 * here invents a display name, an avatar or a country from an address, and
 * the full address is always on the page beside the name, so a reader can
 * check for themselves.
 */

export function CollectorIdentity({
  collector,
  showLabel = false,
  eyebrow,
  headingLevel = 1,
  className,
}: {
  collector: Collector;
  /** Whether the artist's own note about this wallet may be printed. */
  showLabel?: boolean;
  eyebrow?: string;
  headingLevel?: 1 | 2 | 3;
  className?: string;
}) {
  const Heading = `h${headingLevel}` as const;
  const name = collectorName(collector, { showLabel });
  const isAddress = nameIsAddress(collector, { showLabel });
  const explorer = addressExplorerUrl(collector.chain, collector.address);
  const label = showLabel ? collector.label?.trim() : '';

  return (
    <div className={cn('flex min-w-0 items-center gap-4', className)}>
      <Avatar className="size-12 shrink-0">
        {collector.avatar ? <AvatarImage src={collector.avatar} alt="" /> : null}
        <AvatarFallback className="font-mono text-xs">{addressInitials(collector.address)}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col gap-1">
        {eyebrow ? <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p> : null}
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Heading
            className={cn(
              'min-w-0 truncate text-2xl font-semibold tracking-tight sm:text-3xl',
              isAddress && 'font-mono text-xl sm:text-2xl',
            )}
            title={collector.address}
          >
            {name}
          </Heading>
          {collector.isOwner ? <Badge variant="secondary">The artist</Badge> : null}
        </div>
        {label && !isAddress && name !== label ? (
          <p className="truncate text-sm text-muted-foreground">{label}</p>
        ) : null}
        <div className="flex min-w-0 flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <span className="truncate font-mono text-xs" title={collector.address}>
            {shortAddress(collector.address, 10, 8)}
          </span>
          <CopyButton value={collector.address} label="Copy the wallet address" />
          <a
            href={explorer}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline"
          >
            {hostOf(explorer)}
            <ExternalLinkIcon aria-hidden className="size-3" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * The same wallet in a row of a table: the name, with the address under it
 * when the name is not already the address.
 */
export function CollectorNameLink({
  entry,
  showLabel = false,
  /**
   * Whether /collector/<address> is open to everyone on this install
   * (settings.publicCollectorProfiles). With it off there is no page to send
   * anyone to, so the row is the same row without a link rather than a link
   * into a 404.
   */
  linked = true,
  className,
}: {
  entry: { address: string; ens?: string | null; label?: string | null };
  showLabel?: boolean;
  linked?: boolean;
  className?: string;
}) {
  const name = collectorName(entry, { showLabel });
  const isAddress = nameIsAddress(entry, { showLabel });

  const body = (
    <>
      <Avatar className="size-8 shrink-0">
        <AvatarFallback className="font-mono text-[0.65rem]">{addressInitials(entry.address)}</AvatarFallback>
      </Avatar>
      <span className="flex min-w-0 flex-col">
        <span
          className={cn(
            'truncate text-sm font-medium underline-offset-4',
            linked && 'group-hover/collector:underline group-focus-visible/collector:underline',
            isAddress && 'font-mono text-xs',
          )}
          title={entry.address}
        >
          {name}
        </span>
        {isAddress ? null : (
          <span className="truncate font-mono text-xs text-muted-foreground">{shortAddress(entry.address)}</span>
        )}
      </span>
    </>
  );

  const shell = cn('group/collector flex min-w-0 items-center gap-3 outline-none', className);
  if (!linked) return <span className={shell}>{body}</span>;

  return (
    <Link href={collectorHref(entry.address)} className={shell}>
      {body}
    </Link>
  );
}
