'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { MinusIcon, PlusIcon, ShoppingBagIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { formatMoney } from '@/lib/money';
import { MAX_LINE_QUANTITY, findVariant } from '@/lib/store/cart';
import type { Product } from '@/lib/types';
import { cn } from '@/lib/utils';

import { addToCart, openCart, useCart } from './cart-store';
import { CHECKOUT_PATH, defaultVariant, maxQuantityFor, stockState } from './lib';
import { StoreSetupNotice } from './setup-panel';

/**
 * Choosing a variant and putting it in the cart.
 *
 * What leaves this component is three strings and a number: the product
 * slug, the variant id, an optional work id and a quantity. The price beside
 * the button is read from the install's own data for display, and is never
 * sent anywhere: the server prices the cart again from the same data before
 * anything is shown as a total and before anything reaches a payment
 * provider.
 *
 * Stock is enforced here as a courtesy to the visitor, not as a guarantee:
 * the same check runs on the server, which is the one that counts.
 */
export function ProductBuy({
  product,
  paymentsConfigured,
  className,
}: {
  product: Product;
  /** False when the install has no payment keys: the cart still works, checkout does not. */
  paymentsConfigured: boolean;
  className?: string;
}) {
  const router = useRouter();
  const { lines } = useCart();
  const [variantId, setVariantId] = useState(() => defaultVariant(product)?.id ?? '');
  const [quantity, setQuantity] = useState(1);

  const variant = findVariant(product, variantId) ?? defaultVariant(product);
  const stock = stockState(variant);

  const inCart = useMemo(() => {
    if (!variant) return 0;
    return lines
      .filter(line => line.productSlug === product.slug && line.variantId === variant.id)
      .reduce((total, line) => total + line.quantity, 0);
  }, [lines, product.slug, variant]);

  const ceiling = maxQuantityFor(variant, MAX_LINE_QUANTITY);
  const room = Math.max(0, ceiling - inCart);
  const wanted = Math.min(Math.max(1, quantity), Math.max(1, room));
  const canAdd = stock.buyable && room > 0;

  const add = (): boolean => {
    if (!variant || !canAdd) return false;
    addToCart({ productSlug: product.slug, variantId: variant.id, quantity: wanted });
    return true;
  };

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      {product.variants.length > 1 ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">Choose one</legend>
          <ToggleGroup
            aria-label={`${product.title}, options`}
            variant="outline"
            value={variant ? [variant.id] : []}
            onValueChange={value => {
              const next = value[0];
              if (typeof next === 'string' && next.length > 0) {
                setVariantId(next);
                setQuantity(1);
              }
            }}
            className="flex-wrap"
          >
            {product.variants.map(option => {
              const optionStock = stockState(option);
              return (
                <ToggleGroupItem
                  key={option.id}
                  value={option.id}
                  disabled={!optionStock.buyable}
                  className="h-auto flex-col items-start gap-0.5 px-3 py-2"
                >
                  <span className="text-sm">{option.name}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {formatMoney(option.price)}
                    {optionStock.buyable ? '' : ', sold out'}
                  </span>
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>
        </fieldset>
      ) : null}

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="text-2xl tabular-nums">{variant ? formatMoney(variant.price) : 'Price on request'}</p>
        {variant?.compareAtPrice && variant.compareAtPrice.amount > variant.price.amount ? (
          <p className="text-sm tabular-nums text-muted-foreground line-through">
            {formatMoney(variant.compareAtPrice)}
          </p>
        ) : null}
        {stock.label ? (
          <Badge variant={stock.tone === 'out' ? 'secondary' : stock.tone === 'low' ? 'destructive' : 'outline'}>
            {stock.label}
          </Badge>
        ) : null}
      </div>

      {canAdd ? (
        <div className="flex flex-wrap items-end gap-3">
          <Field className="w-auto">
            <FieldLabel htmlFor={`quantity-${product.slug}`}>Quantity</FieldLabel>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                aria-label="One fewer"
                disabled={wanted <= 1}
                onClick={() => setQuantity(Math.max(1, wanted - 1))}
              >
                <MinusIcon aria-hidden="true" />
              </Button>
              <Input
                id={`quantity-${product.slug}`}
                type="number"
                inputMode="numeric"
                min={1}
                max={room}
                value={wanted}
                onChange={event => {
                  const next = Number.parseInt(event.target.value, 10);
                  setQuantity(Number.isFinite(next) ? Math.min(Math.max(1, next), room) : 1);
                }}
                className="w-16 text-center tabular-nums"
              />
              <Button
                variant="outline"
                size="icon"
                aria-label="One more"
                disabled={wanted >= room}
                onClick={() => setQuantity(Math.min(room, wanted + 1))}
              >
                <PlusIcon aria-hidden="true" />
              </Button>
            </div>
          </Field>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => {
                if (!add()) return;
                openCart();
                toast.success(`${product.title} is in your cart`);
              }}
            >
              <ShoppingBagIcon aria-hidden="true" data-icon="inline-start" />
              Add to the cart
            </Button>
            {paymentsConfigured ? (
              <Button
                variant="outline"
                onClick={() => {
                  if (!add()) return;
                  router.push(CHECKOUT_PATH);
                }}
              >
                Buy it now
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-2">
          <Button disabled>{stock.buyable ? 'The most you can order is in your cart' : 'Sold out'}</Button>
          {stock.buyable ? null : (
            <p className="text-sm text-muted-foreground">
              Nothing is taken for something that cannot be made. Ask about a commission instead, or come back for the
              next run.
            </p>
          )}
          {inCart > 0 ? (
            <Button variant="link" className="px-0" onClick={() => openCart()}>
              {inCart === 1 ? 'One is in your cart' : `${inCart} are in your cart`}
            </Button>
          ) : null}
        </div>
      )}

      {!paymentsConfigured ? <StoreSetupNotice /> : null}
    </div>
  );
}

/**
 * A product that is only made from a work the buyer already holds.
 *
 * Which wallet holds what is not something a prerendered shop page can
 * check, and a cart line cannot carry a choice nobody has made yet, so this
 * does not pretend otherwise: it says what is needed and hands over to the
 * commission flow, which signs the visitor in, reads their wallet and offers
 * the works they actually hold.
 *
 * With commissions switched off there is no such flow, so it falls back to
 * the studio's own address rather than a link that would 404.
 */
export function PhygitalOrder({
  title,
  seriesNames,
  requestHref,
  email,
  className,
}: {
  title: string;
  /** The series a buyer has to hold, in the artist's own names for them. */
  seriesNames: string[];
  /** The commission flow, when this install has one. */
  requestHref: string | null;
  /** The studio's address, for an install that takes these by email. */
  email: string | null;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-start gap-3 rounded-lg border p-4', className)}>
      <p className="text-sm font-medium">Made from a work you hold</p>
      <p className="text-sm text-pretty text-muted-foreground">
        {seriesNames.length > 0
          ? `This is made to order from a work you own in ${listNames(seriesNames)}. You pick the work, and the studio makes the object from it.`
          : 'This is made to order from a work you already own. You pick the work, and the studio makes the object from it.'}
      </p>
      {requestHref ? (
        <>
          <Button nativeButton={false} render={<Link href={requestHref} />}>
            Choose a work and ask for one
          </Button>
          <p className="text-xs text-muted-foreground">
            Sign in with your wallet on that page and the studio can see which works are yours. Pick the object made
            from a work you hold.
          </p>
        </>
      ) : email ? (
        <Button
          variant="outline"
          nativeButton={false}
          render={<a href={`mailto:${email}?subject=${encodeURIComponent(title)}`} />}
        >
          Write to the studio
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">
          This install has no way to take the request yet, so nothing is offered here that could not be honoured.
        </p>
      )}
    </div>
  );
}

function listNames(names: string[]): string {
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
