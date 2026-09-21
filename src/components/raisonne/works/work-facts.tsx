import type { Series, Work } from '@/lib/types';

import { ChainBadge } from './chain-badge';
import { type FactItem, FactList } from './fact-list';
import { STANDARD_LABELS, editionLabel, isOneOfOne, marketLabel, parseDate } from './lib';

/**
 * The few facts a collector looks for first, beside the work itself: where it
 * lives, what it is, whether there is more than one, when it was minted and
 * where it can be bought. The full record is in WorkAttributes underneath.
 */
export function WorkFacts({ work, series, className }: { work: Work; series: Series | null; className?: string }) {
  const minted = parseDate(work.mintedAt);
  const year = minted?.getUTCFullYear() ?? series?.year ?? null;
  const unique = isOneOfOne(work, series);
  const editions = editionLabel(work);
  const marketUrl = work.marketUrl ?? series?.marketUrl ?? null;

  const facts: FactItem[] = [
    { label: 'Chain', value: <ChainBadge chain={work.chain} /> },
    { label: 'Standard', value: STANDARD_LABELS[work.standard] },
    { label: 'Edition', value: unique ? 'One of one' : editions === 'Not recorded' ? 'Not recorded' : editions },
    ...(year !== null ? [{ label: 'Year', value: String(year), mono: true }] : []),
    ...(marketUrl
      ? [{ label: 'Collect', value: marketLabel(marketUrl, work.platform ?? series?.platform), href: marketUrl }]
      : []),
  ];

  return <FactList facts={facts} className={className} />;
}
