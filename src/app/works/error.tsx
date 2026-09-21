'use client';

import { CatalogueError } from '@/components/raisonne/catalogue/catalogue-error';

export default function WorksError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <CatalogueError list="catalogue" error={error} retry={retry} />;
}
