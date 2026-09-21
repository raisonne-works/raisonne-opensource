import type { Metadata } from 'next';

import { UpdatePanel } from '@/components/raisonne/update/update-panel';
import { Container, PageHeader } from '@/components/raisonne/shell/page';
import { requireOwner } from '@/lib/auth/guards';

export const metadata: Metadata = {
  title: 'Update',
  description: 'Keep this Raisonne install on the latest release of the app.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * The artist’s place to update the whole Raisonne app.
 *
 * Not a CMS payload sync and not a catalogue refresh: those are `pnpm snapshot`
 * and `pnpm snapshot:chain`. This page is the app itself — version, latest
 * release, and an apply button when the install is a git checkout that is
 * allowed to pull.
 */
export default async function UpdatePage() {
  await requireOwner({ next: '/update' });

  return (
    <Container size="editorial">
      <PageHeader
        eyebrow="For the artist"
        title="Update Raisonne"
        description="Check the latest release of the app and pull it into this install. Your catalogue, orders and environment files stay where they are."
      />
      <UpdatePanel className="pb-12 md:pb-16" />
    </Container>
  );
}
