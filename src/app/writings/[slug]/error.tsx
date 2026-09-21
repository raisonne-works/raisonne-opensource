'use client';

import { RecordError } from '@/components/raisonne/records/record-error';

export default function WritingError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <RecordError
      error={error}
      retry={retry}
      title="This text could not be shown"
      backHref="/writings"
      backLabel="All writings"
    />
  );
}
