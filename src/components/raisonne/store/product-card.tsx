import Image from 'next/image';
import Link from 'next/link';
import { ImageOffIcon } from 'lucide-react';

import { EMPTY_BLOCK_CLASS } from '@/components/raisonne/shell/measure';
import { MEDIA_FRAME_CLASS } from '@/components/raisonne/works/lib';
import { Badge } from '@/components/ui/badge';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import type { Product } from '@/lib/types';
import { cn } from '@/lib/utils';

import {
  SHOP_GRID_CLASS,
  SHOP_GRID_SIZES,
  editionLabels,
  priceLabel,
  productBuyable,
  productHref,
} from './lib';

/**
 * One product in a grid: the picture, the title, the price, and the two
 * things a buyer decides on before opening the page, which are whether it is
 * an edition and whether it can still be bought.
 *
 * The tile is the same shape as a work tile (media above, caption below, no
 * Card), so a shop grid and a catalogue grid read as one site. The price is
 * the only thing that is never a range without saying so: a product with
 * several sizes prints "from" through priceLabel().
 */
export function ProductCard({
  product,
  sizes = SHOP_GRID_SIZES,
  priority = false,
  className,
}: {
  product: Product;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  const cover = product.cover ?? product.gallery[0] ?? null;
  const image = cover?.kind === 'video' ? cover.poster : (cover?.src ?? null);
  const price = priceLabel(product);
  const soldOut = !productBuyable(product);
  const edition = editionLabels(product)[0] ?? null;

  return (
    <Link
      href={productHref(product.slug)}
      className={cn(
        'group/product-card flex min-w-0 flex-col gap-3 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        className,
      )}
    >
      <div className={cn('relative aspect-square w-full overflow-hidden rounded-lg', MEDIA_FRAME_CLASS)}>
        {image ? (
          <Image
            src={image}
            alt=""
            fill
            sizes={sizes}
            priority={priority}
            className={cn('object-cover transition-opacity', soldOut ? 'opacity-60' : 'group-hover/product-card:opacity-90')}
          />
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-muted-foreground">
            <ImageOffIcon aria-hidden="true" className="size-5" />
            <span className="text-xs text-pretty">No picture yet</span>
          </span>
        )}
        {soldOut ? (
          <Badge variant="secondary" className="absolute top-2 left-2">
            Sold out
          </Badge>
        ) : null}
      </div>

      <span className="flex min-w-0 flex-col gap-1">
        <span className="line-clamp-2 text-sm font-medium underline-offset-4 group-hover/product-card:underline">
          {product.title}
        </span>
        {product.subtitle ? (
          <span className="line-clamp-1 text-xs text-muted-foreground">{product.subtitle}</span>
        ) : null}
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          {price ? <span className="text-sm tabular-nums">{price}</span> : null}
          {edition && edition !== product.subtitle ? (
            <span className="text-xs text-muted-foreground">{edition}</span>
          ) : null}
        </span>
      </span>
    </Link>
  );
}

/** The shop's one grid. Every list of products uses it, so they all line up. */
export function ProductGrid({
  products,
  priorityCount = 0,
  empty,
  className,
}: {
  products: Product[];
  /** How many tiles load eagerly, for the ones above the fold. */
  priorityCount?: number;
  empty?: React.ReactNode;
  className?: string;
}) {
  if (products.length === 0) return <>{empty ?? <ProductGridEmpty />}</>;

  return (
    <ul className={cn(SHOP_GRID_CLASS, className)}>
      {products.map((product, index) => (
        <li key={product.slug} className="min-w-0">
          <ProductCard product={product} priority={index < priorityCount} />
        </li>
      ))}
    </ul>
  );
}

export function ProductGridEmpty({
  title = 'Nothing here yet',
  description = 'There is nothing in this part of the shop at the moment.',
  className,
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <Empty className={cn(EMPTY_BLOCK_CLASS, className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ImageOffIcon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

/** The grid while it loads, at the same proportions, so nothing jumps. */
export function ProductGridSkeleton({ count = 8, className }: { count?: number; className?: string }) {
  return (
    <div className={cn(SHOP_GRID_CLASS, className)} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex min-w-0 flex-col gap-3">
          <Skeleton className="aspect-square w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}
