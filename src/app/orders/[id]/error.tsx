'use client';

import { RecordError } from '@/components/raisonne/records/record-error';

export default function OrderError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <RecordError
      error={error}
      retry={retry}
      title="That order could not be shown"
      backHref="/orders"
      backLabel="All orders"
    />
  );
}
