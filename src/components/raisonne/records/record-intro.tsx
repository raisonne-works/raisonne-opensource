import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * The opening of a record page: the text on the left, the facts on the right
 * from xl up, one under the other below that.
 *
 * It is the same pairing StoryBlocks makes with its first text block, and it
 * is used by the pages whose opening text belongs to the record itself (an
 * exhibition's curatorial note, a collaboration's account of the project)
 * rather than to a story block.
 */
export function RecordIntro({
  children,
  aside,
  className,
}: {
  children: ReactNode;
  aside: ReactNode;
  className?: string;
}) {
  return (
    <div data-slot="record-intro" className={cn('grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start xl:gap-12', className)}>
      <div data-slot="record-intro-body" className="min-w-0">{children}</div>
      <div data-slot="record-intro-aside" className="min-w-0 xl:sticky xl:top-20 xl:self-start">{aside}</div>
    </div>
  );
}
