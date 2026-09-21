import { CheckIcon, PackageIcon, TruckIcon } from 'lucide-react';

import { FactsTable } from '@/components/raisonne/shell/facts';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatMoney } from '@/lib/money';
import type { Fact, Product, ShippingMethod } from '@/lib/types';
import { cn } from '@/lib/utils';

import { FULFILMENT_LABELS, FULFILMENT_NOTES, editionLabels, shippingSummary, stockState } from './lib';

/**
 * Everything about a product that is not a picture or a button: what it is
 * made of, what the edition is, what each size costs, and how it reaches the
 * buyer.
 *
 * A field the artist left empty is left out. A shop that prints "Materials:
 * unknown" is telling a buyer nothing twice.
 */

/** The labelled rows: the artist's own specs first, then what the record knows. */
export function ProductSpecs({ product, className }: { product: Product; className?: string }) {
  const facts: Fact[] = [
    ...(product.specs ?? []).filter(spec => spec.label && spec.value),
    ...(product.materials ? [{ label: 'Materials', value: product.materials }] : []),
    ...(typeof product.year === 'number' ? [{ label: 'Year', value: String(product.year) }] : []),
    { label: 'Fulfilment', value: FULFILMENT_LABELS[product.fulfilment] },
    ...(product.leadTime ? [{ label: 'Lead time', value: product.leadTime }] : []),
  ];

  if (facts.length === 0) return null;
  return <FactsTable facts={facts} className={className} />;
}

/** The edition, in the labels a print buyer looks for. */
export function EditionLabels({ product, className }: { product: Product; className?: string }) {
  const labels = editionLabels(product);
  if (labels.length === 0) return null;

  return (
    <ul className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {labels.map(label => (
        <li key={label}>
          <Badge variant="outline">{label}</Badge>
        </li>
      ))}
    </ul>
  );
}

export function ProductHighlights({ highlights, className }: { highlights: string[]; className?: string }) {
  if (highlights.length === 0) return null;

  return (
    <ul className={cn('flex flex-col gap-2', className)}>
      {highlights.map(highlight => (
        <li key={highlight} className="flex items-start gap-2 text-sm text-pretty">
          <CheckIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span>{highlight}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Every size and what it costs, with its stock. A print sold in two sizes
 * and two frames is four rows, and a buyer should be able to compare them
 * without opening four menus.
 */
export function VariantTable({ product, className }: { product: Product; className?: string }) {
  if (product.variants.length < 2) return null;
  const hasDimensions = product.variants.some(variant => variant.dimensions);

  return (
    <Table className={className}>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Option</TableHead>
          {hasDimensions ? <TableHead>Size</TableHead> : null}
          <TableHead className="text-right">Price</TableHead>
          <TableHead className="text-right">Stock</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {product.variants.map(variant => {
          const stock = stockState(variant);
          return (
            <TableRow key={variant.id} className="hover:bg-transparent">
              <TableCell className="align-top text-pretty whitespace-normal">{variant.name}</TableCell>
              {hasDimensions ? (
                <TableCell className="align-top text-muted-foreground tabular-nums whitespace-normal">
                  {variant.dimensions
                    ? `${variant.dimensions.length} x ${variant.dimensions.width} x ${variant.dimensions.height} mm`
                    : null}
                </TableCell>
              ) : null}
              <TableCell className="text-right align-top tabular-nums">{formatMoney(variant.price)}</TableCell>
              <TableCell className="text-right align-top text-muted-foreground">
                {stock.label ?? 'Made to order'}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

/**
 * How it gets there: what the artist wrote about this product, what its
 * fulfilment means, and what the install charges to send it.
 */
export function ProductShipping({
  product,
  methods,
  className,
}: {
  product: Product;
  methods: ShippingMethod[];
  className?: string;
}) {
  const note = product.shippingNote;

  return (
    <div className={cn('flex flex-col gap-3 text-sm', className)}>
      <p className="flex items-start gap-2 text-pretty text-muted-foreground">
        <PackageIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>{FULFILMENT_NOTES[product.fulfilment]}</span>
      </p>
      {note ? (
        <p className="flex items-start gap-2 text-pretty text-muted-foreground">
          <TruckIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{note}</span>
        </p>
      ) : null}
      {methods.length > 0 ? (
        <ul className="flex flex-col gap-1 text-muted-foreground">
          {methods.map(method => (
            <li key={method.id} className="flex flex-wrap justify-between gap-x-4 tabular-nums">
              <span>{method.name}</span>
              <span>{shippingSummary(method)}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Postage is worked out at checkout, from where it is going and what is in the basket.
      </p>
    </div>
  );
}
