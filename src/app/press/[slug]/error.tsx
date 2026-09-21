'use client';

import { RecordError } from '@/components/raisonne/records/record-error';

export default function PressError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <RecordError error={error} retry={retry} title="This piece could not be shown" backHref="/press" backLabel="All press" />
  );
}
