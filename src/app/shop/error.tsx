'use client';

import { StoreError } from '@/components/raisonne/store/store-error';

export default function ShopError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <StoreError error={error} retry={retry} title="The shop could not be shown" backHref="/works" backLabel="Go to the catalogue" />;
}
