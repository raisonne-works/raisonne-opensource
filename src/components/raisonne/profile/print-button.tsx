'use client';

import { Download, Printer } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Opens the browser's print dialog, where "Save as PDF" is one choice away.
 * The page's print styles do the rest, so no PDF library ships.
 */
export function PrintButton({ label = 'Print', className }: { label?: string; className?: string }) {
  return (
    <Button variant="ghost" className={cn('print:hidden', className)} onClick={() => window.print()}>
      <Printer aria-hidden data-icon="inline-start" />
      {label}
    </Button>
  );
}

/**
 * The one-click download: a real file, paginated, that an artist can attach
 * to an email. It points at the artist's own uploaded PDF when there is one
 * (Cv.pdfUrl) and at /cv/download, which builds one from the same data the
 * page renders, when there is not.
 *
 * A plain link rather than a script, so it works before the page hydrates
 * and can be opened in a new tab or saved from the context menu.
 */
export function DownloadCvButton({
  href = '/cv/download',
  fileName,
  label = 'Download as PDF',
  className,
}: {
  href?: string;
  /** Suggests a name to the browser for a file served from this site. */
  fileName?: string;
  label?: string;
  className?: string;
}) {
  const sameOrigin = href.startsWith('/');

  return (
    <Button
      variant="outline"
      className={cn('print:hidden', className)}
      nativeButton={false}
      render={
        <a
          href={href}
          download={sameOrigin ? (fileName ?? true) : undefined}
          target={sameOrigin ? undefined : '_blank'}
          rel={sameOrigin ? undefined : 'noopener noreferrer'}
        />
      }
    >
      <Download aria-hidden data-icon="inline-start" />
      {label}
    </Button>
  );
}
