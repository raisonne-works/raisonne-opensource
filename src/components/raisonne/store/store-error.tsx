'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { TriangleAlertIcon } from 'lucide-react';

import { Container } from '@/components/raisonne/shell/page';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

import { SHOP_PATH } from './lib';

/**
 * A shop page that could not be shown: what failed, the reference a
 * developer can match against the log, a retry, and the way back to the
 * shop. A cart is never cleared by an error here: it lives in the browser,
 * and this page never touches it.
 */
export function StoreError({
  error,
  retry,
  title,
  backHref = SHOP_PATH,
  backLabel = 'Go to the shop',
}: {
  error: Error & { digest?: string };
  retry: () => void;
  title: string;
  backHref?: string;
  backLabel?: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container size="text" className="py-16 md:py-24">
      <Alert variant="destructive">
        <TriangleAlertIcon aria-hidden="true" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>
          <p>Something went wrong while loading it. Trying again usually works, and nothing has left your cart.</p>
          {error.digest ? <p className="font-mono text-xs">Reference {error.digest}</p> : null}
        </AlertDescription>
      </Alert>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={() => retry()}>Try again</Button>
        <Button variant="outline" nativeButton={false} render={<Link href={backHref} />}>
          {backLabel}
        </Button>
      </div>
    </Container>
  );
}
