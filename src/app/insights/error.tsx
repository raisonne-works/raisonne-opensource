'use client';

import Link from 'next/link';
import { TriangleAlertIcon } from 'lucide-react';
import { useEffect } from 'react';

import { Container } from '@/components/raisonne/shell/page';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

/**
 * An insights page that could not be rendered says so, offers to try again,
 * and gives a way back to the catalogue, which does not depend on any of
 * this. The reference is the server's own digest, so a report can be matched
 * to a line in the log.
 */
export default function InsightsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container size="text" className="py-16 md:py-24">
      <Alert variant="destructive">
        <TriangleAlertIcon aria-hidden="true" />
        <AlertTitle>The figures could not be shown</AlertTitle>
        <AlertDescription>
          <p>
            Something went wrong while reading the chain snapshot. Trying again usually works; if it does not, take a
            fresh snapshot with <code className="font-mono">pnpm snapshot:chain</code>.
          </p>
          {error.digest ? <p className="font-mono text-xs">Reference {error.digest}</p> : null}
        </AlertDescription>
      </Alert>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={() => reset()}>Try again</Button>
        <Button variant="outline" nativeButton={false} render={<Link href="/works" />}>
          Go to the catalogue
        </Button>
      </div>
    </Container>
  );
}
