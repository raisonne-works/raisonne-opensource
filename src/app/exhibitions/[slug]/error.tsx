'use client';

import { RecordError } from '@/components/raisonne/records/record-error';

export default function ExhibitionError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <RecordError
      error={error}
      retry={retry}
      title="This exhibition could not be shown"
      backHref="/exhibitions"
      backLabel="All exhibitions"
    />
  );
}
