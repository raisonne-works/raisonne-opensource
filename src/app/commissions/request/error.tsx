'use client';

import { RecordError } from '@/components/raisonne/records/record-error';

export default function CommissionRequestError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <RecordError
      error={error}
      retry={retry}
      title="The commission form could not be shown"
      backHref="/commissions"
      backLabel="Back to commissions"
    />
  );
}
