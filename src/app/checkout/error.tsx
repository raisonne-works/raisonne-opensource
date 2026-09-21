'use client';

import { RecordError } from '@/components/raisonne/records/record-error';
import { SHOP_PATH } from '@/components/raisonne/store/lib';

export default function CheckoutError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <RecordError
      error={error}
      retry={retry}
      title="The checkout could not be shown"
      backHref={SHOP_PATH}
      backLabel="Back to the shop"
    />
  );
}
