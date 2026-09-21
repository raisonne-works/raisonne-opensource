'use client';

import Link from 'next/link';
import { type FormEvent, useCallback, useEffect, useId, useMemo, useState, useSyncExternalStore } from 'react';
import { ArrowLeftIcon, LockIcon, ShoppingBagIcon, TriangleAlertIcon } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { formatMoney, formatMoneyOrFree } from '@/lib/money';
import { CART_STORAGE_KEY, parseCart, serializeCart } from '@/lib/store/cart';
import {
  CHECKOUT_HONEYPOT_FIELD,
  type CheckoutErrors,
  NOTE_MAX_LENGTH,
  SAVED_ADDRESS_KEY,
  emptyAddress,
  hasErrors,
  parseStoredAddress,
  validateContact,
} from '@/lib/store/checkout';
import type { CartLine, CartTotals, PostalAddress, ShippingMethod } from '@/lib/types';
import { cn } from '@/lib/utils';

import { CART_PATH, SHOP_PATH } from '@/components/raisonne/store/lib';

import { StoreSetupNotice } from '@/components/raisonne/store/setup-panel';

import { AddressFields } from './address-fields';
import { SummaryLines, SummaryTotals, TAX_NOTE, linesFromTotals } from './order-summary';

/**
 * Checkout.
 *
 * The cart lives in the browser, so this has to be a client component, and
 * that is exactly why it never works out a price. It sends the server slugs,
 * variant ids and quantities and renders the figures that come back; the
 * same call on the same data produces the amount the payment provider is
 * given. A visitor who edits their own local storage can order the wrong
 * thing, never at the wrong price.
 *
 * Everything the page can be is drawn: still reading the cart, an empty
 * cart, a cart with a line that has sold out since, a quote that would not
 * load, an install with no payment keys, and a payment the buyer came back
 * from without finishing.
 */

interface Quote {
  totals: CartTotals;
  options: ShippingMethod[];
  shippingMethodId: string | null;
  payable: boolean;
  configured: boolean;
}

const QUOTE_FAILED = 'The basket could not be priced just now. Reload the page to try again.';

const NO_ADDRESS = emptyAddress();

/**
 * Local storage, read the way React wants an external store read.
 *
 * The server snapshot is null, which is how this component knows it has not
 * hydrated yet and draws the skeleton rather than an empty basket. After
 * hydration the raw string is the snapshot, so a cart changed in another tab
 * (or by the cart panel on this page) re-renders the checkout instead of
 * quietly pricing something that is no longer in the basket.
 */
function subscribeToStorage(onChange: () => void): () => void {
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
}

function readStorage(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? '';
  } catch {
    // Private windows and blocked storage both throw. Empty is the honest
    // answer, and the page says the basket is empty rather than breaking.
    return '';
  }
}

const readCartRaw = () => readStorage(CART_STORAGE_KEY);
const readSavedAddressRaw = () => readStorage(SAVED_ADDRESS_KEY);
const noSnapshot = () => null;

export function CheckoutFlow({
  storeHref = SHOP_PATH,
  /** True when the provider's keys are test keys, so the page can say so. */
  testMode = false,
  /** The buyer came back from the payment page without paying. */
  cancelled = false,
  /** Shown so a signed-in collector knows the order will appear on their own page. */
  signedIn = false,
  /**
   * False when this install has no payment keys. The basket is still priced
   * and still shown: the page used to drop it entirely and say "nothing in
   * the basket is lost" while showing none of it, which is a claim instead
   * of a proof. Only the pay button changes.
   */
  configured = true,
  /** Where "write to the studio" goes when nothing can be paid for. */
  studioHref = null,
  className,
}: {
  storeHref?: string;
  testMode?: boolean;
  cancelled?: boolean;
  signedIn?: boolean;
  configured?: boolean;
  studioHref?: string | null;
  className?: string;
}) {
  const formId = useId();

  // The basket, straight from the store it lives in. Null until hydration.
  const cartRaw = useSyncExternalStore(subscribeToStorage, readCartRaw, noSnapshot);
  const lines = useMemo<CartLine[]>(() => (cartRaw === null ? [] : parseCart(cartRaw)), [cartRaw]);
  const hydrated = cartRaw !== null;

  /**
   * The last answer from the server, tagged with the question it answers.
   * Keeping the key next to the quote means "are we waiting" is derived
   * rather than a second flag that can get out of step with it, and the
   * previous total stays on screen while a new one is worked out instead of
   * flashing empty every time a character lands in the postcode field.
   */
  const [priced, setPriced] = useState<{ key: string; quote: Quote | null; error: string | null } | null>(null);

  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [shippingMethodId, setShippingMethodId] = useState<string | null>(null);
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /**
   * The address the buyer is filling in.
   *
   * `edited` is null until they touch a field, so the address shown is
   * whatever the browser remembered from their last order. That is what
   * "saved addresses" means in an install with no customer database: it
   * never left their machine.
   */
  const [edited, setEdited] = useState<PostalAddress | null>(null);
  const savedRaw = useSyncExternalStore(subscribeToStorage, readSavedAddressRaw, noSnapshot);
  const saved = useMemo(() => parseStoredAddress(savedRaw), [savedRaw]);
  const address = edited ?? saved ?? NO_ADDRESS;
  const usedSavedAddress = edited === null && saved !== null;

  const country = address.country;
  /** Everything the price depends on, as one value the effect can compare. */
  const quoteKey = `${serializeCart(lines)}|${country}|${shippingMethodId ?? ''}`;
  const quote = priced?.quote ?? null;
  const quoteError = priced?.error ?? null;
  const pricing = hydrated && lines.length > 0 && priced?.key !== quoteKey;

  // Re-price whenever the basket, the destination or the chosen method
  // changes. The abort controller means a slow answer for an old country
  // cannot land after a fast answer for the new one.
  useEffect(() => {
    if (!hydrated || lines.length === 0) return;
    const controller = new AbortController();

    fetch('/api/checkout/quote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lines, shippingMethodId, country }),
      signal: controller.signal,
    })
      .then(async response => {
        if (!response.ok) throw new Error(String(response.status));
        return (await response.json()) as Quote;
      })
      .then(data => {
        setPriced({ key: quoteKey, quote: data, error: null });
        // The server picks the cheapest method that serves the address when
        // the buyer has not chosen one, or when the one they chose does not
        // serve the country they have just typed. Adopting it here keeps the
        // radio group and the total showing the same thing: without it, a
        // buyer switching country reads a total for a method the radios no
        // longer offer.
        const stillOffered = shippingMethodId !== null && data.options.some(option => option.id === shippingMethodId);
        if (!stillOffered && data.shippingMethodId !== shippingMethodId) setShippingMethodId(data.shippingMethodId);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setPriced(current => ({ key: quoteKey, quote: current?.quote ?? null, error: QUOTE_FAILED }));
      });

    return () => controller.abort();
  }, [quoteKey, lines, country, shippingMethodId, hydrated]);

  const submit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (submitting || !quote?.payable) return;

      const found = validateContact(email, address);
      setErrors(found);
      if (hasErrors(found)) {
        setFailure('Check the fields marked below.');
        return;
      }

      setFailure(null);
      setSubmitting(true);

      try {
        const trap = new FormData(event.currentTarget).get(CHECKOUT_HONEYPOT_FIELD);
        const response = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            lines,
            email,
            shippingAddress: address,
            shippingMethodId,
            note,
            [CHECKOUT_HONEYPOT_FIELD]: trap ?? '',
          }),
        });
        const data = (await response.json().catch(() => null)) as
          | { url?: string; error?: string; errors?: CheckoutErrors }
          | null;

        if (!response.ok || !data?.url) {
          setErrors(data?.errors ?? {});
          setFailure(data?.error ?? 'The order could not be placed. Nothing has been charged.');
          setSubmitting(false);
          return;
        }

        // Remembered on this device only, so the next order does not start
        // from an empty form. The cart is deliberately left alone: the
        // payment has not happened yet, and a buyer who comes back should
        // find their basket where they left it.
        try {
          window.localStorage.setItem(SAVED_ADDRESS_KEY, JSON.stringify(address));
        } catch {
          // Nothing to remember it with. Not worth stopping a payment for.
        }

        window.location.assign(data.url);
      } catch {
        setFailure('The order could not be placed. Nothing has been charged.');
        setSubmitting(false);
      }
    },
    [address, email, lines, note, submitting, quote?.payable, shippingMethodId],
  );

  if (!hydrated) return <CheckoutSkeleton className={className} />;

  if (lines.length === 0) {
    return (
      <Empty className={className}>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ShoppingBagIcon aria-hidden />
          </EmptyMedia>
          <EmptyTitle>Nothing in the basket</EmptyTitle>
          <EmptyDescription>Add something from the shop and it will show up here.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" nativeButton={false} render={<Link href={storeHref} />}>
            <ArrowLeftIcon aria-hidden data-icon="inline-start" />
            Back to the shop
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  const totals = quote?.totals ?? null;
  const method = quote?.options.find(entry => entry.id === shippingMethodId) ?? null;
  const problems = totals?.problems ?? [];
  const busy = submitting;

  // No payment keys: everything that is true is still shown, and the reason
  // sits where the pay button would be rather than in a panel further up the
  // page. There is no contact or address form, because filling one in would
  // lead nowhere.
  if (!configured) {
    return (
      <div className={cn('mx-auto flex w-full max-w-[42rem] flex-col gap-6', className)}>
        <Card>
          <CardHeader>
            <CardTitle>Your order</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {totals ? <SummaryLines lines={linesFromTotals(totals)} /> : <Skeleton className="h-24 w-full" />}
            <div aria-live="polite" aria-busy={pricing}>
              {totals ? (
                <SummaryTotals
                  subtotal={totals.subtotal}
                  shipping={totals.shipping}
                  total={totals.total}
                  shippingLabel={method?.name ?? null}
                  note={TAX_NOTE}
                />
              ) : (
                <Skeleton className="h-20 w-full" />
              )}
            </div>

            <StoreSetupNotice />

            <div className="flex flex-wrap gap-2">
              {studioHref ? (
                <Button variant="outline" nativeButton={false} render={<Link href={studioHref} />}>
                  Write to the studio
                </Button>
              ) : null}
              <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={CART_PATH} />}>
                <ArrowLeftIcon aria-hidden data-icon="inline-start" />
                Change the basket
              </Button>
              <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={storeHref} />}>
                Keep looking
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <form id={formId} onSubmit={submit} noValidate className={cn('grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem]', className)}>
      <div className="flex min-w-0 flex-col gap-8">
        {cancelled ? (
          <Alert>
            <TriangleAlertIcon aria-hidden />
            <AlertTitle>The payment was not finished</AlertTitle>
            <AlertDescription>
              Nothing has been charged and your basket is as you left it. You can try again below.
            </AlertDescription>
          </Alert>
        ) : null}

        {testMode ? (
          <Alert>
            <LockIcon aria-hidden />
            <AlertTitle>This shop is in test mode</AlertTitle>
            <AlertDescription>
              The payment provider is using test keys. No card will be charged and no order will be fulfilled.
            </AlertDescription>
          </Alert>
        ) : null}

        {problems.length > 0 ? (
          <Alert variant="destructive">
            <TriangleAlertIcon aria-hidden />
            <AlertTitle>Something in the basket has changed</AlertTitle>
            <AlertDescription>
              <ul className="flex list-disc flex-col gap-1 pl-4">
                {problems.map(problem => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}

        <section className="flex flex-col gap-4" aria-labelledby={`${formId}-contact`}>
          <h2 id={`${formId}-contact`} className="text-lg font-semibold tracking-tight">
            Contact
          </h2>
          <Field className="max-w-[28rem]">
            <FieldLabel htmlFor={`${formId}-email`}>Email address</FieldLabel>
            <Input
              id={`${formId}-email`}
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              aria-invalid={errors.email ? true : undefined}
              disabled={busy}
              required
            />
            <FieldError>{errors.email}</FieldError>
            <FieldDescription>
              {signedIn
                ? 'Where the studio writes about this order. It will also appear on your orders page.'
                : 'Where the studio writes about this order. Keep the order number you are given: it is how you find the order again.'}
            </FieldDescription>
          </Field>
        </section>

        <section className="flex flex-col gap-4" aria-labelledby={`${formId}-shipping`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id={`${formId}-shipping`} className="text-lg font-semibold tracking-tight">
              Where it goes
            </h2>
            {usedSavedAddress ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEdited(emptyAddress());
                  try {
                    window.localStorage.removeItem(SAVED_ADDRESS_KEY);
                  } catch {
                    // Already gone.
                  }
                }}
              >
                Use a different address
              </Button>
            ) : null}
          </div>
          {usedSavedAddress ? (
            <p className="text-sm text-muted-foreground">
              Filled in from the last order placed in this browser. It is kept on this device and nowhere else.
            </p>
          ) : null}
          <div className="max-w-[36rem]">
            <AddressFields address={address} onChange={setEdited} errors={errors} idPrefix={`${formId}-addr`} disabled={busy} />
          </div>
        </section>

        <section className="flex flex-col gap-4" aria-labelledby={`${formId}-method`}>
          <h2 id={`${formId}-method`} className="text-lg font-semibold tracking-tight">
            How it is sent
          </h2>
          <ShippingChoices
            name={`${formId}-method-choice`}
            options={quote?.options ?? []}
            value={shippingMethodId}
            onChange={setShippingMethodId}
            country={address.country}
            disabled={busy}
          />
        </section>

        <section className="flex max-w-[36rem] flex-col gap-4" aria-labelledby={`${formId}-note`}>
          <h2 id={`${formId}-note`} className="text-lg font-semibold tracking-tight">
            Anything the studio should know
          </h2>
          <Field>
            <FieldLabel htmlFor={`${formId}-note-field`} className="sr-only">
              A note with the order
            </FieldLabel>
            <Textarea
              id={`${formId}-note-field`}
              value={note}
              maxLength={NOTE_MAX_LENGTH}
              rows={3}
              onChange={event => setNote(event.target.value)}
              disabled={busy}
              placeholder="A dedication, a delivery instruction, a date it is needed by."
            />
            <FieldDescription>Optional. {NOTE_MAX_LENGTH - note.length} characters left.</FieldDescription>
          </Field>
        </section>

        {/* Honeypot: off screen, not announced, never filled by a person. */}
        <div aria-hidden className="sr-only">
          <label htmlFor={`${formId}-trap`}>Company</label>
          <input id={`${formId}-trap`} name={CHECKOUT_HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
        </div>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle>Your order</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {totals ? <SummaryLines lines={linesFromTotals(totals)} /> : <Skeleton className="h-24 w-full" />}

            <div aria-live="polite" aria-busy={pricing}>
              {totals ? (
                <SummaryTotals
                  subtotal={totals.subtotal}
                  shipping={totals.shipping}
                  total={totals.total}
                  shippingLabel={method?.name ?? null}
                  note={TAX_NOTE}
                />
              ) : (
                <Skeleton className="h-20 w-full" />
              )}
            </div>

            {quoteError ? (
              <Alert variant="destructive">
                <TriangleAlertIcon aria-hidden />
                <AlertTitle>The basket could not be priced</AlertTitle>
                <AlertDescription>{quoteError}</AlertDescription>
              </Alert>
            ) : null}

            {failure ? (
              <Alert variant="destructive">
                <TriangleAlertIcon aria-hidden />
                <AlertTitle>The order was not placed</AlertTitle>
                <AlertDescription>{failure}</AlertDescription>
              </Alert>
            ) : null}

            <Button type="submit" size="lg" disabled={busy || pricing || !quote?.payable} className="w-full">
              {busy ? <Spinner aria-hidden data-icon="inline-start" /> : <LockIcon aria-hidden data-icon="inline-start" />}
              {busy ? 'Opening the payment page' : totals ? `Pay ${formatMoney(totals.total)}` : 'Pay'}
            </Button>

            <p className="text-xs text-pretty text-muted-foreground">
              Payment is taken on the provider&rsquo;s own page. This site never sees a card number.
            </p>

            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={CART_PATH} />}>
                <ArrowLeftIcon aria-hidden data-icon="inline-start" />
                Change the basket
              </Button>
              <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={storeHref} />}>
                Keep looking
              </Button>
            </div>
          </CardContent>
        </Card>
      </aside>
    </form>
  );
}

/**
 * The shipping methods this basket can use, as one radio group.
 *
 * A native radio group rather than a component: it is one of the few places
 * where the browser's own behaviour, including arrow keys and the way a
 * screen reader reads "2 of 3", is better than anything worth building.
 */
function ShippingChoices({
  name,
  options,
  value,
  onChange,
  country,
  disabled,
}: {
  name: string;
  options: readonly ShippingMethod[];
  value: string | null;
  onChange: (id: string) => void;
  country: string;
  disabled: boolean;
}) {
  if (!country) {
    return <p className="text-sm text-muted-foreground">Choose a country and the ways to send it will appear here.</p>;
  }

  if (options.length === 0) {
    return (
      <Alert variant="destructive">
        <TriangleAlertIcon aria-hidden />
        <AlertTitle>Nothing can be sent to this country</AlertTitle>
        <AlertDescription>
          The studio has no shipping method that serves it, or the basket is too heavy for the ones it has. Write to the
          studio and they will work something out.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div role="radiogroup" aria-label="Shipping method" className="flex max-w-[36rem] flex-col gap-2">
      {options.map(method => {
        const days = method.estimatedDays;
        const when =
          days?.min && days.max
            ? `${days.min} to ${days.max} working days`
            : days?.max
              ? `up to ${days.max} working days`
              : null;

        return (
          <label
            key={method.id}
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors',
              value === method.id ? 'bg-muted' : 'hover:bg-muted/50',
              disabled && 'cursor-not-allowed opacity-60',
            )}
          >
            <input
              type="radio"
              name={name}
              value={method.id}
              checked={value === method.id}
              onChange={() => onChange(method.id)}
              disabled={disabled}
              className="mt-1 size-4 accent-primary"
            />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-sm font-medium">{method.name}</span>
              {method.description ? <span className="text-xs text-muted-foreground">{method.description}</span> : null}
              {when ? <span className="text-xs text-muted-foreground">{when}</span> : null}
            </span>
            <span className="shrink-0 text-sm tabular-nums">{formatMoneyOrFree(method.price)}</span>
          </label>
        );
      })}
    </div>
  );
}

function CheckoutSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem]', className)}>
      <div className="flex flex-col gap-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-9 w-full max-w-[28rem]" />
        <Skeleton className="h-6 w-40" />
        <div className="flex max-w-[36rem] flex-col gap-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
      <Skeleton className="h-80 w-full" />
    </div>
  );
}

export { CheckoutSkeleton };
