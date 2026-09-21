import { ArrowUpRight } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * An inline link that leaves the site: opens in a new tab, says so to
 * screen readers, and marks itself with a small arrow. Without an href it
 * renders its children as plain text, so list rows can pass url straight in.
 */
export function ExternalLink({
  href,
  children,
  className,
  showIcon = true,
}: {
  href: string | null | undefined;
  children: React.ReactNode;
  className?: string;
  showIcon?: boolean;
}) {
  if (!href) return <>{children}</>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50',
        className,
      )}
    >
      {children}
      {showIcon ? (
        <ArrowUpRight aria-hidden className="ml-0.5 inline size-3.5 -translate-y-px text-muted-foreground print:hidden" />
      ) : null}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
