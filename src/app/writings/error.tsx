'use client';

import { CatalogueError } from '@/components/raisonne/catalogue/catalogue-error';

export default function WritingsError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <CatalogueError list="writings" error={error} retry={retry} />;
}
