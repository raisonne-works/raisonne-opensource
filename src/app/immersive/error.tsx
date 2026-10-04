'use client';

import { CatalogueError } from '@/components/raisonne/catalogue/catalogue-error';

export default function InstallationsError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <CatalogueError list="installations" error={error} retry={retry} />;
}
