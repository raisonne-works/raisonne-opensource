import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LayersIcon } from 'lucide-react';
import type { Metadata } from 'next';

import { BadgeBoard } from '@/components/raisonne/guild/badge-board';
import { LEADERBOARD_PATH } from '@/components/raisonne/guild/lib';
import { RankingExplainer } from '@/components/raisonne/guild/ranking-explainer';
import { TierLadder } from '@/components/raisonne/guild/tier-ladder';
import { NoChainData } from '@/components/raisonne/insights/no-chain-data';
import { SnapshotNote } from '@/components/raisonne/insights/snapshot-note';
import { EMPTY_BLOCK_CLASS } from '@/components/raisonne/shell/measure';
import { Container, PageHeader, Section } from '@/components/raisonne/shell/page';
import { RichTextView } from '@/components/raisonne/shell/rich-text';
import { formatCount } from '@/components/raisonne/works/lib';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { getSettings, getSiteData } from '@/fixtures';
import { chainDataState } from '@/lib/chain/holdings';
import { ENV_DOCS, isConfigured, surfaceState } from '@/lib/config';
import { badgeCatalogue, badgeCounts, suspendedRules } from '@/lib/guild';
import { getGuildBoard } from '@/lib/guild/read';
import { pageMetadata } from '@/lib/seo/metadata';

/**
 * The model behind the leaderboard, written out.
 *
 * Two halves. The tiers are the artist's ladder: their names, their words and
 * their benefits, filled in by percentile of the ranking. The badges are
 * facts: each one is a rule this install can check in its own snapshot, and
 * each is printed with the exact sentence that earns it, so nobody has to
 * guess what a chip on a row means or whether it was handed out.
 *
 * Anything the install cannot check is marked as given by the artist, and any
 * rule that a truncated snapshot makes unsafe is marked as standing down.
 * Neither is quietly dropped: a model that hides its own gaps is a model that
 * cannot be argued with.
 */

export function generateMetadata(): Metadata {
  const { artist } = getSiteData();
  return pageMetadata('guild', {
    title: 'Tiers and badges',
    description: `How collectors of ${artist.name} are ranked, what each tier means, and exactly what earns each badge. All of it computed from public on-chain facts.`,
    path: '/leaderboard/guild',
  });
}

export default function GuildPage() {
  const settings = getSettings();
  if (surfaceState(settings, 'insights') === 'off') notFound();

  const board = getGuildBoard();
  const chain = chainDataState();

  if (!board) {
    return (
      <Container size="editorial" className="pb-16 md:pb-24">
        <PageHeader
          title="Tiers and badges"
          description="How the leaderboard is ranked, and what each tier and badge is worked out from."
        />
        <NoChainData
          missing={isConfigured('chain') ? [] : [{ name: 'ALCHEMY_API_KEY', detail: ENV_DOCS.ALCHEMY_API_KEY ?? '' }]}
        />
      </Container>
    );
  }

  const { guild } = board;
  const badges = badgeCatalogue(board.badges);
  const counts = badgeCounts(board.standings);
  const suspended = suspendedRules(board.facts);

  return (
    <Container size="editorial" className="pb-16 md:pb-24">
      <PageHeader
        eyebrow="Insights"
        title={guild?.title?.trim() || 'Tiers and badges'}
        description={
          guild?.description?.trim() ||
          'Where a wallet sits on the leaderboard, what that is called, and exactly which on-chain fact earns each badge. Nothing here is applied for, and nothing is decided by hand unless it says so.'
        }
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href={LEADERBOARD_PATH} />}>
            The leaderboard
          </Button>
        }
      />

      {guild?.intro ? <RichTextView value={guild.intro} headingLevel={2} /> : null}

      <SnapshotNote
        meta={{
          computedAt: board.snapshot.computedAt,
          live: chain.live,
          gaps: board.snapshot.gaps,
          contracts: board.snapshot.contracts,
          truncated: board.snapshot.truncated ? 1 : 0,
        }}
      />

      <Section
        title="The ladder"
        headingLevel={2}
        description={
          board.tiers.length > 0
            ? `Tiers are bands of the ranking. With ${formatCount(board.total)} ${board.total === 1 ? 'wallet' : 'wallets'} ranked today, this is who is in each one.`
            : undefined
        }
      >
        {board.tiers.length > 0 ? (
          <TierLadder distribution={board.distribution} ranked={board.total} headingLevel={3} />
        ) : (
          <Empty className={EMPTY_BLOCK_CLASS}>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <LayersIcon />
              </EmptyMedia>
              <EmptyTitle>No tiers yet</EmptyTitle>
              <EmptyDescription>
                A tier is the artist&rsquo;s own writing: a name, a percentile band and what it carries. This install
                has none, so the leaderboard is a ranking and nothing more.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent className="text-left">
              <p className="text-xs text-muted-foreground">
                Tiers are read from <code className="font-mono">src/fixtures/local/guild.json</code>, which{' '}
                <code className="font-mono">pnpm snapshot</code> writes from the studio&rsquo;s CMS, or from the{' '}
                <code className="font-mono">guild</code> key in the catalogue data.
              </p>
            </EmptyContent>
          </Empty>
        )}
      </Section>

      <Section
        title="Badges"
        headingLevel={2}
        description="Every badge this install can award, and the fact in the snapshot that awards it. A wallet earns one by holding, not by asking."
      >
        <BadgeBoard
          badges={badges}
          categories={board.badgeCategories}
          counts={counts}
          suspended={suspended}
          headingLevel={3}
        />
      </Section>

      <Section
        title="How the ranking works"
        headingLevel={2}
        description="The order on the leaderboard, and what it deliberately leaves out."
      >
        <RankingExplainer />
      </Section>

      <Section title="What this install can and cannot see" headingLevel={2}>
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-medium">How it is worked out</h3>
            <ul className="flex flex-col gap-3 text-sm text-muted-foreground">
              <li>
                Holdings, transfers and mints are read from the artist&rsquo;s own contracts and written to a file. The
                pages read that file, so every visitor sees the same list, dated.
              </li>
              <li>
                Tiers are bands of the ranking. A tier with no band is never assigned automatically, and a tier written
                into the snapshot by hand is left as the artist set it.
              </li>
              <li>
                Every figure is a count or a date. There is no price anywhere on these pages, because a sale settled in
                WETH or through a marketplace contract carries no value in the transaction itself.
              </li>
              <li>
                Nothing here is private. An address, an ENS name and a transfer are public records; an email, a name and
                a sign-up are not, and none of them reach this page.
              </li>
            </ul>
          </div>

          {guild?.howItWorks && guild.howItWorks.length > 0 ? (
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-medium">From the studio</h3>
              <dl className="flex flex-col gap-4">
                {guild.howItWorks.map(block => (
                  <div key={block.title} className="flex flex-col gap-0.5">
                    <dt className="text-sm font-medium">{block.title}</dt>
                    {block.description ? <dd className="text-sm text-muted-foreground">{block.description}</dd> : null}
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
        </div>
      </Section>
    </Container>
  );
}
