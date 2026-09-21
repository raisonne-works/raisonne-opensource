'use client';

import { StoreError } from '@/components/raisonne/store/store-error';

export default function ShopCollectionError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <StoreError error={error} retry={retry} title="This collection could not be shown" />;
}
