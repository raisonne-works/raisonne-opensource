import type { Series } from '@/lib/types';
import { cn } from '@/lib/utils';

import { ChainBadge } from './chain-badge';
import { type FactItem, FactList } from './fact-list';
import {
  SERIES_KIND_LABELS,
  STANDARD_LABELS,
  contractExplorerUrl,
  formatCount,
  marketLabel,
  shortAddress,
} from './lib';
import { WorkTags } from './work-tags';

/**
 * What a series is, as data: its kind, its size, the contract behind it and
 * where it can be collected. Anything the catalogue does not know is left
 * out rather than printed as "unknown".
 */
export function SeriesSpecs({
  series,
  /** Works this catalogue holds, when that is fewer than the contract's own count. */
  worksInCatalogue,
  className,
}: {
  series: Series;
  worksInCatalogue?: number;
  className?: string;
}) {
  const explorer = contractExplorerUrl(series.chain, series.contract);
  const works = Math.max(series.workCount ?? 0, worksInCatalogue ?? 0);

  const facts: FactItem[] = [
    { label: 'Type', value: SERIES_KIND_LABELS[series.kind] },
    { label: 'Chain', value: <ChainBadge chain={series.chain} /> },
    ...(series.standard ? [{ label: 'Standard', value: STANDARD_LABELS[series.standard] }] : []),
    ...(works > 0 ? [{ label: 'Works', value: formatCount(works), mono: true }] : []),
    ...(series.editionSize && series.editionSize !== works
      ? [{ label: 'Edition size', value: formatCount(series.editionSize), mono: true }]
      : []),
    ...(series.collectorCount ? [{ label: 'Collectors', value: formatCount(series.collectorCount), mono: true }] : []),
    ...(series.year !== null ? [{ label: 'Year', value: String(series.year), mono: true }] : []),
    ...(series.contract
      ? [
          {
            label: 'Contract',
            value: shortAddress(series.contract),
            mono: true,
            copy: series.contract,
            href: explorer,
          },
        ]
      : []),
    ...(series.inscriptionAddress
      ? [
          {
            label: 'Inscription address',
            value: shortAddress(series.inscriptionAddress),
            mono: true,
            copy: series.inscriptionAddress,
          },
        ]
      : []),
    ...(series.marketUrl
      ? [{ label: 'Collect', value: marketLabel(series.marketUrl, series.platform), href: series.marketUrl }]
      : series.platform
        ? [{ label: 'Platform', value: series.platform }]
        : []),
  ];

  return (
    <div data-slot="series-specs" className={cn('flex flex-col gap-4', className)}>
      <FactList facts={facts} />
      <WorkTags tags={series.categories} />
    </div>
  );
}
