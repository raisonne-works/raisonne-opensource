import { TriangleAlert } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

/**
 * The error state for a profile page or block (the CV, a list that failed to
 * load): an Alert that says what failed and, through `children`, offers a
 * way forward such as a retry button.
 */
export function ProfileError({
  title = 'This could not be shown',
  description = 'Something went wrong while loading it. Trying again usually works.',
  digest,
  children,
  className,
}: {
  title?: string;
  description?: string;
  /** The server's error reference, shown so it can be matched to the logs. */
  digest?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-start gap-4', className)}>
      <Alert variant="destructive">
        <TriangleAlert aria-hidden />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>
          <p>{description}</p>
          {digest ? <p className="font-mono text-xs">Reference {digest}</p> : null}
        </AlertDescription>
      </Alert>
      {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}
