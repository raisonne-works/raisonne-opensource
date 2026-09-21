import { parseCart } from './cart';
import type { CartLine, PostalAddress } from '@/lib/types';

/**
 * What a buyer types at checkout, and the rules that decide whether it is
 * usable.
 *
 * Pure and client safe on purpose. The form in the browser and the route
 * that creates the order call the same functions, so a visitor is told about
 * a missing postcode before they press Pay, and a request that skips the
 * form is refused by the same rule rather than by a different one that
 * happens to be laxer.
 *
 * Nothing here decides a price. Prices come from priceCart in ./cart, on the
 * server, from the install's own fixtures.
 */

/** Longest address an RFC-compliant mail server will accept. */
export const EMAIL_MAX_LENGTH = 254;

/** A note to the artist, not an essay. */
export const NOTE_MAX_LENGTH = 500;

/** Hidden field a person never fills in. A filled one is answered politely and dropped. */
export const CHECKOUT_HONEYPOT_FIELD = 'company';

/**
 * Where the browser remembers the last address used, so a returning buyer
 * does not retype it.
 *
 * This is what "saved addresses" means in an install with no customer
 * database: the address stays in the buyer's own browser, is offered back to
 * them on their next order, and is never held by the site beyond the orders
 * it belongs to.
 */
export const SAVED_ADDRESS_KEY = 'raisonne.checkout.address.v1';

const MAX_FIELD = 200;

// ---------------------------------------------------------------------------
// The request
// ---------------------------------------------------------------------------

export interface CheckoutRequest {
  lines: CartLine[];
  shippingMethodId: string | null;
  email: string;
  shippingAddress: PostalAddress;
  note: string | null;
}

/** Field name to the sentence shown under that field. Empty means the form is good. */
export type CheckoutErrors = Partial<Record<keyof PostalAddress | 'email' | 'shippingMethodId' | 'lines', string>>;

export function emptyAddress(country = ''): PostalAddress {
  return { name: '', line1: '', line2: '', city: '', region: '', postalCode: '', country, phone: '' };
}

// ---------------------------------------------------------------------------
// Checking one field at a time
// ---------------------------------------------------------------------------

/**
 * Deliberately loose: one @, something either side, a dot in the domain, no
 * spaces. Anything stricter starts refusing addresses that work, and the
 * only real test of an address is sending to it.
 */
export function isValidEmail(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const email = value.trim();
  return email.length <= EMAIL_MAX_LENGTH && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Countries that do not use a postal code. Asking a buyer in Hong Kong for
 * one, and refusing the order when they leave it empty, is a bug that only
 * shows up in the countries the developer does not live in.
 */
const NO_POSTAL_CODE = new Set([
  'AE', 'AG', 'AN', 'AO', 'AW', 'BF', 'BI', 'BJ', 'BO', 'BS', 'BW', 'BZ', 'CD', 'CF', 'CG', 'CI', 'CK', 'CM', 'DJ',
  'DM', 'ER', 'FJ', 'GA', 'GD', 'GH', 'GM', 'GQ', 'GY', 'HK', 'JM', 'KI', 'KM', 'KN', 'KP', 'LC', 'ML', 'MO', 'MR',
  'MS', 'MW', 'NR', 'NU', 'PA', 'QA', 'RW', 'SB', 'SC', 'SL', 'SO', 'SR', 'ST', 'SY', 'TF', 'TG', 'TK', 'TL', 'TO',
  'TT', 'TV', 'TZ', 'UG', 'VU', 'WS', 'YE', 'ZW',
]);

export function needsPostalCode(country: string): boolean {
  return !NO_POSTAL_CODE.has(country.trim().toUpperCase());
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, MAX_FIELD) : '';
}

function optional(value: unknown): string | null {
  const trimmed = text(value);
  return trimmed ? trimmed : null;
}

/** What is wrong with this contact and address, field by field. */
export function validateContact(email: string, address: PostalAddress): CheckoutErrors {
  const errors: CheckoutErrors = {};
  const country = address.country.trim().toUpperCase();

  if (!isValidEmail(email)) errors.email = 'Enter the address the order confirmation should go to.';
  if (!address.name.trim()) errors.name = 'Who should the parcel be addressed to?';
  if (!address.line1.trim()) errors.line1 = 'Enter the street and number.';
  if (!address.city.trim()) errors.city = 'Enter the town or city.';
  if (country.length !== 2 || !COUNTRY_CODES.includes(country)) errors.country = 'Choose the destination country.';
  else if (needsPostalCode(country) && !address.postalCode.trim()) errors.postalCode = 'Enter the postal code.';

  return errors;
}

export function hasErrors(errors: CheckoutErrors): boolean {
  return Object.keys(errors).length > 0;
}

// ---------------------------------------------------------------------------
// Reading a request body
// ---------------------------------------------------------------------------

/** An address from a form, a request body or local storage, trimmed and capped. */
export function parseAddress(value: unknown): PostalAddress {
  const raw = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
  return {
    name: text(raw.name),
    line1: text(raw.line1),
    line2: optional(raw.line2),
    city: text(raw.city),
    region: optional(raw.region),
    postalCode: text(raw.postalCode).toUpperCase(),
    country: text(raw.country).toUpperCase().slice(0, 2),
    phone: optional(raw.phone),
  };
}

/** An address the browser remembered, or null when there is nothing usable. */
export function parseStoredAddress(value: unknown): PostalAddress | null {
  const raw = typeof value === 'string' ? safeJson(value) : value;
  if (!raw) return null;
  const address = parseAddress(raw);
  return address.line1 && address.country ? address : null;
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

export type CheckoutParse =
  | { ok: true; request: CheckoutRequest }
  | { ok: false; errors: CheckoutErrors; message: string };

/**
 * The body of POST /api/checkout, checked before anything is priced.
 *
 * The cart goes through parseCart, which keeps slugs, variant ids and
 * quantities and throws away anything else a browser might have added: a
 * unit price sent from the client does not survive this function, let alone
 * reach the payment provider.
 */
export function parseCheckoutRequest(value: unknown): CheckoutParse {
  const body = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
  const lines = parseCart(body.lines);
  const email = text(body.email).toLowerCase();
  const shippingAddress = parseAddress(body.shippingAddress);
  const errors = validateContact(email, shippingAddress);

  if (lines.length === 0) errors.lines = 'There is nothing in the cart.';

  if (hasErrors(errors)) {
    return { ok: false, errors, message: 'Some details are missing.' };
  }

  return {
    ok: true,
    request: {
      lines,
      shippingMethodId: optional(body.shippingMethodId),
      email,
      shippingAddress,
      note: typeof body.note === 'string' ? body.note.trim().slice(0, NOTE_MAX_LENGTH) || null : null,
    },
  };
}

/** The body of POST /api/checkout/quote: a cart and, when the buyer has picked one, a shipping method. */
export function parseQuoteRequest(value: unknown): { lines: CartLine[]; shippingMethodId: string | null; country: string | null } {
  const body = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
  const country = text(body.country).toUpperCase().slice(0, 2);
  return {
    lines: parseCart(body.lines),
    shippingMethodId: optional(body.shippingMethodId),
    country: country.length === 2 ? country : null,
  };
}

// ---------------------------------------------------------------------------
// Showing an address back
// ---------------------------------------------------------------------------

/** An address as a parcel label reads it, one line per line. */
export function formatAddressLines(address: PostalAddress | null | undefined): string[] {
  if (!address) return [];
  const region = [address.city, address.region].filter(Boolean).join(', ');
  return [
    address.name,
    address.line1,
    address.line2 ?? '',
    [region, address.postalCode].filter(Boolean).join(' '),
    countryName(address.country),
  ].filter(line => line.trim().length > 0);
}

// ---------------------------------------------------------------------------
// Countries
// ---------------------------------------------------------------------------

/**
 * ISO 3166-1 alpha-2, as codes only. The names come from Intl, so the list
 * does not have to be translated or kept up to date by hand, and a country
 * the runtime has no name for falls back to its own code rather than
 * disappearing from the menu.
 */
export const COUNTRY_CODES: string[] = (
  'AD AE AF AG AI AL AM AO AR AT AU AW AZ BA BB BD BE BF BG BH BI BJ BM BN BO BR BS BT BW BY BZ CA CD CF CG CH CI ' +
  'CK CL CM CN CO CR CU CV CW CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI ' +
  'GL GM GN GP GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IM IN IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KR KW KY ' +
  'KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MO MQ MR MS MT MU MV MW MX MY MZ NA NC NE NG ' +
  'NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SI SK SL SM ' +
  'SN SO SR SS ST SV SX SY SZ TC TD TG TH TJ TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VG VI VN VU WS XK ' +
  'YE ZA ZM ZW'
).split(' ');

let regionNames: Intl.DisplayNames | null = null;

export function countryName(code: string | null | undefined): string {
  const value = code?.trim().toUpperCase();
  if (!value) return '';
  try {
    regionNames ??= new Intl.DisplayNames(['en'], { type: 'region' });
    return regionNames.of(value) ?? value;
  } catch {
    return value;
  }
}

/**
 * The menu, in alphabetical order by name.
 *
 * When the install ships methods that only serve some countries, those come
 * first under their own heading: a studio that only posts within Portugal
 * should not make a buyer scroll past 200 countries it will refuse.
 */
export function countryOptions(codes: readonly string[] = COUNTRY_CODES): { value: string; label: string }[] {
  return codes
    .map(value => ({ value, label: countryName(value) }))
    .sort((a, b) => a.label.localeCompare(b.label, 'en'));
}
