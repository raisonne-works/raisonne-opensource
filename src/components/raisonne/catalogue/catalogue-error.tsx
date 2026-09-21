'use client';

import Link from 'next/link';
import { TriangleAlertIcon } from 'lucide-react';
import { useEffect } from 'react';

import { Container } from '@/components/raisonne/shell/page';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

/**
 * A list that could not be loaded says which list it was, offers to try
 * again, and gives a way on. The reference is the server's own digest, so a
 * report can be matched to the log.
 */
export function CatalogueError({
  list,
  error,
  retry,
}: {
  /** The list in plain words, e.g. "exhibitions". */
  list: string;
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container size="text" className="py-16 md:py-24">
      <Alert variant="destructive">
        <TriangleAlertIcon aria-hidden="true" />
        <AlertTitle>The {list} could not be shown</AlertTitle>
        <AlertDescription>
          <p>Something went wrong while loading this list. Trying again usually works.</p>
          {error.digest ? <p className="font-mono text-xs">Reference {error.digest}</p> : null}
        </AlertDescription>
      </Alert>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={() => retry()}>Try again</Button>
        <Button variant="outline" nativeButton={false} render={<Link href="/works" />}>
          Go to the catalogue
        </Button>
      </div>
    </Container>
  );
}
