'use client';

import { StoreError } from '@/components/raisonne/store/store-error';

export default function CartError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <StoreError error={error} retry={retry} title="The cart could not be shown" />;
}
