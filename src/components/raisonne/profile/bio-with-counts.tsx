import { READING_CLASS } from '@/components/raisonne/shell/measure';
import { Skeleton } from '@/components/ui/skeleton';
import { fillTokens } from '@/lib/records';
import type { CatalogueCounts } from '@/lib/types';
import { cn } from '@/lib/utils';

import { paragraphs } from './format';

/**
 * The biography, with the catalogue's own numbers written into it.
 *
 * An artist writes "over {{artworks}} works in {{collections}} series" once,
 * and every import keeps the sentence true. A token nobody recognises is
 * left exactly as it was typed, so a mistake is visible instead of turning
 * into "undefined" or a quiet zero.
 */
export function BioWithCounts({
  text,
  counts,
  className,
}: {
  text: string | null;
  counts: CatalogueCounts;
  className?: string;
}) {
  const blocks = paragraphs(fillTokens(text, counts));
  if (blocks.length === 0) return null;

  return (
    <div data-slot="bio" className={cn('flex flex-col gap-4 text-base/7 text-pretty', READING_CLASS, className)}>
      {blocks.map((block, index) => (
        <p key={index}>{block}</p>
      ))}
    </div>
  );
}

export function BioSkeleton({ lines = 5, className }: { lines?: number; className?: string }) {
  return (
    <div role="status" className={cn('flex flex-col gap-2.5', READING_CLASS, className)}>
      <span className="sr-only">Loading the biography</span>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} aria-hidden className={cn('h-4 w-full', index === lines - 1 && 'w-2/3')} />
      ))}
    </div>
  );
}
