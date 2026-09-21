import Image from 'next/image';

import { Skeleton } from '@/components/ui/skeleton';
import type { Client } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * The institutions, brands and studios the work has been made with or shown
 * by. A logo is a name, so a partner with no image is shown as its name in
 * text rather than left out.
 *
 * Logos sit on the page's own background at one height, never in boxes: a
 * row of cards would compete with the work above it.
 *
 * Institutions supply a wordmark in one colour, and it is almost always the
 * dark one, so in dark mode a logo is flattened and inverted: it becomes the
 * same wordmark in white instead of near-black on near-black, where it is
 * invisible. A partner who has supplied a light logo can say so by shipping
 * a light asset, which this leaves alone only if it is already white.
 */
export function Partners({ partners, className }: { partners: Client[]; className?: string }) {
  if (partners.length === 0) return null;

  return (
    <ul data-slot="partners" className={cn('flex flex-wrap items-center gap-x-10 gap-y-6', className)}>
      {partners.map((partner, index) => {
        const inner = partner.logo ? (
          <Image
            src={partner.logo.src}
            alt={partner.name}
            width={partner.logo.width ?? 160}
            height={partner.logo.height ?? 40}
            sizes="160px"
            className="h-8 w-auto max-w-40 object-contain opacity-70 transition-opacity group-hover/partner:opacity-100 dark:opacity-80 dark:brightness-0 dark:invert dark:group-hover/partner:opacity-100"
          />
        ) : (
          <span className="text-sm font-medium text-muted-foreground group-hover/partner:text-foreground">
            {partner.name}
          </span>
        );

        return (
          <li key={`${partner.name}-${index}`} className="flex items-center">
            {partner.url ? (
              <a
                href={partner.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group/partner flex items-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {inner}
                <span className="sr-only">{partner.name} (opens in a new tab)</span>
              </a>
            ) : (
              <span className="group/partner flex items-center">{inner}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function PartnersSkeleton({ items = 5, className }: { items?: number; className?: string }) {
  return (
    <div role="status" className={cn('flex flex-wrap items-center gap-x-10 gap-y-6', className)}>
      <span className="sr-only">Loading the partners</span>
      {Array.from({ length: items }, (_, index) => (
        <Skeleton key={index} aria-hidden className="h-8 w-28" />
      ))}
    </div>
  );
}
