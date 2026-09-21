import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { SetupPanel } from '@/components/raisonne/auth/setup-panel';
import { SignInPanel } from '@/components/raisonne/auth/sign-in-panel';
import { SignedInPanel } from '@/components/raisonne/auth/signed-in-panel';
import { SIGN_IN_REASONS, isSignInReason, safeReturnPath } from '@/components/raisonne/auth/routes';
import { Container, PageHeader } from '@/components/raisonne/shell/page';
import { READING_CLASS } from '@/components/raisonne/shell/measure';
import { getArtist, getSettings } from '@/fixtures';
import { getSession } from '@/lib/auth/guards';
import { getCollector } from '@/lib/chain/holdings';
import { surfaceRequirements, surfaceState } from '@/lib/config';
import { NO_INDEX } from '@/lib/seo/metadata';

/**
 * Sign in.
 *
 * The canonical route is /auth, which is what every gate redirects to and
 * what /signin, /auth/signin and /auth/signup fold into. There is one way in:
 * sign a message with the wallet that holds the work. No email, no password,
 * no third-party account, and nothing to store about anybody who signs in.
 *
 * Four states, all designed rather than defaulted:
 *
 *  - the collectors module is off, and the route does not exist at all
 *  - the module is on but the install has no session secret, and the page
 *    says which variable to set
 *  - nobody is signed in, and the wallet flow is offered
 *  - somebody is signed in, and the page says who and offers the way on
 *
 * Never indexed and never cached: it reads a cookie and its answer is
 * different for every visitor.
 */

export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
  return { title: 'Sign in', description: 'Sign in with the wallet that holds the work.', robots: NO_INDEX };
}

export default async function AuthPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const state = surfaceState(getSettings(), 'collectors');
  if (state === 'off') notFound();

  const next = safeReturnPath(first(params.next));
  const rawReason = first(params.reason);
  const reason = isSignInReason(rawReason) ? rawReason : next ? 'required' : null;
  const artist = getArtist();

  if (state === 'unconfigured') {
    return (
      <Container size="text" className="pb-16 md:pb-24">
        <PageHeader
          title="Sign in"
          description="Collectors sign in by signing a message with their wallet, and this install is not set up for that yet."
        />
        <SetupPanel
          statuses={surfaceRequirements('collectors')}
          title="Sign-in is not configured"
          visitorNote={`The catalogue works as usual. Signing in needs one setting from whoever runs ${artist.name}’s install.`}
        />
      </Container>
    );
  }

  const session = await getSession();

  if (session) {
    const collector = getCollector(session.address);
    return (
      <Container size="text" className="pb-16 md:pb-24">
        <PageHeader title="Your account" description="The wallet you signed in with, and where it takes you." />
        <SignedInPanel
          address={session.address}
          ens={collector?.ens ?? null}
          role={session.role}
          publicProfile={getSettings().publicCollectorProfiles === true}
          next={next}
        />
      </Container>
    );
  }

  return (
    <Container size="text" className="pb-16 md:pb-24">
      <PageHeader
        title="Sign in"
        description={
          <>
            <span className="block">Sign a message with the wallet that holds the work. That is the whole sign-in.</span>
            {reason ? <span className="mt-2 block font-medium text-foreground">{SIGN_IN_REASONS[reason]}</span> : null}
          </>
        }
      />
      <SignInPanel next={next} />
      <p className={`mt-10 text-sm text-pretty text-muted-foreground ${READING_CLASS}`}>
        There is no account to create and no password to remember. {artist.name}’s install keeps no record of who signs
        in: what you hold is read from the chain each time, and the session is a cookie on this device that expires on
        its own.
      </p>
    </Container>
  );
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
