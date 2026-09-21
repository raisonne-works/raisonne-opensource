'use client';

import { useEffect } from 'react';
import Link from 'next/link';

import { ProfileError } from '@/components/raisonne/profile/profile-error';
import { Container } from '@/components/raisonne/shell/page';
import { Button } from '@/components/ui/button';

export default function CvError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container size="text" className="py-16 md:py-24">
      <ProfileError
        title="The CV could not be shown"
        description="Something went wrong while loading the exhibitions, awards and press. Trying again usually works."
        digest={error.digest}
      >
        <Button onClick={() => retry()}>Try again</Button>
        <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
          Go to the home page
        </Button>
      </ProfileError>
    </Container>
  );
}
