import { ChartNoAxesColumnIcon } from 'lucide-react';

import { EMPTY_BLOCK_CLASS } from '@/components/raisonne/shell/measure';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { cn } from '@/lib/utils';

export interface MissingVar {
  name: string;
  /** The one line from ENV_DOCS that says what the variable is for. */
  detail: string;
}

/**
 * What an insights page shows when the install has no chain snapshot.
 *
 * Nothing is configured by default and that is a working state, so this is a
 * designed panel and not an error: it names the command that fills the pages
 * and the variable that command needs, in the words the artist will have to
 * type. The catalogue keeps working around it, and no figure is invented to
 * fill the space.
 */
export function NoChainData({
  missing = [],
  className,
  title = 'No chain snapshot yet',
}: {
  missing?: MissingVar[];
  className?: string;
  title?: string;
}) {
  return (
    <Empty className={cn(EMPTY_BLOCK_CLASS, 'max-w-xl', className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ChartNoAxesColumnIcon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>
          Holders, events and volume are read from the chain and written to a file this install refreshes. Until that
          runs there is nothing true to show here, so nothing is shown.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="text-left">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium">Take a snapshot</p>
            <pre className="overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-xs">
              <code>pnpm snapshot:chain</code>
            </pre>
          </div>
          {missing.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium">Set first</p>
              <dl className="flex flex-col gap-2">
                {missing.map(item => (
                  <div key={item.name} className="flex flex-col gap-0.5">
                    <dt className="font-mono text-xs">{item.name}</dt>
                    <dd className="text-xs text-muted-foreground">{item.detail}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Every variable is documented in <code className="font-mono">.env.example</code> and in the README.
          </p>
        </div>
      </EmptyContent>
    </Empty>
  );
}
