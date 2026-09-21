import Image from 'next/image';
import Link from 'next/link';
import { ArrowRightIcon, ImageOffIcon } from 'lucide-react';

import { READING_CLASS } from '@/components/raisonne/shell/measure';
import { MEDIA_FRAME_CLASS } from '@/components/raisonne/works/lib';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Product, StoreCollection } from '@/lib/types';
import { cn } from '@/lib/utils';

import { FULFILMENT_LABELS, collectionHref, editionLabels, priceLabel, productBuyable, productHref } from './lib';

/**
 * The two blocks the shop front opens with: one product given the room to be
 * looked at, and the collections the artist grouped things into.
 *
 * Neither invents anything. The featured product is the one the artist
 * marked; with none marked there is no featured block, not a random pick.
 */
export function FeaturedProduct({ product, className }: { product: Product; className?: string }) {
  const cover = product.cover ?? product.gallery[0] ?? null;
  const image = cover?.kind === 'video' ? cover.poster : (cover?.src ?? null);
  const price = priceLabel(product);
  const labels = editionLabels(product);
  const soldOut = !productBuyable(product);

  return (
    <div className={cn('grid gap-6 md:grid-cols-2 md:items-center md:gap-10', className)}>
      <Link
        href={productHref(product.slug)}
        tabIndex={-1}
        aria-hidden={image ? undefined : true}
        className="group/featured block rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <div className={cn('relative aspect-4/3 w-full overflow-hidden rounded-lg', MEDIA_FRAME_CLASS)}>
          {image ? (
            <Image
              src={image}
              alt={cover?.alt ?? ''}
              fill
              priority
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover transition-opacity group-hover/featured:opacity-90"
            />
          ) : (
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <ImageOffIcon aria-hidden="true" className="size-5" />
              <span className="text-xs">No picture yet</span>
            </span>
          )}
        </div>
      </Link>

      <div className="flex min-w-0 flex-col items-start gap-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {soldOut ? <Badge variant="secondary">Sold out</Badge> : null}
          {labels.map(label => (
            <Badge key={label} variant="outline">
              {label}
            </Badge>
          ))}
          <Badge variant="outline">{FULFILMENT_LABELS[product.fulfilment]}</Badge>
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <h3 className="text-2xl font-semibold tracking-tight text-balance">
            <Link
              href={productHref(product.slug)}
              className="rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {product.title}
            </Link>
          </h3>
          {product.subtitle ? <p className="text-sm text-muted-foreground">{product.subtitle}</p> : null}
          {product.description ? (
            <p className={cn('text-base text-pretty text-muted-foreground', READING_CLASS)}>{product.description}</p>
          ) : null}
        </div>
        {price ? <p className="text-lg tabular-nums">{price}</p> : null}
        <Button nativeButton={false} render={<Link href={productHref(product.slug)} />}>
          See this piece
          <ArrowRightIcon aria-hidden="true" data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}

/** The artist's own groupings, each with its cover and its first line. */
export function CollectionStrip({
  collections,
  className,
}: {
  collections: StoreCollection[];
  className?: string;
}) {
  if (collections.length === 0) return null;

  return (
    <ul className={cn('grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3', className)}>
      {collections.map(collection => {
        const cover = collection.cover ?? null;
        const image = cover?.kind === 'video' ? cover.poster : (cover?.src ?? null);
        return (
          <li key={collection.slug} className="min-w-0">
            <Link
              href={collectionHref(collection.slug)}
              className="group/collection flex min-w-0 flex-col gap-3 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <div className={cn('relative aspect-video w-full overflow-hidden rounded-lg', MEDIA_FRAME_CLASS)}>
                {image ? (
                  <Image
                    src={image}
                    alt=""
                    fill
                    sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw"
                    className="object-cover transition-opacity group-hover/collection:opacity-90"
                  />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    <ImageOffIcon aria-hidden="true" className="size-5" />
                  </span>
                )}
              </div>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-sm font-medium underline-offset-4 group-hover/collection:underline">
                  {collection.name}
                </span>
                {collection.description ? (
                  <span className="line-clamp-2 text-xs text-pretty text-muted-foreground">
                    {collection.description}
                  </span>
                ) : null}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
