import type { Metadata } from 'next';

import { LegalPage } from '@/components/raisonne/shell/legal-page';
import { getSiteData } from '@/fixtures';
import { LEGAL_PAGES, legalBody } from '@/lib/seo/legal';
import { pageMetadata } from '@/lib/seo/metadata';

const PAGE = LEGAL_PAGES.terms;

export function generateMetadata(): Metadata {
  const { settings } = getSiteData();
  return pageMetadata('terms', {
    title: PAGE.title,
    description: PAGE.description,
    path: PAGE.href,
    noIndex: legalBody(settings, 'terms') === null,
  });
}

export default function TermsPage() {
  const { settings, artist } = getSiteData();

  return (
    <LegalPage
      page={PAGE}
      body={legalBody(settings, 'terms')}
      updatedAt={settings.legal.updatedAt}
      contactEmail={artist.email}
    />
  );
}
