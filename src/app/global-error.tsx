'use client';

import Link from 'next/link';
import { TriangleAlertIcon } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

import './globals.css';

/**
 * The last resort: what shows when the root layout itself fails, for example
 * when src/fixtures/local/site.json cannot be read. app/error.tsx sits inside
 * the layout, so it never sees this, and the page has to bring its own
 * document. It has no theme toggle, so it follows the system's colours.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <title>This site could not be shown</title>
        <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-16 sm:px-6 md:py-24">
          <Alert variant="destructive">
            <TriangleAlertIcon aria-hidden="true" />
            <AlertTitle>This site could not be shown</AlertTitle>
            <AlertDescription>
              <p>
                Something went wrong before the page could be built. If this install was just set up, check that
                src/fixtures/local/site.json is valid JSON with the shape of SiteData.
              </p>
              {error.digest ? <p className="font-mono text-xs">Reference {error.digest}</p> : null}
            </AlertDescription>
          </Alert>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => retry()}>Try again</Button>
            <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
              Go to the home page
            </Button>
          </div>
        </main>
      </body>
    </html>
  );
}
