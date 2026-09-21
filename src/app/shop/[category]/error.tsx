'use client';

import { StoreError } from '@/components/raisonne/store/store-error';

export default function ShopCategoryError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <StoreError error={error} retry={retry} title="This part of the shop could not be shown" />;
}
