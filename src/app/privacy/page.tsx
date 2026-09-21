import type { Metadata } from 'next';

import { LegalPage } from '@/components/raisonne/shell/legal-page';
import { getSiteData } from '@/fixtures';
import { LEGAL_PAGES, legalBody } from '@/lib/seo/legal';
import { pageMetadata } from '@/lib/seo/metadata';

const PAGE = LEGAL_PAGES.privacy;

export function generateMetadata(): Metadata {
  const { settings } = getSiteData();
  return pageMetadata('privacy', {
    title: PAGE.title,
    description: PAGE.description,
    path: PAGE.href,
    // An unwritten policy is not worth a search result.
    noIndex: legalBody(settings, 'privacy') === null,
  });
}

export default function PrivacyPage() {
  const { settings, artist } = getSiteData();

  return (
    <LegalPage
      page={PAGE}
      body={legalBody(settings, 'privacy')}
      updatedAt={settings.legal.updatedAt}
      contactEmail={artist.email}
    />
  );
}
