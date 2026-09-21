import type { Series } from '@/lib/types';
import { cn } from '@/lib/utils';

import { EVIDENCE_COPY, groupEvidence } from './lib';

/**
 * Each on-chain signal in plain words, with the raw detail underneath for
 * anyone who wants to check. Shared by the work page and anywhere else the
 * explanation has to be readable without hovering.
 */
export function ProvenanceList({ series, className }: { series: Pick<Series, 'evidence'>; className?: string }) {
  const groups = groupEvidence(series.evidence);
  if (groups.length === 0) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>No on-chain evidence is recorded for this yet.</p>
    );
  }
  return (
    <ul className={cn('flex flex-col divide-y rounded-lg border', className)}>
      {groups.map(({ signal, details }) => (
        <li key={signal} className="flex flex-col gap-1 px-3 py-2.5 text-sm">
          <span className="font-medium">{EVIDENCE_COPY[signal].label}</span>
          <span className="text-pretty text-muted-foreground">{EVIDENCE_COPY[signal].explanation}</span>
          {details.map(detail => (
            <span key={detail} className="font-mono text-xs break-all text-muted-foreground">
              {detail}
            </span>
          ))}
        </li>
      ))}
    </ul>
  );
}
