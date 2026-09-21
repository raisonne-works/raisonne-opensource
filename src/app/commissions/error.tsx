'use client';

import { RecordError } from '@/components/raisonne/records/record-error';

export default function CommissionsError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <RecordError
      error={error}
      retry={retry}
      title="The commissions page could not be shown"
      backHref="/"
      backLabel="Go to the home page"
    />
  );
}
