'use client';

import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { CheckIcon, PrinterIcon, SaveIcon, TriangleAlertIcon, XIcon } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { ORDER_STATUS_COPY } from '@/lib/store/order-view';
import type { Order, OrderStatus } from '@/lib/types';

/**
 * The two sets of buttons on an order page.
 *
 * The buyer's one: calling off an order nobody has been paid for. Once money
 * has moved, cancelling means refunding, and refunding is the artist's
 * decision, so there is no button that would pretend otherwise.
 *
 * The artist's one: move the status, record a tracking number, keep a note,
 * and try the printer. Which statuses are offered is worked out on the
 * server from the order store's own transition rules and handed down, so the
 * menu can never offer a change the server would refuse.
 */

const GENERIC = 'That did not go through. Try again in a moment.';

function useOrderPatch(orderId: string) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function patch(body: Record<string, unknown>, path = ''): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}${path}`, {
        method: path ? 'POST' : 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await response.json().catch(() => null)) as { error?: string; notes?: string[] } | null;
      if (!response.ok) {
        setError(data?.error ?? GENERIC);
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError(GENERIC);
      return false;
    } finally {
      setBusy(false);
    }
  }

  return { patch, busy, error, setError };
}

// ---------------------------------------------------------------------------
// The buyer
// ---------------------------------------------------------------------------

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const { patch, busy, error } = useOrderPatch(orderId);

  return (
    <div className="flex flex-col gap-2">
      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>
          <XIcon aria-hidden data-icon="inline-start" />
          Cancel this order
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
            <AlertDialogDescription>
              Nothing has been charged, so nothing will be refunded. The order is closed and you can place another
              whenever you like.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={() => void patch({ status: 'cancelled' })}>
              {busy ? <Spinner aria-hidden data-icon="inline-start" /> : null}
              Cancel the order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The artist
// ---------------------------------------------------------------------------

export function OwnerOrderControls({
  order,
  /** Statuses the order store will accept from here, computed on the server. */
  allowed,
  /** True when this order has anything that would be printed to order. */
  hasPodLines,
}: {
  order: Order;
  allowed: readonly OrderStatus[];
  hasPodLines: boolean;
}) {
  const id = useId();
  const { patch, busy, error } = useOrderPatch(order.id);

  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [carrier, setCarrier] = useState(order.fulfilment?.carrier ?? '');
  const [trackingNumber, setTrackingNumber] = useState(order.fulfilment?.trackingNumber ?? '');
  const [trackingUrl, setTrackingUrl] = useState(order.fulfilment?.trackingUrl ?? '');
  const [internalNote, setInternalNote] = useState(order.internalNote ?? '');
  const [dispatchNotes, setDispatchNotes] = useState<string[] | null>(null);
  const [saved, setSaved] = useState(false);

  const options = [order.status, ...allowed.filter(entry => entry !== order.status)].map(value => ({
    value,
    label: ORDER_STATUS_COPY[value].label,
  }));

  async function save() {
    setSaved(false);
    const ok = await patch({
      status,
      carrier: carrier.trim() || null,
      trackingNumber: trackingNumber.trim() || null,
      trackingUrl: trackingUrl.trim() || null,
      internalNote: internalNote.trim() || null,
    });
    setSaved(ok);
  }

  async function dispatch() {
    setDispatchNotes(null);
    setSaved(false);
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(order.id)}/dispatch`, { method: 'POST' });
      const data = (await response.json().catch(() => null)) as { notes?: string[]; error?: string } | null;
      setDispatchNotes(data?.notes ?? [data?.error ?? GENERIC]);
    } catch {
      setDispatchNotes([GENERIC]);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Field className="max-w-[20rem]">
        <FieldLabel htmlFor={`${id}-status`}>Status</FieldLabel>
        <Select items={options} value={status} onValueChange={value => setStatus(value as OrderStatus)}>
          <SelectTrigger id={`${id}-status`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {options.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <FieldDescription>{ORDER_STATUS_COPY[status].detail}</FieldDescription>
      </Field>

      <div className="grid max-w-[36rem] gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={`${id}-carrier`}>Carrier</FieldLabel>
          <Input id={`${id}-carrier`} value={carrier} onChange={event => setCarrier(event.target.value)} />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-tracking`}>Tracking number</FieldLabel>
          <Input id={`${id}-tracking`} value={trackingNumber} onChange={event => setTrackingNumber(event.target.value)} />
        </Field>
      </div>

      <Field className="max-w-[36rem]">
        <FieldLabel htmlFor={`${id}-tracking-url`}>Tracking link</FieldLabel>
        <Input
          id={`${id}-tracking-url`}
          type="url"
          inputMode="url"
          placeholder="https://"
          value={trackingUrl}
          onChange={event => setTrackingUrl(event.target.value)}
        />
        <FieldDescription>Shown to the buyer. It has to start with http or https.</FieldDescription>
      </Field>

      <Field className="max-w-[36rem]">
        <FieldLabel htmlFor={`${id}-note`}>Note to yourself</FieldLabel>
        <Textarea id={`${id}-note`} rows={2} value={internalNote} onChange={event => setInternalNote(event.target.value)} />
        <FieldDescription>Never shown to the buyer.</FieldDescription>
      </Field>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" disabled={busy} onClick={() => void save()}>
          {busy ? <Spinner aria-hidden data-icon="inline-start" /> : <SaveIcon aria-hidden data-icon="inline-start" />}
          Save
        </Button>
        {hasPodLines ? (
          <Button type="button" size="sm" variant="outline" disabled={busy || order.payment.status !== 'paid'} onClick={() => void dispatch()}>
            <PrinterIcon aria-hidden data-icon="inline-start" />
            Send to the printer
          </Button>
        ) : null}
        {saved ? (
          <span className="flex items-center gap-1 text-sm text-muted-foreground" role="status">
            <CheckIcon aria-hidden className="size-4" />
            Saved
          </span>
        ) : null}
      </div>

      {error ? (
        <Alert variant="destructive">
          <TriangleAlertIcon aria-hidden />
          <AlertTitle>That change was not made</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {dispatchNotes ? (
        <Alert>
          <PrinterIcon aria-hidden />
          <AlertTitle>What happened</AlertTitle>
          <AlertDescription>
            <ul className="flex list-disc flex-col gap-1 pl-4">
              {dispatchNotes.map(note => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
