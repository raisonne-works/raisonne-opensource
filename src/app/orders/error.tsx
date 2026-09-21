'use client';

import { RecordError } from '@/components/raisonne/records/record-error';

export default function OrdersError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <RecordError
      error={error}
      retry={retry}
      title="Your orders could not be shown"
      backHref="/"
      backLabel="Go to the home page"
    />
  );
}
