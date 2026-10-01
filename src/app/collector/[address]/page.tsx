import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { ActivityList } from '@/components/raisonne/collectors/activity-list';
import { CollectorIdentity } from '@/components/raisonne/collectors/collector-identity';
import { RecordBreadcrumb } from '@/components/raisonne/records/record-breadcrumb';
import { shortAddress } from '@/components/raisonne/works/lib';
import { CollectorStatTiles } from '@/components/raisonne/collectors/collector-stats';
import { NoHoldings, SourceNote, UnknownCollector } from '@/components/raisonne/collectors/collector-states';
import { HeldWorks } from '@/components/raisonne/collectors/held-works';
import { collectorName } from '@/components/raisonne/collectors/lib';
import { TierCard } from '@/components/raisonne/collectors/tier-badges';
import { NoChainData } from '@/components/raisonne/insights/no-chain-data';
import { Container, Section } from '@/components/raisonne/shell/page';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { getSettings } from '@/fixtures';
import { getSession } from '@/lib/auth/guards';
import { isSameAddress, normalizeAddress } from '@/lib/chain/address';
import { chainDataState, getLeaderboard } from '@/lib/chain/holdings';
import { loadPublicProfile } from '@/lib/collectors';
import { ENV_DOCS, isConfigured, surfaceState } from '@/lib/config';
import { pageMetadata } from '@/lib/seo/metadata';
import { slot } from '@/lib/theme';

/**
 * A collector's public page.
 *
 * Only public facts, and only from the install's own chain snapshot. A
 * visitor cannot make this page read the chain for an address they invented:
 * that would turn the artist's Alchemy key into a public API, and it would
 * let anyone probe any wallet through somebody else's install. The signed-in
 * collector's own page at /collector is the one that reads live.
 *
 * What is public here is what is public on-chain: an address, the ENS name
 * the chain resolves for it, what it holds of this artist's work, and the
 * events that moved those tokens. The artist's own private note about a
 * wallet is printed only where the install has said collector names may be
 * shown (settings.showOwners), because that note is the artist's writing
 * rather than the chain's record.
 *
 * There is deliberately no loading.tsx beside this file. A loading state
 * opens a Suspense boundary, the shell flushes before `await params`
 * resolves, and the status line is then already committed: notFound() for a
 * malformed address degraded into a 200 with an empty <main> and the 404
 * only in the streamed payload. Everything here is read from a local
 * snapshot, so there is nothing slow to cover, and answering 404 with a 404
 * is worth more than a skeleton.
 *
 * The page itself is opt in. Every fact on it is public on-chain, but
 * gathering them into one page, under a wallet's ENS name, at a URL anyone
 * can pass around, is a different act from leaving them on the chain, and it
 * is the artist's to decide rather than this theme's. So
 * settings.publicCollectorProfiles governs it, it is off by default, and
 * with it off only two people can open a wallet's page: the wallet itself,
 * and whoever owns the install. Everyone else gets a 404, because a page
 * that exists but refuses to load is itself an answer about who holds what.
 * The directory and the leaderboard are unaffected: a rank and a truncated
 * address are a fact about the catalogue.
 */

interface PageProps {
  params: Promise<{ address: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { address } = await params;
  const owner = normalizeAddress(address);
  // Nothing about the wallet reaches a title or a description while the
  // per-wallet page is private, because metadata is rendered for anybody.
  const profile = owner && getSettings().publicCollectorProfiles ? loadPublicProfile(owner) : null;

  if (!profile) {
    return pageMetadata('collector-profile', {
      title: 'Collector',
      path: owner ? `/collector/${owner}` : '/collectors',
      noIndex: true,
    });
  }

  const name = collectorName(profile.collector, { showLabel: getSettings().showOwners });
  return pageMetadata('collector-profile', {
    title: name,
    description: `Works by this artist held by ${name}.`,
    path: `/collector/${profile.collector.address}`,
    /*
     * Public, but not indexed.
     *
     * Everything here is already public on-chain, and anyone with the link
     * can read it. Putting a wallet's whole holding into a search engine
     * under its ENS name is a different thing from publishing it on the
     * chain, and it is not the artist's to do on a collector's behalf. The
     * directory is indexed and links every profile, so the pages are found
     * by people who are looking for them.
     */
    noIndex: true,
  });
}

export default async function CollectorProfilePage({ params }: PageProps) {
  slot('collector');
  const { address } = await params;
  const owner = normalizeAddress(address);
  if (!owner) notFound();

  // One address, one URL. A checksummed or mixed-case link lands on the
  // lowercase canonical rather than creating a second page for one wallet.
  if (owner !== address) redirect(`/collector/${owner}`);

  const settings = getSettings();
  const showLabel = settings.showOwners;
  const profile = loadPublicProfile(owner);
  const chain = chainDataState();
  const session = await getSession();
  const viewer = session?.address ?? null;
  const isViewer = isSameAddress(viewer, owner);

  // Opt in, and the two exceptions are the people it cannot be a privacy
  // problem for.
  if (!settings.publicCollectorProfiles && !isViewer && session?.role !== 'owner') notFound();

  if (!profile) {
    return (
      <Container size="editorial" className="pt-6 pb-16 md:pb-24">
        <RecordBreadcrumb
          parents={[{ href: '/collectors', label: 'Collectors' }]}
          current={shortAddress(owner, 10, 8)}
        />
        <div className="py-8 md:py-12">
          <CollectorIdentity
            collector={{ address: owner, chain: 'ethereum', ens: null, label: null }}
            eyebrow="Collector"
            headingLevel={1}
          />
        </div>
        {chain.hasSnapshot ? (
          <UnknownCollector address={owner} />
        ) : (
          <NoChainData
            missing={isConfigured('chain') ? [] : [{ name: 'ALCHEMY_API_KEY', detail: ENV_DOCS.ALCHEMY_API_KEY ?? '' }]}
          />
        )}
      </Container>
    );
  }

  const { collector, stats, totals, groups, activity, tier, badges } = profile;
  const holders = getLeaderboard(10_000).length;

  const name = collectorName(collector, { showLabel });

  return (
    <Container size="editorial" className="flex flex-col gap-0 pt-6 pb-16 md:pb-24">
      {/* Its own trail, so the last crumb is the name this page uses rather
          than the 42-character address out of the URL. That crumb was 390 px
          wide inside a 390 px viewport and gave every public profile a
          horizontal page scroll on a phone. */}
      <RecordBreadcrumb parents={[{ href: '/collectors', label: 'Collectors' }]} current={name} />

      <header className="flex flex-col gap-6 py-8 md:flex-row md:items-end md:justify-between md:py-12">
        <CollectorIdentity collector={collector} eyebrow="Collector" showLabel={showLabel} headingLevel={1} />
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {isViewer ? (
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/collector" />}>
              Your collection
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/collectors" />}>
            All collectors
          </Button>
        </div>
      </header>

      {isViewer ? (
        <Alert className="mb-6">
          <AlertTitle>This is your wallet</AlertTitle>
          <AlertDescription>
            This is the page everyone else sees. Your own page reads the chain live and shows what the artist has
            written to their collectors.
          </AlertDescription>
        </Alert>
      ) : null}

      <CollectorStatTiles stats={stats} totals={totals} holders={holders || undefined} hasSnapshot={chain.hasSnapshot} />

      <div className="grid grid-cols-1 gap-x-8 gap-y-2 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <Section title="Works held" description="What this wallet held when the snapshot was taken.">
            {groups.length === 0 ? <NoHoldings /> : <HeldWorks groups={groups} />}
          </Section>

          <Section id="activity" title="Activity" description="Public on-chain events involving this wallet.">
            <ActivityList
              rows={activity}
              address={collector.address}
              emptyLabel="No activity in the snapshot"
              linkProfiles={settings.publicCollectorProfiles === true}
              note={
                profile.snapshotAt
                  ? 'Only what the chain snapshot covers. A work can be held here with nothing listed below, because the transfer that brought it in is older than the history this install has read.'
                  : undefined
              }
            />
          </Section>
        </div>

        <aside className="flex min-w-0 flex-col gap-6 py-10 md:py-12">
          <TierCard tier={tier} badges={badges} explained={surfaceState(settings, 'insights') !== 'off'} headingLevel={2} />
          <SourceNote source={profile.source} snapshotAt={profile.snapshotAt} gaps={profile.gaps} />
        </aside>
      </div>
    </Container>
  );
}
