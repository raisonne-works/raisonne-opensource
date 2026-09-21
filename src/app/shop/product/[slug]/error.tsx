'use client';

import { StoreError } from '@/components/raisonne/store/store-error';

export default function ProductError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <StoreError error={error} retry={retry} title="This piece could not be shown" />;
}
