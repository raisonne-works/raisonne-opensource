'use client';

import { RecordError } from '@/components/raisonne/records/record-error';

export default function CollaborationError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <RecordError
      error={error}
      retry={retry}
      title="This collaboration could not be shown"
      backHref="/collaborations"
      backLabel="All collaborations"
    />
  );
}
