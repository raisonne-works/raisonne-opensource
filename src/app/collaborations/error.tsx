'use client';

import { CatalogueError } from '@/components/raisonne/catalogue/catalogue-error';

export default function CollaborationsError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <CatalogueError list="collaborations" error={error} retry={retry} />;
}
