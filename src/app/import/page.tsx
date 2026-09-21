import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ImportReplay } from '@/components/raisonne/import/import-replay';
import { replayMeta } from '@/components/raisonne/import/import-source';
import { Container, PageHeader } from '@/components/raisonne/shell/page';
import { getImportReplay } from '@/fixtures';
import { ownerToolsEnabled } from '@/lib/tools';

export const metadata: Metadata = {
  title: 'Import',
  description: 'Find the works your wallets created on Ethereum and Base, with the on-chain evidence for every series.',
  // The artist's own tool, and it names wallets and unconfirmed contracts.
  robots: { index: false, follow: false },
};

/**
 * The import, replayed from a recorded run until the live importer ships.
 * The recording is fetched from /import/replay when the run starts, the way
 * a live importer would stream it, so the page itself stays small.
 *
 * It is one of the artist's tools, so it is only served when they are on
 * (see src/lib/tools.ts).
 */
export default function ImportPage() {
  if (!ownerToolsEnabled()) notFound();

  const { request, durationMs } = replayMeta(getImportReplay());

  return (
    <Container>
      <PageHeader
        eyebrow="For the artist"
        title="Your works, from your wallets"
        description="Paste the wallets you minted from. The import finds the contracts you deployed and the works you created on Ethereum and Base, shows the on-chain evidence for every series, and lets you choose what goes into your catalogue."
      />
      <ImportReplay
        endpoint="/import/replay"
        request={request}
        durationMs={durationMs}
        className="pb-12 md:pb-16"
      />
    </Container>
  );
}
