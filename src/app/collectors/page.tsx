import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import type { RawSearchParams } from '@/components/raisonne/catalogue/lib';
import { CollectorDirectory } from '@/components/raisonne/collectors/collector-directory';
import { SourceNote } from '@/components/raisonne/collectors/collector-states';
import { DirectorySearch } from '@/components/raisonne/collectors/directory-search';
import { directoryPage, parseDirectoryState } from '@/components/raisonne/collectors/lib';
import { SetupPanel } from '@/components/raisonne/auth/setup-panel';
import { LEADERBOARD_PATH } from '@/components/raisonne/guild/lib';
import { NoChainData } from '@/components/raisonne/insights/no-chain-data';
import { Container, PageHeader } from '@/components/raisonne/shell/page';
import { formatCount } from '@/components/raisonne/works/lib';
import { Button } from '@/components/ui/button';
import { getChainSnapshot, getSeries, getSettings, getTiers } from '@/fixtures';
import { loadDirectory } from '@/lib/collectors';
import { ENV_DOCS, isConfigured, surfaceRequirements, surfaceState } from '@/lib/config';
import { pageMetadata } from '@/lib/seo/metadata';
import { slot } from '@/lib/theme';

/**
 * Everyone holding the artist's work, from the install's own chain snapshot.
 *
 * Searchable, sortable by five orders, narrowable to one series and paged,
 * all of it on the server and all of it in the URL: a row's place in this
 * list is a link somebody can send.
 *
 * Sign-in is not needed to read it, so a missing session secret does not
 * hide the list. It puts a notice above it instead, because the person who
 * can fix that is the artist and the rows are true either way.
 */

export function generateMetadata(): Metadata {
  // The snapshot itself, rather than loadDirectory(), so building the title
  // does not cost the same pass over every holder the page is about to make.
  const ranked = getChainSnapshot()?.leaderboard.length ?? 0;
  return pageMetadata('collectors', {
    title: 'Collectors',
    description: ranked
      ? `The ${formatCount(ranked)} wallets holding work by this artist.`
      : 'The wallets holding work by this artist.',
    path: '/collectors',
    // A directory with nothing in it yet is not worth a search result.
    noIndex: ranked === 0,
  });
}

export default async function CollectorsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  slot('collectors');
  const settings = getSettings();
  const state = surfaceState(settings, 'collectors');
  if (state === 'off') notFound();

  const params = await searchParams;
  const directoryState = parseDirectoryState(params);
  // A series in the URL that this install does not have is dropped rather
  // than answered with an empty list nobody asked for.
  const seriesSlug = directoryState.series && getSeries(directoryState.series) ? directoryState.series : '';
  const resolved = { ...directoryState, series: seriesSlug };

  const data = loadDirectory(seriesSlug || undefined);
  const showLabels = settings.showOwners;
  const page = directoryPage(data.rows, resolved, { showLabel: showLabels });

  const tiers = getTiers();
  const ranked = surfaceState(settings, 'insights') !== 'off' && data.rows.length > 0;

  return (
    <Container size="editorial" className="pb-16 md:pb-24">
      <PageHeader
        title="Collectors"
        description={
          data.hasSnapshot
            ? `Every wallet holding a work by this artist, as the last chain snapshot recorded it. Addresses and holdings are public on-chain; nothing else is kept here.${settings.publicCollectorProfiles === true ? '' : ' A wallet\u2019s own page is not published on this install, so the rows do not link anywhere.'}`
            : 'Every wallet holding a work by this artist, once the install has read the chain.'
        }
        actions={
          // The same wallets, ranked and explained, live with the insights
          // module. The link appears only where that page exists.
          ranked ? (
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href={LEADERBOARD_PATH} />}>
              Ranked, with tiers
            </Button>
          ) : null
        }
      />

      {state === 'unconfigured' ? (
        <SetupPanel
          statuses={surfaceRequirements('collectors')}
          title="Collectors cannot sign in yet"
          visitorNote="This list is public and true either way. Signing in is what lets a collector open their own page."
          className="mb-8"
        />
      ) : null}

      {data.hasSnapshot ? (
        <div className="flex flex-col gap-8">
          <CollectorDirectory
            page={page}
            state={resolved}
            series={data.series}
            tiers={tiers}
            rankedTotal={data.rankedTotal}
            showLabels={showLabels}
            linkProfiles={settings.publicCollectorProfiles === true}
            search={<DirectorySearch state={resolved} />}
          />
          <SourceNote source="snapshot" snapshotAt={data.computedAt} gaps={data.gaps} />
        </div>
      ) : (
        <NoChainData
          missing={isConfigured('chain') ? [] : [{ name: 'ALCHEMY_API_KEY', detail: ENV_DOCS.ALCHEMY_API_KEY ?? '' }]}
        />
      )}
    </Container>
  );
}
