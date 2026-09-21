import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LockIcon } from 'lucide-react';

import { signInUrl } from '@/components/raisonne/auth/routes';
import { Container, PageHeader } from '@/components/raisonne/shell/page';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { getSession, ownerIsConfigured } from '@/lib/auth/guards';
import { EMPTY_BLOCK_CLASS } from '@/components/raisonne/shell/measure';
import { ownerToolsEnabled } from '@/lib/tools';

/**
 * The owner gate for the importer, held above the loading boundary.
 *
 * Two different answers, and the difference matters. An install that has not
 * switched the tools on has no importer at all, so the route is a 404. An
 * install that has switched them on has one, and it belongs to the artist:
 * anyone else gets this, which says so in a sentence, rather than the blank
 * page they used to get. A curious collector following a footer link should
 * not land on a document with an empty main and no explanation.
 *
 * A layout renders outside the Suspense boundary import/loading.tsx creates,
 * and Next flushes the shell with a 200 as soon as a page suspends, so this
 * has to be here for the status to still be ours to set.
 */
export default async function ImportLayout({ children }: { children: React.ReactNode }) {
  if (!ownerToolsEnabled()) notFound();

  const session = await getSession();
  if (session?.role === 'owner') return children;

  return (
    <Container size="editorial" className="pb-16 md:pb-24">
      <PageHeader
        eyebrow="For the artist"
        title="The importer"
        description="This is the tool the artist uses to build the catalogue from their own wallets. It is not part of the public site."
      />
      <Empty className={EMPTY_BLOCK_CLASS}>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <LockIcon aria-hidden />
          </EmptyMedia>
          <EmptyTitle>Only the artist can run an import</EmptyTitle>
          <EmptyDescription>
            {ownerIsConfigured()
              ? 'Sign in with the wallet that owns this install to open it.'
              : 'This install has not been told which wallets belong to the artist, so nobody can open it yet.'}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          {ownerIsConfigured() ? (
            <Button variant="outline" nativeButton={false} render={<Link href={signInUrl('/import', 'owner')} />}>
              Sign in
            </Button>
          ) : (
            <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
              Back to the catalogue
            </Button>
          )}
        </EmptyContent>
      </Empty>
    </Container>
  );
}
