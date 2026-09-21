'use client';

import { CatalogueError } from '@/components/raisonne/catalogue/catalogue-error';

export default function CollectorError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <CatalogueError list="collection" error={error} retry={retry} />;
}
