'use client';

import { CatalogueError } from '@/components/raisonne/catalogue/catalogue-error';

export default function CollectorsError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <CatalogueError list="collectors" error={error} retry={retry} />;
}
