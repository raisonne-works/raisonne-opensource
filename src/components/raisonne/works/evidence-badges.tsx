'use client';

import { UsersIcon } from 'lucide-react';

import { badgeVariants } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger } from '@/components/ui/popover';
import type { Evidence } from '@/lib/types';
import { cn } from '@/lib/utils';

import { CO_AUTHORED_COPY, EVIDENCE_COPY, type EvidenceCopy, groupEvidence, plural } from './lib';

interface Signal extends EvidenceCopy {
  key: string;
  details: string[];
  primary: boolean;
}

/**
 * Why the works are attributed to the artist, one badge per on-chain signal.
 *
 * Each badge is a button that opens the plain-words explanation: a Popover,
 * not a Tooltip, because a tooltip never opens on a touch screen and this is
 * the claim the whole catalogue rests on.
 *
 * `compact` folds the badges into one ("3 signals"), for narrow rows such as
 * the import review on a phone.
 */
export function EvidenceBadges({
  evidence,
  coAuthored = false,
  compact = false,
  className,
}: {
  evidence: Evidence[];
  coAuthored?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const signals: Signal[] = [
    ...(coAuthored ? [{ key: 'co-authored', ...CO_AUTHORED_COPY, details: [], primary: true }] : []),
    ...groupEvidence(evidence).map(({ signal, details }) => ({
      key: signal,
      ...EVIDENCE_COPY[signal],
      details,
      primary: false,
    })),
  ];

  if (signals.length === 0) {
    return <p className={cn('text-sm text-muted-foreground', className)}>No on-chain evidence recorded.</p>;
  }

  if (compact && signals.length > 1) {
    return (
      <Popover>
        <PopoverTrigger
          openOnHover
          delay={150}
          className={cn(badgeVariants({ variant: 'secondary' }), 'cursor-pointer', className)}
        >
          {plural(signals.length, 'signal')}
        </PopoverTrigger>
        <PopoverContent className="max-h-80 w-80 max-w-[calc(100vw-2rem)] overflow-y-auto">
          <PopoverTitle render={<p />}>Why this is attributed to the artist</PopoverTitle>
          <ul className="flex flex-col gap-2.5">
            {signals.map(signal => (
              <li key={signal.key} className="flex flex-col gap-0.5">
                <p className="font-medium">{signal.label}</p>
                <p className="text-pretty text-muted-foreground">{signal.explanation}</p>
                <Details details={signal.details} />
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <ul aria-label="Attribution evidence" className={cn('flex flex-wrap gap-1.5', className)}>
      {signals.map(signal => (
        <li key={signal.key}>
          <Popover>
            <PopoverTrigger
              openOnHover
              delay={150}
              className={cn(
                badgeVariants({ variant: signal.primary ? 'default' : 'secondary' }),
                'cursor-pointer',
              )}
            >
              {signal.primary ? <UsersIcon aria-hidden data-icon="inline-start" /> : null}
              {signal.label}
            </PopoverTrigger>
            <PopoverContent className="max-w-[calc(100vw-2rem)]">
              <PopoverTitle render={<p />}>{signal.label}</PopoverTitle>
              <PopoverDescription render={<p />} className="text-pretty">
                {signal.explanation}
              </PopoverDescription>
              <Details details={signal.details} />
            </PopoverContent>
          </Popover>
        </li>
      ))}
    </ul>
  );
}

function Details({ details }: { details: string[] }) {
  if (details.length === 0) return null;
  return (
    <>
      {details.map(detail => (
        <p key={detail} className="font-mono text-xs break-all text-muted-foreground">
          {detail}
        </p>
      ))}
    </>
  );
}
