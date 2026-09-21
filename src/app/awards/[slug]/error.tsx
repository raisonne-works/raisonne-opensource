'use client';

import { RecordError } from '@/components/raisonne/records/record-error';

export default function AwardError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <RecordError error={error} retry={retry} title="This award could not be shown" backHref="/awards" backLabel="All awards" />
  );
}
