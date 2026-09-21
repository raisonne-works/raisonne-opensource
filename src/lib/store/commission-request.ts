import { toMinor } from '@/lib/money';
import type { CommissionKind, CommissionRequest, StoreData } from '@/lib/types';

import { isValidEmail, parseAddress, validateContact } from './checkout';

/**
 * A commission brief, checked the same way in the browser and on the server.
 *
 * A commission is an enquiry, not a sale: no money moves here, nothing is
 * reserved, and the answer is the artist writing back. The form asks for
 * what the artist said they need (the questions in the install's own data)
 * and nothing more, because every extra field is a reason not to send it.
 *
 * Pure and client safe.
 */

export const BRIEF_MIN_LENGTH = 30;
export const BRIEF_MAX_LENGTH = 4000;
export const MAX_REFERENCES = 8;
export const MAX_ANSWER_LENGTH = 1000;
export const MAX_WORKS = 12;

/** Hidden field. A person leaves it empty. */
export const COMMISSION_HONEYPOT_FIELD = 'website';

export type CommissionErrors = Record<string, string>;

export type CommissionParse =
  | { ok: true; request: CommissionRequest }
  | { ok: false; errors: CommissionErrors; message: string };

export type CommissionForm = NonNullable<StoreData['commissionForm']>;

function text(value: unknown, max = 200): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

/**
 * A reference the visitor pasted. Only http and https survive: a brief is
 * shown back to the artist as links, and `javascript:` in a link the artist
 * clicks is the whole attack.
 */
export function parseReferences(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : [];
  const links: string[] = [];
  for (const entry of raw.slice(0, MAX_REFERENCES * 2)) {
    const url = text(entry, 500);
    if (!url) continue;
    if (!/^https?:\/\/\S+$/i.test(url)) continue;
    if (!links.includes(url)) links.push(url);
    if (links.length >= MAX_REFERENCES) break;
  }
  return links;
}

/** True when a string is a plausible reference link, for the field's own error. */
export function isReferenceLink(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value.trim());
}

/** A budget typed in whole currency units, or null when the visitor left it blank. */
export function parseBudget(value: unknown, currency: string): { amount: number; currency: string } | null {
  const raw = typeof value === 'number' ? value : Number(text(value, 20).replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(raw) || raw <= 0) return null;
  return { amount: toMinor(raw, currency), currency: currency.toUpperCase() };
}

/** An ISO date the visitor picked, when it is a real date that has not already passed. */
export function parseDeadline(value: unknown, now = new Date()): { date: string | null; error: string | null } {
  const raw = text(value, 10);
  if (!raw) return { date: null, error: null };
  const parsed = Date.parse(`${raw}T00:00:00Z`);
  if (Number.isNaN(parsed)) return { date: null, error: 'That is not a date.' };
  const today = Date.parse(`${now.toISOString().slice(0, 10)}T00:00:00Z`);
  if (parsed < today) return { date: null, error: 'That date has passed.' };
  return { date: raw, error: null };
}

/**
 * The whole brief.
 *
 * `form` is the artist's own list of kinds and questions, so a request can
 * only name a kind this install offers and only answer questions this
 * install asked. A required question with no answer is refused here rather
 * than landing in the artist's inbox as a gap they have to chase.
 */
export function parseCommissionRequest(
  value: unknown,
  { form, currency, now = new Date() }: { form: CommissionForm; currency: string; now?: Date },
): CommissionParse {
  const body = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
  const errors: CommissionErrors = {};

  const kindValue = text(body.kind, 20) as CommissionKind;
  const kind = form.kinds.find(entry => entry.kind === kindValue);
  if (!kind) errors.kind = 'Choose what kind of commission this is.';

  const artefact = text(body.artefact, 120);
  if (kind && kind.artefacts.length > 0 && artefact && !kind.artefacts.includes(artefact)) {
    errors.artefact = 'Choose one of the options.';
  }

  const brief = text(body.brief, BRIEF_MAX_LENGTH);
  if (brief.length < BRIEF_MIN_LENGTH) {
    errors.brief = `Say a little more: at least ${BRIEF_MIN_LENGTH} characters, so the studio can answer properly.`;
  }

  const rawSpecs = (typeof body.specs === 'object' && body.specs !== null ? body.specs : {}) as Record<string, unknown>;
  const specs: Record<string, string> = {};
  for (const question of form.questions) {
    const answer = text(rawSpecs[question.id], MAX_ANSWER_LENGTH);
    if (answer) specs[question.id] = answer;
    else if (question.required) errors[`specs.${question.id}`] = 'This one is needed.';
  }

  const email = text(body.email, 254).toLowerCase();
  if (!isValidEmail(email)) errors.email = 'Enter the address the studio should reply to.';

  const budget = parseBudget(body.budget, currency);
  const deadline = parseDeadline(body.deadline, now);
  if (deadline.error) errors.deadline = deadline.error;

  const workIds = Array.isArray(body.workIds)
    ? [...new Set(body.workIds.map(entry => text(entry, 200)).filter(Boolean))].slice(0, MAX_WORKS)
    : [];

  // A physical object has to go somewhere. It is asked for here rather than
  // later, because the artist quoting for a print needs to know which
  // country it is being posted to.
  const wantsAddress = kindValue === 'phygital';
  const shippingAddress = wantsAddress ? parseAddress(body.shippingAddress) : null;
  if (shippingAddress?.line1) {
    // An address that has been started has to be finished. The same rules as
    // checkout, under their own keys so they cannot collide with a question.
    const addressErrors = validateContact(email, shippingAddress);
    for (const [field, message] of Object.entries(addressErrors)) {
      if (field !== 'email' && message) errors[`address.${field}`] = message;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, message: 'Some answers are missing.' };
  }

  return {
    ok: true,
    request: {
      kind: kindValue,
      artefact: artefact || null,
      brief,
      specs,
      references: parseReferences(body.references),
      workIds,
      budget,
      deadline: deadline.date,
      email,
      shippingAddress: shippingAddress?.line1 ? shippingAddress : null,
    },
  };
}
