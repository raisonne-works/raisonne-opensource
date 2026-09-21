'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { TriangleAlertIcon } from 'lucide-react';

import { Container } from '@/components/raisonne/shell/page';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

/**
 * The error state every record page shares: what failed, the reference a
 * developer can match against the logs, a retry, and the way back to the
 * list the visitor came from.
 */
export function RecordError({
  error,
  retry,
  title,
  backHref,
  backLabel,
}: {
  error: Error & { digest?: string };
  retry: () => void;
  /** e.g. "This exhibition could not be shown". */
  title: string;
  backHref: string;
  backLabel: string;
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
          <p>Something went wrong while loading it. Trying again usually works.</p>
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
