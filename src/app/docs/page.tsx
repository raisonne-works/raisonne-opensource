import type { ReactNode } from 'react';
import type { Metadata } from 'next';

import { DesignSystemNav, type DesignSystemNavGroup } from '@/app/design-system/_components/design-system-nav';
import { Container, PageHeader, Section } from '@/components/raisonne/shell/page';
import { Badge } from '@/components/ui/badge';

import {
  ACCOUNT_TOPICS,
  AccountSection,
  AZ_TOPICS,
  AzSection,
  BROWSE_TOPICS,
  BrowseSection,
  DATA_TOPICS,
  DataSection,
  IMPORT_TOPICS,
  ImportSection,
  MORE_TOPICS,
  MoreSection,
  SERIES_TOPICS,
  SeriesSection,
  START_TOPICS,
  StartSection,
} from './_sections/content';

export const metadata: Metadata = {
  title: 'Docs',
  description:
    'How to build and run Raisonne: browse the catalogue, import art, manage series, and every feature from A to Z.',
  // Public how-to — shareable; not an owner workbench page.
  robots: { index: true, follow: true },
};

interface Group extends DesignSystemNavGroup {
  content: ReactNode;
  description?: string;
}

const GROUPS: readonly Group[] = [
  {
    id: 'start',
    label: 'Start here',
    description:
      'What Raisonne is, how to run a fresh clone, and the honest paths into a real catalogue in v0.1.',
    topics: START_TOPICS,
    content: <StartSection />,
  },
  {
    id: 'browse',
    label: 'How to use the site',
    description:
      'Navigation, the home page, and the public pages a visitor actually opens. Empty sections never appear in the menu.',
    topics: BROWSE_TOPICS,
    content: <BrowseSection />,
  },
  {
    id: 'series',
    label: 'Series and works',
    description:
      'The catalogue’s core: series records, single works, media, and the on-chain evidence that ties them to the artist.',
    topics: SERIES_TOPICS,
    content: <SeriesSection />,
  },
  {
    id: 'import',
    label: 'Import art',
    description:
      'Owner tool: paste minting wallets, watch chain passes, review series evidence, and choose what enters the catalogue.',
    topics: IMPORT_TOPICS,
    content: <ImportSection />,
  },
  {
    id: 'data',
    label: 'Your data',
    description:
      'Fixture files, snapshot commands, and how images are allowed. Local data stays local and gitignored.',
    topics: DATA_TOPICS,
    content: <DataSection />,
  },
  {
    id: 'accounts',
    label: 'Sign-in and collectors',
    description:
      'SIWE wallet sessions, collector pages, leaderboard and guild, and what only the owner can open.',
    topics: ACCOUNT_TOPICS,
    content: <AccountSection />,
  },
  {
    id: 'more',
    label: 'Insights, shop, modules',
    description:
      'Optional surfaces switched in settings.modules: insights, store, commissions, drops, and the rest.',
    topics: MORE_TOPICS,
    content: <MoreSection />,
  },
  {
    id: 'az',
    label: 'A–Z reference',
    description:
      'Every feature route, environment variable, the catalogue API, and how to update or deploy the app.',
    topics: AZ_TOPICS,
    content: <AzSection />,
  },
];

/**
 * Full how-to for this install and for a fresh clone: visitors’ paths, series,
 * import, data, and an A–Z of every surface. Public — not gated behind
 * RAISONNE_TOOLS (import and design-system still are).
 */
export default function DocsPage() {
  return (
    <Container className="pb-16 md:pb-24">
      <PageHeader
        eyebrow="Raisonne"
        title="Docs"
        description="How to build and run this catalogue: browse works, import art from your wallets, work with series, and look up every feature from A to Z."
        actions={
          <>
            <Badge variant="outline">v0.1</Badge>
            <Badge variant="outline">Self-hosted</Badge>
            <Badge variant="outline">One artist</Badge>
          </>
        }
      />

      <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10 xl:gap-16">
        <DesignSystemNav
          label="Docs"
          groups={GROUPS.map(({ id, label, topics }) => ({ id, label, topics }))}
        />

        <div className="min-w-0 [&_section[id]]:scroll-mt-28 lg:[&_section[id]]:scroll-mt-20 [&>*:first-child>section]:pt-6 lg:[&>*:first-child>section]:pt-0">
          {GROUPS.map(group => (
            <div key={group.id}>
              <Section id={group.id} title={group.label} description={group.description}>
                {group.content}
              </Section>
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
}
