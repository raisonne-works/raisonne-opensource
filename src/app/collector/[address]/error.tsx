'use client';

import { CatalogueError } from '@/components/raisonne/catalogue/catalogue-error';

export default function CollectorProfileError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <CatalogueError list="collector profile" error={error} retry={retry} />;
}
