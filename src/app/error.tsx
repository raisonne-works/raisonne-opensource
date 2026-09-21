'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { TriangleAlertIcon } from 'lucide-react';

import { Container } from '@/components/raisonne/shell/page';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

/** The designed error state for any page: an Alert with a way forward. */
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container size="text" className="py-16 md:py-24">
      <Alert variant="destructive">
        <TriangleAlertIcon aria-hidden="true" />
        <AlertTitle>This page could not be shown</AlertTitle>
        <AlertDescription>
          <p>Something went wrong while loading it. Trying again usually works.</p>
          {error.digest ? <p className="font-mono text-xs">Reference {error.digest}</p> : null}
        </AlertDescription>
      </Alert>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={() => retry()}>Try again</Button>
        <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
          Go to the home page
        </Button>
      </div>
    </Container>
  );
}
