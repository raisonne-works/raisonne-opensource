'use client';

import { RecordError } from '@/components/raisonne/records/record-error';

export default function InstallationError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <RecordError
      error={error}
      retry={retry}
      title="This installation could not be shown"
      backHref="/installations"
      backLabel="All installations"
    />
  );
}
