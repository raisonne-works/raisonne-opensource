import { isModuleEnabled } from '@/lib/records';
import type { SiteSettings } from '@/lib/types';

/**
 * The only write the whole of Wave 1 makes.
 *
 * Raisonne stores nothing itself, so a sign-up is forwarded to whatever the
 * install already uses: a Buttondown or Mailchimp endpoint, a form service, a
 * webhook. RAISONNE_NEWSLETTER_URL is that address.
 *
 * With no endpoint configured the form is not rendered at all. A sign-up box
 * that quietly drops addresses is worse than no box: the visitor believes
 * they subscribed. This is the check a page runs before rendering the form,
 * and the route refuses for the same reason.
 */

/**
 * The field a real person never fills in. The form renders it hidden from
 * sight and from screen readers; anything that arrives with it filled is a
 * bot, and is answered with the same success the person would see.
 */
export const NEWSLETTER_HONEYPOT_FIELD = 'company';

/** Longest address accepted. Anything longer is not an address. */
export const EMAIL_MAX_LENGTH = 200;

/** Where a sign-up came from, e.g. the footer or a drop's slug. */
export const SOURCE_MAX_LENGTH = 64;

export function newsletterEndpoint(): string | null {
  const raw = process.env.RAISONNE_NEWSLETTER_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

/** True when a page may render the sign-up form: the module is on and a destination exists. */
export function newsletterEnabled(settings: SiteSettings | null | undefined): boolean {
  return isModuleEnabled(settings, 'newsletter') && newsletterEndpoint() !== null;
}

/**
 * What a page should do about the sign-up.
 *
 *  - `on`: render the form; there is somewhere for an address to go.
 *  - `unconfigured`: the artist switched the module on but set no endpoint.
 *    Shipping a working-looking box that drops addresses is worse than no
 *    box, and silently showing nothing leaves them wondering where their
 *    sign-up went, so while they are working locally the block is rendered
 *    switched off with a line saying which variable to set.
 *  - `off`: render nothing. This is what a visitor ever sees.
 */
export type NewsletterState = 'on' | 'unconfigured' | 'off';

export function newsletterState(settings: SiteSettings | null | undefined): NewsletterState {
  if (!isModuleEnabled(settings, 'newsletter')) return 'off';
  if (newsletterEndpoint() !== null) return 'on';
  return 'unconfigured';
}

/**
 * The line the switched-off block carries, so the fix is in the page itself.
 *
 * It used to end "Nobody else sees this block", which was published to every
 * visitor on every route: a claim that asserted the opposite of what was
 * happening. The block is now rendered inside OwnerOnly, so a visitor gets
 * no sign-up form at all rather than one that drops addresses, and the
 * sentence is true.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return value.length > 0 && value.length <= EMAIL_MAX_LENGTH && EMAIL_PATTERN.test(value);
}

/** A source tag is a slug: letters, numbers and dashes, so nothing arbitrary is forwarded. */
export function normalizeSource(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const source = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SOURCE_MAX_LENGTH);
  return source || null;
}
