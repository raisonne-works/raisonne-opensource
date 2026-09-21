import { ShieldCheck } from 'lucide-react';

import { CopyButton } from '@/components/raisonne/shell/copy-button';
import { addressExplorerUrl, CHAIN_LABELS } from '@/components/raisonne/works/lib';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { ArtistWallet } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * The addresses the artist mints from, in full, so a collector can check a
 * listing against them before spending anything.
 *
 * The whole address is printed rather than shortened, because a shortened
 * address is exactly what an impostor's address matches. Each one can be
 * copied in one press and opened on its chain's explorer, and the artist's
 * own warning sits above them.
 */
export function MintingAddresses({
  wallets,
  notice,
  className,
}: {
  wallets: ArtistWallet[];
  /** The artist's anti-impersonation note, e.g. "never send funds to an address from a message". */
  notice?: string | null;
  className?: string;
}) {
  if (wallets.length === 0) return null;
  const primary = wallets.filter(wallet => wallet.role === 'primary');
  const rest = wallets.filter(wallet => wallet.role !== 'primary');

  return (
    <div data-slot="minting-addresses" className={cn('flex flex-col gap-4', className)}>
      {notice ? (
        <Alert className="max-w-[40rem]">
          <ShieldCheck aria-hidden />
          <AlertTitle>Check before you collect</AlertTitle>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      ) : null}

      <ul className="flex flex-col divide-y divide-border">
        {[...primary, ...rest].map(wallet => (
          <li
            key={`${wallet.chain}:${wallet.address}`}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 first:pt-0"
          >
            <span className="w-20 shrink-0 text-sm font-medium">{CHAIN_LABELS[wallet.chain]}</span>
            <a
              href={addressExplorerUrl(wallet.chain, wallet.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 rounded-sm font-mono text-xs break-all underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {wallet.address}
              <span className="sr-only"> on a block explorer (opens in a new tab)</span>
            </a>
            {wallet.role ? (
              <Badge variant="outline" className="shrink-0 capitalize">
                {wallet.role}
              </Badge>
            ) : null}
            <CopyButton
              value={wallet.address}
              label={`Copy the ${CHAIN_LABELS[wallet.chain]} address`}
              className="ml-auto"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MintingAddressesSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div role="status" className={cn('flex flex-col gap-3', className)}>
      <span className="sr-only">Loading the minting addresses</span>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} aria-hidden className="flex items-center gap-3 py-1">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
      ))}
    </div>
  );
}
