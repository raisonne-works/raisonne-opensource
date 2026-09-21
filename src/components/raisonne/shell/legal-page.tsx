import Link from 'next/link';
import { FileTextIcon } from 'lucide-react';

import { Container, PageHeader } from '@/components/raisonne/shell/page';
import { RichTextView } from '@/components/raisonne/shell/rich-text';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import type { LegalPage as LegalPageMeta } from '@/lib/seo/legal';
import type { RichText } from '@/lib/types';

import { EMPTY_BLOCK_CLASS } from './measure';

/**
 * A legal page: the artist's own text, in one reading column.
 *
 * When the install has written nothing, the page says so plainly instead of
 * showing a policy the artist never agreed to. The footer leaves the link out
 * in that case (see legalLinks), so this state is only reached by typing the
 * address.
 */
export function LegalPage({
  page,
  body,
  updatedAt,
  contactEmail,
}: {
  page: LegalPageMeta;
  body: RichText | null;
  /** ISO date, shown as "Last updated". */
  updatedAt?: string | null;
  contactEmail?: string | null;
}) {
  const updated = formatDate(updatedAt);

  return (
    <Container size="text" className="pb-16 md:pb-24">
      <PageHeader title={page.title} description={page.description} />

      {body ? (
        <article className="flex flex-col gap-6">
          <RichTextView value={body} />
          <footer className="flex flex-col gap-1 border-t pt-6 text-sm text-muted-foreground">
            {updated ? <p>Last updated {updated}.</p> : null}
            {contactEmail ? (
              <p>
                Questions about this page:{' '}
                <a className="underline underline-offset-4 hover:text-foreground" href={`mailto:${contactEmail}`}>
                  {contactEmail}
                </a>
                .
              </p>
            ) : null}
          </footer>
        </article>
      ) : (
        <Empty className={EMPTY_BLOCK_CLASS}>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileTextIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No {page.title.toLowerCase()} yet</EmptyTitle>
            <EmptyDescription>
              This install has not published one. It is written in the site settings, under legal, and appears here and
              in the footer as soon as it exists.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
              Back to the catalogue
            </Button>
          </EmptyContent>
        </Empty>
      )}
    </Container>
  );
}

function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return null;
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    parsed,
  );
}
