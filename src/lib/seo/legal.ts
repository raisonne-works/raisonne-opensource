import type { RichText, SiteSettings } from '@/lib/types';

/**
 * The two legal pages. They are data, not code: an install writes its own
 * policy into settings.legal and the pages render it, because a privacy
 * policy that ships with the theme would be a policy about somebody else's
 * site.
 *
 * A page with nothing written stays out of the footer, out of the sitemap and
 * out of search results, so no visitor follows a link to an empty promise.
 */

export type LegalKind = 'privacy' | 'terms';

export interface LegalPage {
  kind: LegalKind;
  href: string;
  title: string;
  description: string;
}

export const LEGAL_PAGES: Record<LegalKind, LegalPage> = {
  privacy: {
    kind: 'privacy',
    href: '/privacy',
    title: 'Privacy policy',
    description: 'What this site records about the people who visit it, and what it does with it.',
  },
  terms: {
    kind: 'terms',
    href: '/terms',
    title: 'Terms of service',
    description: 'The terms this site is offered under.',
  },
};

export function legalBody(settings: SiteSettings, kind: LegalKind): RichText | null {
  const body = kind === 'privacy' ? settings.legal.privacy : settings.legal.terms;
  return body && body.length > 0 ? body : null;
}

/** The legal links a footer should show: only the pages that have been written. */
export function legalLinks(settings: SiteSettings): LegalPage[] {
  return (Object.keys(LEGAL_PAGES) as LegalKind[])
    .filter(kind => legalBody(settings, kind) !== null)
    .map(kind => LEGAL_PAGES[kind]);
}
