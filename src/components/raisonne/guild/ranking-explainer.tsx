import { RANKING_EXCLUSIONS, RANKING_STEPS } from '@/lib/guild';
import { cn } from '@/lib/utils';

/**
 * How the order is decided, in plain words, on the page that uses it.
 *
 * A ranking nobody can reproduce is a ranking nobody should trust. These are
 * the same four comparisons the code makes, in the same order, and the list
 * of what is deliberately not counted is as much a part of the method as the
 * list of what is.
 */
export function RankingExplainer({ className }: { className?: string }) {
  return (
    <div className={cn('grid gap-8 lg:grid-cols-2', className)}>
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-medium">What decides the order</h3>
        <ol className="flex flex-col gap-4">
          {RANKING_STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span
                aria-hidden
                className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium tabular-nums"
              >
                {index + 1}
              </span>
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium">{step.title}</p>
                <p className="text-sm text-muted-foreground">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-sm text-muted-foreground">
          Wallets that are level on all of it take the same rank, and the next rank skips, so a list can read 1, 2, 2,
          4.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-medium">What is not counted</h3>
        <ul className="flex flex-col gap-3">
          {RANKING_EXCLUSIONS.map(line => (
            <li key={line} className="flex gap-3 text-sm text-muted-foreground">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
