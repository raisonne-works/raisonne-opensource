'use client';

import { RecordError } from '@/components/raisonne/records/record-error';

export default function PhysicalWorkError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <RecordError
      error={error}
      retry={retry}
      title="This work could not be shown"
      backHref="/physical-works"
      backLabel="All physical works"
    />
  );
}
