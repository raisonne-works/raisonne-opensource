'use client';

import { CatalogueError } from '@/components/raisonne/catalogue/catalogue-error';

export default function PhysicalWorksError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <CatalogueError list="physical works" error={error} retry={retry} />;
}
