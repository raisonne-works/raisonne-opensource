import { Badge } from '@/components/ui/badge';
import type { Chain } from '@/lib/types';
import { cn } from '@/lib/utils';

import { CHAIN_LABELS } from './lib';

/** The chain a work or series lives on. Text only: chains get no brand colours here. */
export function ChainBadge({ chain, className }: { chain: Chain; className?: string }) {
  return (
    <Badge variant="outline" className={cn('font-normal', className)}>
      {CHAIN_LABELS[chain] ?? chain}
    </Badge>
  );
}
