import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Container, PageHeader, Section } from '@/components/raisonne/shell/page';
import { Badge } from '@/components/ui/badge';
import { ownerToolsEnabled } from '@/lib/tools';

import { DesignSystemNav, type DesignSystemNavGroup } from './_components/design-system-nav';
import { CATALOGUE_TOPICS, CatalogueSection } from './_sections/catalogue';
import { FOUNDATION_TOPICS, FoundationsSection } from './_sections/foundations';
import { ImportSection } from './_sections/import';
import { LANDING_TOPICS, LandingSection } from './_sections/landing';
import { PROFILE_TOPICS, ProfileSection } from './_sections/profile';
import { RECORDS_TOPICS, RecordsSection } from './_sections/records';
import { SITE_TOPICS, SiteSection } from './_sections/site';
import { WORKS_TOPICS, WorksSection } from './_sections/works';

export const metadata: Metadata = {
  title: 'Design system',
  description:
    'The living design system of this Raisonne site: tokens, type, layout and every component, built on standard shadcn/ui.',
  // Developer documentation, not part of the catalogue.
  robots: { index: false, follow: false },
};

interface Group extends DesignSystemNavGroup {
  content: ReactNode;
  /**
   * Set when the section file renders its own top-level Section with this id,
   * a title and a description, so the page adds nothing around it and the
   * heading and anchor are never doubled. Otherwise the page wraps the content
   * in a Section with `label` and `description`.
   */
  rendersOwnSection?: boolean;
  description?: string;
}

const GROUPS: readonly Group[] = [
  {
    id: 'foundations',
    label: 'Foundations',
    description:
      'Colour, type, radius, layout and the shadcn/ui primitives everything else is made from. Standard shadcn with its neutral theme: no custom look to learn.',
    topics: FOUNDATION_TOPICS,
    content: <FoundationsSection />,
  },
  {
    id: 'site',
    label: 'Site',
    description:
      'The plumbing every page depends on and no visitor sees directly: share cards, structured data, the sitemap and robots, the module switches, the two endpoints, and the legal and maintenance pages.',
    topics: SITE_TOPICS,
    content: <SiteSection />,
  },
  {
    id: 'catalogue',
    label: 'Catalogue',
    description:
      'How a visitor finds anything: the one index behind every list, its card, its table, its wall, and the search, sort and facets that all live in the URL.',
    topics: CATALOGUE_TOPICS,
    content: <CatalogueSection />,
  },
  {
    id: 'works',
    label: 'Works',
    description: 'The catalogue itself: series, works, their media and the on-chain evidence behind each one.',
    topics: WORKS_TOPICS,
    content: <WorksSection />,
  },
  {
    id: 'records',
    label: 'Records',
    description:
      'Everything that is not a token: shows, installations, physical works, collaborations, awards, writings, press and commissions, and the eleven story blocks their pages are built from. Each block is shown with this install\'s own content, with a written sample where it uses none.',
    topics: RECORDS_TOPICS,
    content: <RecordsSection />,
  },
  {
    id: 'landing',
    label: 'Landing',
    description:
      'The home page, block by block: the hero and the studio ticker, the reel, the numbers, the featured work of any type, the partners, the news and the sign-up. Every block is optional in the data, so each one is shown with what this install has and in the state a fresh clone is in.',
    topics: LANDING_TOPICS,
    content: <LandingSection />,
  },
  {
    id: 'profile',
    label: 'Profile',
    description:
      'The artist around the work: the home hero, the blocks the About page is made of, exhibitions, awards, press and the full CV.',
    topics: PROFILE_TOPICS,
    content: <ProfileSection />,
  },
  {
    id: 'import',
    label: 'Import',
    topics: [
      { id: 'import-flow', label: 'The whole flow' },
      { id: 'import-steps', label: 'Steps' },
    ],
    content: <ImportSection />,
    rendersOwnSection: true,
  },
];

export default function DesignSystemPage() {
  // One of the artist's tools (see src/lib/tools.ts), not a visitor page.
  if (!ownerToolsEnabled()) notFound();

  return (
    <Container className="pb-16 md:pb-24">
      <PageHeader
        eyebrow="For the artist"
        title="Design system"
        description="The components this site is built from, rendered live with its own data. Standard shadcn/ui on Base UI, neutral and quiet, so the art carries the colour."
        actions={
          <>
            <Badge variant="outline">shadcn/ui</Badge>
            <Badge variant="outline">Base UI</Badge>
            <Badge variant="outline">Tailwind v4</Badge>
          </>
        }
      />

      <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10 xl:gap-16">
        <DesignSystemNav groups={GROUPS.map(({ id, label, topics }) => ({ id, label, topics }))} />

        {/* Anchored sections clear the sticky bar on phones and only the header from lg. */}
        <div className="min-w-0 [&_section[id]]:scroll-mt-28 lg:[&_section[id]]:scroll-mt-20 [&>*:first-child>section]:pt-6 lg:[&>*:first-child>section]:pt-0">
          {GROUPS.map(group =>
            group.rendersOwnSection ? (
              <div key={group.id}>{group.content}</div>
            ) : (
              <div key={group.id}>
                <Section id={group.id} title={group.label} description={group.description}>
                  {group.content}
                </Section>
              </div>
            ),
          )}
        </div>
      </div>
    </Container>
  );
}
