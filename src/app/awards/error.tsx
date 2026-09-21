'use client';

import { CatalogueError } from '@/components/raisonne/catalogue/catalogue-error';

export default function AwardsError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <CatalogueError list="awards" error={error} retry={retry} />;
}
