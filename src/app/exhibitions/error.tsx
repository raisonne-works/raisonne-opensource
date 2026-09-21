'use client';

import { CatalogueError } from '@/components/raisonne/catalogue/catalogue-error';

export default function ExhibitionsError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <CatalogueError list="exhibitions" error={error} retry={retry} />;
}
