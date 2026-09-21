import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** The grid that holds specimens: one column on phones, two from md, three from 2xl. */
export function SpecimenGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid gap-x-6 gap-y-10 md:grid-cols-2 2xl:grid-cols-3', className)}>{children}</div>;
}

/**
 * One component on show: its name, where it comes from, a stage with the
 * component in realistic states, and a short usage note. The stage is a plain
 * bordered area, not a card, so cards shown inside it are never nested cards.
 */
export function Specimen({
  title,
  source,
  note,
  children,
  span = 1,
  stageClassName,
}: {
  title: string;
  /** The import path under src/components, e.g. "ui/button". */
  source?: string;
  note?: ReactNode;
  children: ReactNode;
  span?: 1 | 2 | 'full';
  stageClassName?: string;
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-3',
        span === 2 && 'md:col-span-2',
        span === 'full' && 'md:col-span-2 2xl:col-span-3',
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h4 className="text-sm font-medium">{title}</h4>
        {source ? <code className="font-mono text-xs text-muted-foreground">{source}</code> : null}
      </div>
      <div className={cn('flex min-h-32 min-w-0 flex-wrap items-center gap-3 rounded-xl border p-4 sm:p-6', stageClassName)}>
        {children}
      </div>
      {note ? <p className="max-w-prose text-sm text-pretty text-muted-foreground">{note}</p> : null}
    </div>
  );
}
