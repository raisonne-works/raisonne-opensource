'use client';

import { type FormEvent, useId, useState } from 'react';
import { SearchIcon, TriangleAlertIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import type { Order } from '@/lib/types';

import { OrderDetail } from './order-detail';

/**
 * Finding an order again without signing in.
 *
 * Two facts are asked for, not one: the order number and the address it was
 * placed with. Looking an order up by email alone, which is what orkhan.art
 * does today, means anybody who knows a collector's address can read what
 * they bought and where they live.
 *
 * It posts rather than navigating, so the email address never lands in a
 * URL, a browser history or a server log, and the found order is rendered
 * here rather than at an address that could be shared by accident.
 */
export function OrderLookup({ className }: { className?: string }) {
  const id = useId();
  const [number, setNumber] = useState('');
  const [email, setEmail] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      const response = await fetch('/api/orders/lookup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ number, email }),
      });
      const data = (await response.json().catch(() => null)) as { order?: Order; error?: string } | null;
      if (!response.ok || !data?.order) {
        setOrder(null);
        setError(data?.error ?? 'That could not be looked up just now.');
        return;
      }
      setOrder(data.order);
    } catch {
      setError('That could not be looked up just now.');
    } finally {
      setBusy(false);
    }
  }

  if (order) {
    return (
      <div className={className}>
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground">Showing one order. It is not kept on this screen once you leave.</p>
          <Button variant="ghost" size="sm" onClick={() => setOrder(null)}>
            Look up another
          </Button>
        </div>
        <OrderDetail order={order} />
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Find an order</CardTitle>
        <CardDescription>
          Both the order number and the email address it was placed with. The number is on the confirmation page and in
          any message the studio has sent.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} noValidate className="flex max-w-[32rem] flex-col gap-4">
          <Field>
            <FieldLabel htmlFor={`${id}-number`}>Order number</FieldLabel>
            <Input
              id={`${id}-number`}
              value={number}
              onChange={event => setNumber(event.target.value)}
              placeholder="R-2026-4F2A"
              className="font-mono"
              autoComplete="off"
              required
            />
            <FieldDescription>Case does not matter.</FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor={`${id}-email`}>Email address</FieldLabel>
            <Input
              id={`${id}-email`}
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              required
            />
          </Field>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={busy}>
              {busy ? <Spinner aria-hidden data-icon="inline-start" /> : <SearchIcon aria-hidden data-icon="inline-start" />}
              Find it
            </Button>
          </div>

          {error ? (
            <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
              <TriangleAlertIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
