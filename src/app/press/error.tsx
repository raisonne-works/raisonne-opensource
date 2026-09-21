'use client';

import { CatalogueError } from '@/components/raisonne/catalogue/catalogue-error';

export default function PressError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <CatalogueError list="press" error={error} retry={retry} />;
}
