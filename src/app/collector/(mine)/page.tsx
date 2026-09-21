import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ActivityList } from '@/components/raisonne/collectors/activity-list';
import { CollectorIdentity } from '@/components/raisonne/collectors/collector-identity';
import { CollectorStatTiles } from '@/components/raisonne/collectors/collector-stats';
import { NoHoldings, SourceNote } from '@/components/raisonne/collectors/collector-states';
import { CollectorUpdates, UpcomingReleases } from '@/components/raisonne/collectors/collector-updates';
import { HeldWorks } from '@/components/raisonne/collectors/held-works';
import { collectorHref } from '@/components/raisonne/collectors/lib';
import { ResyncButton } from '@/components/raisonne/collectors/resync-button';
import { TierCard } from '@/components/raisonne/collectors/tier-badges';
import { SetupPanel } from '@/components/raisonne/auth/setup-panel';
import { LEADERBOARD_PATH } from '@/components/raisonne/guild/lib';
import { NoChainData } from '@/components/raisonne/insights/no-chain-data';
import { Container, Section } from '@/components/raisonne/shell/page';
import { Button } from '@/components/ui/button';
import { getSettings } from '@/fixtures';
import { requireSession } from '@/lib/auth/guards';
import { getLeaderboard } from '@/lib/chain/holdings';
import { loadOwnProfile, updatesFor, upcomingDrops } from '@/lib/collectors';
import { ENV_DOCS, isConfigured, surfaceRequirements, surfaceState } from '@/lib/config';
import { pageMetadata } from '@/lib/seo/metadata';

/**
 * The signed-in collector's own page: what they hold of this artist's work,
 * where it sits in the catalogue, what the artist has said to them, and what
 * the chain says they have done.
 *
 * Three things this page will not do. It will not name a wallet anything the
 * chain did not say. It will not price a holding, because an install with no
 * marketplace and no oracle cannot know what a work is worth today. And it
 * will not fill a gap with a nought: a number the snapshot could not see is
 * missing, and the page says which.
 *
 * It is the only surface allowed a live chain read, because one signed-in
 * person is waiting for one address, and the answer is cached per address.
 */

export function generateMetadata(): Metadata {
  return pageMetadata('collector', {
    title: 'Your collection',
    description: 'The works you hold by this artist, and their place in the catalogue.',
    path: '/collector',
    // Somebody's own holdings are not a search result, whoever else can see them.
    noIndex: true,
  });
}

export default async function CollectorPage() {
  const settings = getSettings();

  // The module switch is handled by the layout; what is left is whether
  // anyone can sign in at all on this install.
  if (surfaceState(settings, 'collectors') === 'unconfigured') {
    return (
      <Container className="py-16 md:py-24">
        <SetupPanel
          title="Collector sign-in is not set up yet"
          statuses={surfaceRequirements('collectors')}
          visitorNote="Set the variable and restart the app, and this page becomes a wallet sign-in. Nothing else on the site changes: the catalogue never needed it."
        />
      </Container>
    );
  }

  const session = await requireSession({ next: '/collector' });
  const profile = await loadOwnProfile(session.address);
  // A session only ever holds a normalized address, so this is unreachable
  // rather than a case worth designing a state for.
  if (!profile) notFound();

  const { collector, stats, totals, groups, activity, tier, badges } = profile;
  const holders = getLeaderboard(10_000).length;
  const updates = updatesFor(stats);
  const drops = upcomingDrops();
  const holdsNothing = groups.length === 0;

  /*
   * No key and no snapshot is not an empty collection. With nothing to read,
   * the counts would all be nought, and a nought here would read as a fact
   * about this wallet rather than about the install, so the page shows the
   * setup state instead of any number at all.
   */
  const unreadable = profile.source === 'none';

  // The tier and badge chips link to the guild page, which lives with the
  // leaderboard under the insights module. With that module off there is no
  // such page, so the chips carry their explanation instead of a link.
  const explained = surfaceState(settings, 'insights') !== 'off';

  return (
    <Container className="pb-16 md:pb-24">
      <header className="flex flex-col gap-6 py-8 md:flex-row md:items-end md:justify-between md:py-12">
        <CollectorIdentity
          collector={{ ...collector, isOwner: session.role === 'owner' }}
          eyebrow="Your collection"
          showLabel
          headingLevel={1}
        />
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {isConfigured('chain') ? <ResyncButton /> : null}
          {/* Only where there is a public page to see. With per-wallet pages
              switched off, this button led to a page only this visitor could
              open, under a label saying everyone could. */}
          {settings.publicCollectorProfiles === true ? (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={collectorHref(collector.address)} />}
            >
              Public profile
            </Button>
          ) : null}
          {explained && stats.rank ? (
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={LEADERBOARD_PATH} />}>
              Where you rank
            </Button>
          ) : null}
        </div>
      </header>

      {unreadable ? null : (
        <CollectorStatTiles stats={stats} totals={totals} holders={holders || undefined} hasSnapshot={profile.source !== 'none'} />
      )}

      <div className="grid grid-cols-1 gap-x-8 gap-y-2 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <Section
            title="Works you hold"
            description={
              holdsNothing
                ? undefined
                : 'Everything on the artist’s own contracts that this wallet holds, grouped by series.'
            }
          >
            {unreadable ? (
              <NoChainData
                title="This install cannot read the chain yet"
                missing={isConfigured('chain') ? [] : [{ name: 'ALCHEMY_API_KEY', detail: ENV_DOCS.ALCHEMY_API_KEY ?? '' }]}
              />
            ) : holdsNothing ? (
              <NoHoldings mine />
            ) : (
              <HeldWorks groups={groups} />
            )}
          </Section>

          {unreadable ? null : (
            <Section
              id="activity"
              title="Activity"
              description="Mints, sales and transfers involving this wallet, newest first."
            >
              <ActivityList
                rows={activity}
                address={collector.address}
                emptyLabel="No activity in the snapshot"
                linkProfiles={settings.publicCollectorProfiles === true}
                note={
                  profile.snapshotAt
                    ? 'Only what the chain snapshot covers. A work can be held above with nothing listed here, because the transfer that brought it in is older than the history this install has read.'
                    : undefined
                }
              />
            </Section>
          )}
        </div>

        <aside className="flex min-w-0 flex-col gap-6 py-10 md:py-12">
          <TierCard tier={tier} badges={badges} explained={explained} headingLevel={2} />
          <CollectorUpdates updates={updates} />
          <UpcomingReleases drops={drops} tier={tier} />
          <SourceNote
            source={profile.source}
            snapshotAt={profile.snapshotAt}
            gaps={profile.gaps}
            error={profile.error}
          />
        </aside>
      </div>
    </Container>
  );
}
