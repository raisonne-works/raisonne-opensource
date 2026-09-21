import { ChainBadge } from '@/components/raisonne/works/chain-badge';
import { type FactItem, FactList } from '@/components/raisonne/works/fact-list';
import {
  STANDARD_LABELS,
  contractExplorerUrl,
  formatCount,
  formatDateTime,
  marketLabel,
  seriesHref,
  seriesTitle,
  shortAddress,
} from '@/components/raisonne/works/lib';
import type { Drop, Series } from '@/lib/types';

/**
 * What is being released: the chain and standard, how many, when it opens and
 * closes, and the series it belongs to. Rows the artist has not filled in are
 * left out, so an announcement with only a date still reads cleanly.
 */
export function DropSpecs({ drop, series = null, className }: { drop: Drop; series?: Series | null; className?: string }) {
  const explorer = drop.chain && drop.contract ? contractExplorerUrl(drop.chain, drop.contract) : null;

  const facts: FactItem[] = [
    ...(drop.kind ? [{ label: 'Release', value: drop.kind }] : []),
    ...(drop.chain ? [{ label: 'Chain', value: <ChainBadge chain={drop.chain} /> }] : []),
    ...(drop.standard ? [{ label: 'Standard', value: STANDARD_LABELS[drop.standard] }] : []),
    ...(drop.editionSize ? [{ label: 'Supply', value: formatCount(drop.editionSize), mono: true }] : []),
    { label: 'Opens', value: formatDateTime(drop.startsAt) ?? 'To be announced', mono: Boolean(drop.startsAt) },
    ...(drop.endsAt ? [{ label: 'Closes', value: formatDateTime(drop.endsAt) ?? '', mono: true }] : []),
    ...(drop.contract
      ? [{ label: 'Contract', value: shortAddress(drop.contract), mono: true, copy: drop.contract, href: explorer }]
      : []),
    ...(series ? [{ label: 'Series', value: seriesTitle(series), href: seriesHref(series) }] : []),
    ...(drop.marketUrl
      ? [{ label: 'Marketplace', value: marketLabel(drop.marketUrl, drop.platform), href: drop.marketUrl }]
      : drop.platform
        ? [{ label: 'Platform', value: drop.platform }]
        : []),
  ];

  return <FactList facts={facts} className={className} />;
}
