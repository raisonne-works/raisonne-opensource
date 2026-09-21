'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useId } from 'react';
import { MinusIcon, PlusIcon, ShoppingBagIcon, TriangleAlertIcon, XIcon } from 'lucide-react';

import { EMPTY_BLOCK_CLASS } from '@/components/raisonne/shell/measure';
import { MEDIA_FRAME_CLASS } from '@/components/raisonne/works/lib';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMoney, formatMoneyOrFree } from '@/lib/money';
import { MAX_LINE_QUANTITY, lineKey } from '@/lib/store/cart';
import type { CartTotals } from '@/lib/types';
import { cn } from '@/lib/utils';

import type { CartPricing } from './cart-api';
import { removeFromCart, setCartQuantity, useCart, useShippingChoice } from './cart-store';
import { useCartPricing } from './cart-pricing';
import { CART_PATH, CHECKOUT_PATH, SHOP_PATH, productHref, shippingSummary } from './lib';
import { StoreSetupNotice } from './setup-panel';

/**
 * The cart, in the two places it is shown: the panel that slides in from the
 * header, and the page at /cart. Both render this, so they cannot say
 * different things about the same basket.
 *
 * Every figure on screen comes from the server (see cart-pricing.ts). The
 * browser holds ids and quantities and nothing else, so the worst a tampered
 * cart can do is ask for a product that is not for sale, which comes back
 * with the reason printed against that line.
 */
export function CartContents({
  variant = 'page',
  onNavigate,
  className,
}: {
  variant?: 'page' | 'panel';
  /** Called when a link inside the cart is followed, so the panel can close. */
  onNavigate?: () => void;
  className?: string;
}) {
  const { lines, ready } = useCart();
  const { shippingMethodId, setShippingMethodId } = useShippingChoice();
  const { pricing, status, message, retry } = useCartPricing(lines, shippingMethodId);

  // The panel has no padding of its own, so anything that replaces the list
  // brings its own gutter.
  const panel = variant === 'panel';

  if (!ready) return <CartSkeleton variant={variant} className={className} />;
  if (lines.length === 0) {
    return <CartEmpty onNavigate={onNavigate} className={cn(panel && 'mx-4 w-auto', className)} />;
  }

  if (status === 'error') {
    return (
      <div className={cn('flex flex-col gap-4', panel && 'px-4', className)}>
        <Alert variant="destructive">
          <TriangleAlertIcon aria-hidden="true" />
          <AlertTitle>The cart could not be priced</AlertTitle>
          <AlertDescription>
            <p>{message}</p>
            <p>
              Nothing has been lost: your basket still holds{' '}
              {lines.length === 1 ? 'one line' : `${lines.length} lines`}.
            </p>
          </AlertDescription>
        </Alert>
        <div>
          <Button onClick={retry}>Try again</Button>
        </div>
      </div>
    );
  }

  if (!pricing) return <CartSkeleton variant={variant} className={className} />;

  const updating = status === 'loading';

  const lineList = (
    <CartLineList totals={pricing.totals} updating={updating} onNavigate={onNavigate} />
  );

  const summary = (
    <CartSummary
      pricing={pricing}
      updating={updating}
      onShippingChange={setShippingMethodId}
      onNavigate={onNavigate}
      variant={variant}
    />
  );

  if (variant === 'panel') {
    return (
      <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{lineList}</div>
        <div className="border-t px-4 py-4">{summary}</div>
      </div>
    );
  }

  return (
    <div className={cn('grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-12', className)}>
      {lineList}
      <div className="lg:sticky lg:top-20 lg:rounded-lg lg:border lg:p-5">{summary}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The lines
// ---------------------------------------------------------------------------

function CartLineList({
  totals,
  updating,
  onNavigate,
}: {
  totals: CartTotals;
  updating: boolean;
  onNavigate?: () => void;
}) {
  return (
    <ul className={cn('flex flex-col divide-y', updating && 'opacity-70')} aria-busy={updating || undefined}>
      {totals.lines.map(entry => {
        const key = lineKey(entry.line);
        const image = entry.image?.kind === 'video' ? entry.image.poster : (entry.image?.src ?? null);
        const gone = Boolean(entry.problem);

        return (
          <li key={key} className="flex gap-4 py-4 first:pt-0">
            <div className={cn('relative size-20 shrink-0 overflow-hidden rounded-md', MEDIA_FRAME_CLASS)}>
              {image ? (
                <Image src={image} alt="" fill sizes="80px" className="object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center text-muted-foreground">
                  <ShoppingBagIcon aria-hidden="true" className="size-4" />
                </span>
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <Link
                    href={productHref(entry.line.productSlug)}
                    onClick={onNavigate}
                    className="rounded-sm text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {entry.title}
                  </Link>
                  {entry.variantName ? (
                    <span className="text-xs text-muted-foreground">{entry.variantName}</span>
                  ) : null}
                  {entry.line.workId ? (
                    <span className="font-mono text-xs text-muted-foreground">From your work {entry.line.workId}</span>
                  ) : null}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Take ${entry.title} out of the cart`}
                  onClick={() => removeFromCart(entry.line)}
                >
                  <XIcon aria-hidden="true" />
                </Button>
              </div>

              {/* A price struck through says "this one, but not now" where a
                  blank money column said "this row is broken". The long
                  sentence lives in the alert beside the total; the row gets
                  the two or three words that are not already in its heading. */}
              <p className="flex flex-wrap items-baseline gap-x-2 text-xs tabular-nums">
                <span className={cn('text-muted-foreground', gone && 'line-through')}>
                  {formatMoney(entry.unitPrice)} each
                </span>
                {gone ? <span className="font-medium text-destructive">{entry.problemShort ?? 'Cannot be ordered'}</span> : null}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <QuantityStepper
                  label={entry.title}
                  quantity={entry.line.quantity}
                  // Adding more of something that cannot be had is an
                  // invitation to waste a click. The only useful move on a
                  // short line is downwards, to what is actually there.
                  max={gone ? (entry.available ?? 0) : MAX_LINE_QUANTITY}
                  onChange={quantity => setCartQuantity(entry.line, quantity)}
                />
                <span className={cn('text-sm tabular-nums', gone && 'text-muted-foreground line-through')}>
                  {formatMoney(gone ? entry.unitPrice : entry.lineTotal)}
                </span>
              </div>

              {gone && (entry.available ?? 0) > 0 ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  onClick={() => setCartQuantity(entry.line, entry.available as number)}
                >
                  Take {entry.available}, which is what is left
                </Button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function QuantityStepper({
  label,
  quantity,
  max = MAX_LINE_QUANTITY,
  onChange,
}: {
  label: string;
  quantity: number;
  /** The most this line may hold: the cart's own cap, or what is in stock. */
  max?: number;
  onChange: (quantity: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        aria-label={`One fewer ${label}`}
        onClick={() => onChange(quantity - 1)}
      >
        <MinusIcon aria-hidden="true" />
      </Button>
      <span className="w-8 text-center text-sm tabular-nums" aria-label={`Quantity, ${quantity}`}>
        {quantity}
      </span>
      <Button
        variant="outline"
        size="icon"
        aria-label={`One more ${label}`}
        disabled={quantity >= max}
        onClick={() => onChange(quantity + 1)}
      >
        <PlusIcon aria-hidden="true" />
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The totals
// ---------------------------------------------------------------------------

function CartSummary({
  pricing,
  updating,
  onShippingChange,
  onNavigate,
  variant,
}: {
  pricing: CartPricing;
  updating: boolean;
  onShippingChange: (id: string | null) => void;
  onNavigate?: () => void;
  variant: 'page' | 'panel';
}) {
  // The panel and the cart page can both be on screen at once, so the label
  // and its control are tied together by a generated id rather than a name.
  const shippingId = useId();
  const blockedId = useId();
  const { totals, methods, unavailableMethods, shippingMethodId, payable, paymentsConfigured } = pricing;
  const unavailable = unavailableMethods ?? [];
  const shippingItems = methods.map(method => ({ value: method.id, label: method.name }));
  const chosen = methods.find(method => method.id === shippingMethodId) ?? null;
  const canCheckout = payable && paymentsConfigured;

  return (
    <div className="flex flex-col gap-4" aria-busy={updating || undefined}>
      {totals.problems.length > 0 ? (
        <Alert variant="destructive">
          <TriangleAlertIcon aria-hidden="true" />
          {/* Only the heading carries the destructive colour. Four
              consecutive red paragraphs read as four alarms rather than one
              alarm and its explanation. */}
          <AlertTitle>Some lines cannot be ordered</AlertTitle>
          <AlertDescription className="text-foreground">
            <ul className="flex list-disc flex-col gap-1 pl-5">
              {totals.problems.map(problem => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
            <p className="text-muted-foreground">They are not counted in the total. Change or remove them to carry on.</p>
          </AlertDescription>
        </Alert>
      ) : null}

      {methods.length > 0 ? (
        <Field>
          <FieldLabel htmlFor={shippingId}>Postage</FieldLabel>
          <Select
            items={shippingItems}
            value={shippingMethodId ?? ''}
            onValueChange={value => onShippingChange(typeof value === 'string' && value ? value : null)}
          >
            <SelectTrigger id={shippingId} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {methods.map(method => (
                  <SelectItem key={method.id} value={method.id}>
                    {method.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldDescription>
            {chosen ? shippingSummary(chosen) : 'Worked out again at checkout, from the delivery address.'}
          </FieldDescription>
          {/* A method that was ruled out is listed with the reason rather
              than removed, so a preselected price is visibly the only one
              left rather than an expensive choice with no account of
              itself. */}
          {unavailable.length > 0 ? (
            <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
              {unavailable.map(method => (
                <li key={method.id} className="flex flex-wrap items-baseline gap-x-2">
                  <span className="line-through">
                    {method.name}, {formatMoney(method.price)}
                  </span>
                  <span>{method.reason}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </Field>
      ) : null}

      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="tabular-nums">{formatMoney(totals.subtotal)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-muted-foreground">Postage</dt>
          <dd className="tabular-nums">{formatMoneyOrFree(totals.shipping)}</dd>
        </div>
        <Separator />
        <div className="flex items-baseline justify-between gap-4 text-base font-medium">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatMoney(totals.total)}</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-2">
        {/* The reason sits where the action was.
            A permanently disabled primary button explains nothing, fails
            contrast in light mode, and in dark mode makes the dead control
            the brightest thing on the card. So an install that cannot take a
            payment gets the notice in the button's own slot, and a basket
            that has something wrong with it gets one sentence under a button
            that says, out loud, that it is not available. */}
        {!paymentsConfigured ? (
          <StoreSetupNotice />
        ) : canCheckout ? (
          <Button nativeButton={false} render={<Link href={CHECKOUT_PATH} onClick={onNavigate} />}>
            Go to checkout
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              aria-disabled="true"
              aria-describedby={blockedId}
              onClick={event => event.preventDefault()}
            >
              Go to checkout
            </Button>
            <p id={blockedId} className="text-xs text-muted-foreground">
              {totals.problems.length > 0
                ? 'Change or remove the lines above and this opens.'
                : 'There is nothing in the basket to pay for yet.'}
            </p>
          </>
        )}
        {variant === 'panel' ? (
          <Button variant="outline" nativeButton={false} render={<Link href={CART_PATH} onClick={onNavigate} />}>
            Open the cart
          </Button>
        ) : (
          <Button variant="outline" nativeButton={false} render={<Link href={SHOP_PATH} onClick={onNavigate} />}>
            Keep looking
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Prices are worked out by the site itself, not by your browser, and checked again before anything is paid.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Nothing in it, and nothing read yet
// ---------------------------------------------------------------------------

export function CartEmpty({ onNavigate, className }: { onNavigate?: () => void; className?: string }) {
  return (
    <Empty className={cn(EMPTY_BLOCK_CLASS, 'my-4', className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ShoppingBagIcon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>Your cart is empty</EmptyTitle>
        <EmptyDescription>
          Prints, books and objects from the studio are in the shop. What you put here stays between visits, in this
          browser.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" nativeButton={false} render={<Link href={SHOP_PATH} onClick={onNavigate} />}>
          Go to the shop
        </Button>
      </EmptyContent>
    </Empty>
  );
}

function CartSkeleton({ variant, className }: { variant: 'page' | 'panel'; className?: string }) {
  return (
    <div
      className={cn(
        variant === 'panel' ? 'flex flex-col gap-4 px-4' : 'grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]',
        className,
      )}
      aria-hidden="true"
    >
      <div className="flex flex-col gap-4">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="flex gap-4">
            <Skeleton className="size-20 shrink-0 rounded-md" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-8 w-28" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  );
}
