import type { Metadata } from 'next';
import Link from 'next/link';

import { signOutAction } from '@/components/raisonne/auth/actions';
import { SIGN_IN_ROUTE, safeReturnPath } from '@/components/raisonne/auth/routes';
import { READING_CLASS } from '@/components/raisonne/shell/measure';
import { Container, PageHeader } from '@/components/raisonne/shell/page';
import { Button } from '@/components/ui/button';
import { getSession } from '@/lib/auth/guards';
import { getCollector } from '@/lib/chain/holdings';
import { shortAddress } from '@/components/raisonne/works/lib';
import { NO_INDEX } from '@/lib/seo/metadata';
import { cn } from '@/lib/utils';

/**
 * Sign out.
 *
 * The account menu signs out in one click, so this page exists for the
 * person who typed the URL, followed an old link, or has JavaScript off. It
 * asks rather than acting, because a GET that ends a session can be fired by
 * anything that can put an image on a page.
 *
 * It is never a 404, even with the collectors module switched off: somebody
 * holding a cookie from before the switch was flipped must still be able to
 * get rid of it.
 */

export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
  return { title: 'Sign out', robots: NO_INDEX };
}

export default async function SignOutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.next;
  const next = safeReturnPath(Array.isArray(raw) ? raw[0] : raw);
  const session = await getSession();

  if (!session) {
    return (
      <Container size="text" className="pb-16 md:pb-24">
        <PageHeader title="Signed out" description="There is no session on this device." />
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href={SIGN_IN_ROUTE} />}>
            Sign in
          </Button>
          <Button variant="ghost" nativeButton={false} render={<Link href="/" />}>
            Back to the catalogue
          </Button>
        </div>
      </Container>
    );
  }

  const collector = getCollector(session.address);

  return (
    <Container size="text" className="pb-16 md:pb-24">
      <PageHeader
        title="Sign out?"
        description={`You are signed in as ${collector?.ens ?? shortAddress(session.address)}.`}
      />
      <form action={signOutAction} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next ?? ''} />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit">Sign out</Button>
          <Button variant="ghost" nativeButton={false} render={<Link href={next ?? '/'} />}>
            Stay signed in
          </Button>
        </div>
        <p className={cn('text-sm text-pretty text-muted-foreground', READING_CLASS)}>
          This clears the session cookie on this device. Your wallet is not touched, nothing is revoked on chain, and
          this install keeps no record of the session to delete.
        </p>
      </form>
    </Container>
  );
}
