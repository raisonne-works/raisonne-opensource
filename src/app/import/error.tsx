'use client';

import { useEffect } from 'react';
import { CircleAlertIcon } from 'lucide-react';

import { Container } from '@/components/raisonne/shell/page';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export default function ImportError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container size="text" className="flex flex-col items-start gap-4 py-16 md:py-24">
      <Alert variant="destructive">
        <CircleAlertIcon aria-hidden />
        <AlertTitle>The import could not be shown</AlertTitle>
        <AlertDescription>
          Something went wrong while loading the recorded import. Trying again usually works.
          {error.digest ? <p className="font-mono text-xs">Reference {error.digest}</p> : null}
        </AlertDescription>
      </Alert>
      <Button onClick={() => retry()}>Try again</Button>
    </Container>
  );
}
