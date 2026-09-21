import Link from 'next/link';

import { cn } from '@/lib/utils';

import { INSIGHTS_TABS, type InsightsTabId } from './lib';

export interface InsightsNavExtra {
  href: string;
  label: string;
}

/**
 * The three insights pages, as links rather than tabs.
 *
 * A tab control would need the browser, and these are three separate pages
 * that each have to be citable on their own. Links keep the back button, the
 * middle click and the crawler working, and `aria-current` tells a screen
 * reader which one is open.
 *
 * `extra` carries whatever else the install has under /insights (the
 * leaderboard, the guild). The pages pass only the ones whose data exists, so
 * nothing here can lead somewhere empty.
 */
export function InsightsNav({
  current,
  extra = [],
  className,
}: {
  current: InsightsTabId;
  extra?: InsightsNavExtra[];
  className?: string;
}) {
  const items = [
    ...INSIGHTS_TABS.map(tab => ({ href: tab.href, label: tab.label, active: tab.id === current })),
    ...extra.map(item => ({ ...item, active: false })),
  ];

  return (
    <nav aria-label="Insights" className={cn('border-b border-border', className)}>
      <ul className="-mb-px flex flex-wrap items-center gap-x-6 gap-y-1">
        {items.map(item => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={item.active ? 'page' : undefined}
              className={cn(
                'inline-block rounded-sm border-b-2 px-0.5 py-2 text-sm font-medium outline-none transition-colors',
                'focus-visible:ring-3 focus-visible:ring-ring/50',
                item.active
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
