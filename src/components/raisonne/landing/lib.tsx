import type { ComponentProps } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { ArtistLink, Asset, Media } from '@/lib/types';

/**
 * Small pieces the home page sections share.
 */

/** A link inside this site, as opposed to somewhere else on the web. */
export function isInternalHref(href: string): boolean {
  return href.startsWith('/') && !href.startsWith('//');
}

/**
 * A call to action from the data. An internal href routes with next/link and
 * gets a forward arrow; anything else opens in a new tab and says so.
 */
export function CtaButton({
  cta,
  variant = 'default',
  size = 'lg',
  className,
}: {
  cta: ArtistLink;
  variant?: ComponentProps<typeof Button>['variant'];
  size?: ComponentProps<typeof Button>['size'];
  className?: string;
}) {
  const internal = isInternalHref(cta.href);

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      nativeButton={false}
      render={
        internal ? <Link href={cta.href} /> : <a href={cta.href} target="_blank" rel="noopener noreferrer" />
      }
    >
      {cta.label}
      {internal ? (
        <ArrowRight aria-hidden data-icon="inline-end" />
      ) : (
        <>
          <ArrowUpRight aria-hidden data-icon="inline-end" />
          <span className="sr-only"> (opens in a new tab)</span>
        </>
      )}
    </Button>
  );
}

/** Keeps the line breaks an artist typed into a headline. */
export function headlineLines(headline: string): string[] {
  return headline.split('\n');
}

/**
 * An Asset seen as Media, so the one image component the catalogue already
 * has (MediaStill, with its empty frame, its failure state and its refusal
 * to put an animated original in a grid) also serves the home page, the
 * About page and every record cover.
 */
export function assetMedia(asset: Asset | null | undefined): Media | null {
  if (!asset) return null;
  const still = asset.kind === 'video' ? asset.poster : asset.src;
  return {
    kind: asset.kind,
    still,
    full: still,
    animation: asset.kind === 'video' ? asset.src : null,
    width: asset.width,
    height: asset.height,
  };
}
