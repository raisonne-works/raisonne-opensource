import { ArrowUpRightIcon, MailIcon } from 'lucide-react';

import { ArtistLinkList } from '@/components/raisonne/profile/artist-links';
import type { HeadingLevel } from '@/components/raisonne/shell/heading';
import { READING_LEAD_CLASS } from '@/components/raisonne/shell/measure';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Artist, ArtistLink } from '@/lib/types';
import { cn } from '@/lib/utils';

/** A mailto: link is a message, not a page: it opens the visitor's mail app in place. */
export function isMailto(href: string): boolean {
  return href.toLowerCase().startsWith('mailto:');
}

/**
 * The action that starts an enquiry: what the artist wrote, or their public
 * address when they wrote nothing. A commissions page with no way to make
 * contact is the one page that has failed at its job, so the address is the
 * safety net rather than an empty header.
 */
export function enquiryCta(cta: ArtistLink | null | undefined, artist: Pick<Artist, 'email'>): ArtistLink | null {
  if (cta) return cta;
  const email = artist.email?.trim();
  return email ? { label: 'Start a project', href: `mailto:${email}`, kind: 'email' } : null;
}

/**
 * The top of the commissions page: what the studio takes on, and the one
 * action that starts a project.
 *
 * The call to action is whatever the artist set, a mail address or a form,
 * and the button says which it is rather than opening a surprise.
 */
export function CommissionsHero({
  title,
  description,
  cta,
  elsewhere = [],
  headingLevel = 1,
  className,
}: {
  title: string;
  description?: string | null;
  cta?: ArtistLink | null;
  /** Where to reach the artist when the install carries no address at all. */
  elsewhere?: readonly ArtistLink[];
  headingLevel?: HeadingLevel;
  className?: string;
}) {
  const Heading = `h${headingLevel}` as const;

  return (
    <header className={cn('flex max-w-[52rem] flex-col gap-4 py-8 md:py-12', className)}>
      <Heading className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</Heading>
      {description ? (
        <p className={cn('text-base/relaxed text-pretty text-muted-foreground sm:text-lg/relaxed', READING_LEAD_CLASS)}>
          {description}
        </p>
      ) : null}
      {cta ? (
        <div className="flex flex-wrap gap-2 pt-2">
          <CommissionsCta cta={cta} />
        </div>
      ) : null}
      {!cta && elsewhere.length > 0 ? (
        <div className="flex flex-col gap-2 pt-2">
          <p id="commissions-reach" className="text-sm text-muted-foreground">
            The studio takes enquiries through these:
          </p>
          <ArtistLinkList links={elsewhere} labelledBy="commissions-reach" className="flex flex-wrap gap-x-5" />
        </div>
      ) : null}
    </header>
  );
}

/**
 * The "start a project" button. `subject` prefills the subject line of a
 * mail so an enquiry arrives saying which service it is about.
 */
export function CommissionsCta({
  cta,
  subject,
  variant = 'default',
  size = 'default',
  label,
}: {
  cta: ArtistLink;
  subject?: string;
  variant?: 'default' | 'outline';
  size?: 'default' | 'sm' | 'lg';
  label?: string;
}) {
  const mail = isMailto(cta.href);
  const href = mail && subject && !cta.href.includes('?') ? `${cta.href}?subject=${encodeURIComponent(subject)}` : cta.href;

  return (
    <Button
      variant={variant}
      size={size}
      nativeButton={false}
      render={<a href={href} {...(mail ? {} : { target: '_blank', rel: 'noopener noreferrer' })} />}
    >
      {label ?? cta.label}
      {mail ? (
        <MailIcon aria-hidden data-icon="inline-end" />
      ) : (
        <>
          <ArrowUpRightIcon aria-hidden data-icon="inline-end" />
          <span className="sr-only">(opens in a new tab)</span>
        </>
      )}
    </Button>
  );
}

export function CommissionsHeroSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-4 py-8 md:py-12', className)} role="status" aria-label="Loading commissions">
      <Skeleton className="h-9 w-2/3" />
      <Skeleton className="h-5 w-full max-w-[40rem]" />
      <Skeleton className="h-8 w-40" />
    </div>
  );
}
