import type { ReactNode } from 'react';

import { Container, PageHeader } from '@/components/raisonne/shell/page';
import { Skeleton } from '@/components/ui/skeleton';

import { CatalogueBrowser, CatalogueBrowserSkeleton } from './catalogue-browser';
import type { CatalogueEntry } from './entry';
import type { CatalogueConfig, CatalogueState } from './lib';

/**
 * The shape every list page shares: a title, a line saying what is in the
 * list, then the browser. `before` and `after` are for the blocks a
 * particular list adds around it, such as the featured shows above the
 * exhibitions or the history below them.
 */
export function CatalogueListPage({
  title,
  description,
  state,
  config,
  entries,
  before,
  after,
  className,
}: {
  title: string;
  description: ReactNode;
  state: CatalogueState;
  config: CatalogueConfig;
  entries: CatalogueEntry[];
  before?: ReactNode;
  after?: ReactNode;
  className?: string;
}) {
  return (
    <Container className={className ?? 'pb-16 md:pb-24'}>
      <PageHeader title={title} description={description} />
      {before}
      <div className="py-2">
        <CatalogueBrowser entries={entries} state={state} config={config} id="catalogue" />
      </div>
      {after}
    </Container>
  );
}

/** The same page while it loads: the header, then the browser's own skeleton. */
export function CatalogueListSkeleton({
  view = 'grid',
  className,
}: {
  view?: 'grid' | 'dense' | 'sheet' | 'table';
  className?: string;
}) {
  return (
    <Container className={className ?? 'pb-16 md:pb-24'}>
      <div className="flex flex-col gap-3 py-8 md:py-12">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-6 w-full max-w-[40rem]" />
      </div>
      <CatalogueBrowserSkeleton view={view} />
    </Container>
  );
}
