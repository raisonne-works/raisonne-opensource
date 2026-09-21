import type { Metadata } from 'next';

import { Cv } from '@/components/raisonne/profile/cv';
import { joinParts } from '@/components/raisonne/profile/format';
import { DownloadCvButton, PrintButton } from '@/components/raisonne/profile/print-button';
import { Container, PageHeader } from '@/components/raisonne/shell/page';
import { getSiteData } from '@/fixtures';
import { pageMetadata } from '@/lib/seo/metadata';

import './print.css';

export function generateMetadata(): Metadata {
  const { artist } = getSiteData();
  return pageMetadata('cv', {
    // Also the file name the browser suggests when the CV is saved as a PDF.
    title: `${artist.name} CV`,
    description: `Biography, experience, exhibitions, awards and press for ${artist.name}.`,
    path: '/cv',
    image: artist.portrait,
  });
}

/** "Demo-Artist-CV.pdf" */
function cvFileName(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return `${slug || 'Artist'}-CV.pdf`;
}

export default function CvPage() {
  const data = getSiteData();
  const { artist, cv } = data;

  return (
    <div data-print-root>
      <Container size="editorial" className="print:px-0">
        <PageHeader
          eyebrow="Curriculum vitae"
          title={artist.name}
          description={joinParts([artist.tagline, artist.location], ' · ') || undefined}
          actions={
            <>
              {/* An uploaded PDF wins; otherwise the route builds one from this same data. */}
              <DownloadCvButton href={cv?.pdfUrl ?? '/cv/download'} fileName={cvFileName(artist.name)} />
              <PrintButton />
            </>
          }
          className="print:py-0 print:pb-4"
        />
        <Cv data={data} className="pb-12 md:pb-16 print:pb-0" />
      </Container>
    </div>
  );
}
