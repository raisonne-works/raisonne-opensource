'use client';

import { ChevronRightIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * The table under a chart, folded away until somebody asks for it.
 *
 * Every chart on these pages was immediately followed by a table carrying
 * exactly the same numbers, and the table was the easier of the two to read,
 * which left the chart looking like decoration on top of the real answer. A
 * chart is for the shape and a table is for the values, and a reader wants
 * one at a time.
 *
 * It is a disclosure rather than a deletion because the table is also the
 * chart's accessible form: the drawing is hidden from assistive technology,
 * and a `<summary>` is a real control that a screen reader announces and can
 * open, so the numbers stay reachable by everyone rather than only by people
 * who can see the bars.
 */
export function ChartNumbers({
  /** What the numbers are, e.g. "Events a month". Heads the control. */
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <details className={cn('group border-t pt-3', className)}>
      <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-sm text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
        <ChevronRightIcon aria-hidden className="size-4 transition-transform group-open:rotate-90" />
        {label}
      </summary>
      <div className="max-h-96 overflow-y-auto pt-4">{children}</div>
    </details>
  );
}
