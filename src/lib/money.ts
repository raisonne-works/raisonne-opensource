import type { Money, TokenAmount } from '@/lib/types';

/**
 * Money, on-chain amounts and the numbers beside them.
 *
 * Two rules the whole of Waves 2 and 3 keeps:
 *
 *  1. A price is an integer in the currency's minor unit. Floats are not
 *     money: 0.1 + 0.2 is not 0.3, and a store that adds prices in floats
 *     eventually charges a cent too many. Everything arrives from the
 *     fixtures as minor units, is added as integers, and is only turned into
 *     something readable at the last moment.
 *  2. An on-chain amount is a decimal string with its own number of decimals.
 *     18 decimals of wei does not fit in a JavaScript number, so it is never
 *     put in one; it is divided for display and nothing else.
 *
 * Every function here is pure and runs in the browser as well as on the
 * server. Dates are elsewhere: formatDate, formatMonth and formatDateTime in
 * src/components/raisonne/works/lib.ts already do those, and a second set
 * would drift from the first.
 */

// ---------------------------------------------------------------------------
// Currencies
// ---------------------------------------------------------------------------

/**
 * Currencies whose minor unit is not two digits. Everything not listed has
 * two, which covers every currency a print shop is likely to price in.
 */
const MINOR_UNITS: Record<string, number> = {
  BHD: 3,
  BIF: 0,
  CLP: 0,
  DJF: 0,
  GNF: 0,
  ISK: 0,
  JOD: 3,
  JPY: 0,
  KMF: 0,
  KRW: 0,
  KWD: 3,
  OMR: 3,
  PYG: 0,
  RWF: 0,
  TND: 3,
  UGX: 0,
  UYI: 0,
  VND: 0,
  VUV: 0,
  XAF: 0,
  XOF: 0,
  XPF: 0,
};

/** How many digits this currency's minor unit has. Two unless it is one of the exceptions. */
export function minorUnits(currency: string): number {
  return MINOR_UNITS[currency.toUpperCase()] ?? 2;
}

/** The locale prices are printed in. Fixed, so the server and the browser never disagree. */
export const MONEY_LOCALE = 'en-US';

// ---------------------------------------------------------------------------
// Building and doing arithmetic on money
// ---------------------------------------------------------------------------

export function money(amount: number, currency: string): Money {
  return { amount: Math.round(amount), currency: currency.toUpperCase() };
}

/** 12.5 USD becomes 1250. Use this once, where a human wrote the number. */
export function toMinor(major: number, currency: string): number {
  return Math.round(major * 10 ** minorUnits(currency));
}

/** 1250 USD becomes 12.5. For a provider's API that wants major units, and for nothing else. */
export function fromMinor(amount: number, currency: string): number {
  return amount / 10 ** minorUnits(currency);
}

function sameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot add ${a.currency} to ${b.currency}: one store, one currency (StoreData.currency)`);
  }
}

export function addMoney(a: Money, b: Money): Money {
  sameCurrency(a, b);
  return { amount: a.amount + b.amount, currency: a.currency };
}

export function subtractMoney(a: Money, b: Money): Money {
  sameCurrency(a, b);
  return { amount: a.amount - b.amount, currency: a.currency };
}

/** A line total. The quantity is an integer, so this stays exact. */
export function multiplyMoney(value: Money, quantity: number): Money {
  return { amount: value.amount * Math.round(quantity), currency: value.currency };
}

/** Adds up a basket. An empty basket is zero in the currency given, not null. */
export function sumMoney(values: readonly Money[], currency: string): Money {
  const total = values.reduce((sum, value) => {
    if (value.currency.toUpperCase() !== currency.toUpperCase()) {
      throw new Error(`Cannot total ${value.currency} into ${currency}`);
    }
    return sum + value.amount;
  }, 0);
  return { amount: total, currency: currency.toUpperCase() };
}

export function isZeroMoney(value: Money): boolean {
  return value.amount === 0;
}

export function compareMoney(a: Money, b: Money): number {
  sameCurrency(a, b);
  return a.amount - b.amount;
}

export function zeroMoney(currency: string): Money {
  return { amount: 0, currency: currency.toUpperCase() };
}

// ---------------------------------------------------------------------------
// Printing money
// ---------------------------------------------------------------------------

const moneyFormatters = new Map<string, Intl.NumberFormat>();

function moneyFormatter(currency: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${currency}:${JSON.stringify(options)}`;
  let formatter = moneyFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(MONEY_LOCALE, { style: 'currency', currency, ...options });
    moneyFormatters.set(key, formatter);
  }
  return formatter;
}

/**
 * "$120.00", or "$120" when the price is whole and the caller asked for it.
 * An unknown currency code would make Intl throw, so it falls back to
 * "120.00 XYZ" rather than taking a page down over a typo in the data.
 */
export function formatMoney(value: Money | null | undefined, { compactWhole = false } = {}): string | null {
  if (!value || !Number.isFinite(value.amount)) return null;
  const digits = minorUnits(value.currency);
  const major = fromMinor(value.amount, value.currency);
  const whole = compactWhole && value.amount % 10 ** digits === 0;
  try {
    return moneyFormatter(value.currency, {
      minimumFractionDigits: whole ? 0 : digits,
      maximumFractionDigits: whole ? 0 : digits,
    }).format(major);
  } catch {
    return `${major.toFixed(whole ? 0 : digits)} ${value.currency}`;
  }
}

/** "Free" for nothing, the price otherwise. What a shipping row prints. */
export function formatMoneyOrFree(value: Money | null | undefined, free = 'Free'): string | null {
  if (!value) return null;
  return value.amount === 0 ? free : formatMoney(value);
}

/** "$1,200 to $4,800", or one price when they are the same. */
export function formatMoneyRange(low: Money | null, high: Money | null): string | null {
  const from = formatMoney(low, { compactWhole: true });
  const to = formatMoney(high, { compactWhole: true });
  if (from && to) return from === to ? from : `${from} to ${to}`;
  return from ?? to;
}

// ---------------------------------------------------------------------------
// On-chain amounts
// ---------------------------------------------------------------------------

/** How many decimals a chain's own currency has. */
export const NATIVE_DECIMALS = 18;

export function tokenAmount(raw: bigint | string, symbol: string, decimals = NATIVE_DECIMALS): TokenAmount {
  return { raw: typeof raw === 'bigint' ? raw.toString() : raw, decimals, symbol };
}

/** Adds two amounts of the same token. Different symbols cannot be added, so this returns null. */
export function addTokenAmounts(a: TokenAmount | null, b: TokenAmount | null): TokenAmount | null {
  if (!a) return b;
  if (!b) return a;
  if (a.symbol !== b.symbol || a.decimals !== b.decimals) return null;
  return { ...a, raw: (BigInt(a.raw) + BigInt(b.raw)).toString(), usd: sumUsd(a.usd, b.usd) };
}

function sumUsd(a: number | null | undefined, b: number | null | undefined): number | null {
  if (typeof a !== 'number' && typeof b !== 'number') return null;
  return (a ?? 0) + (b ?? 0);
}

export function sumTokenAmounts(values: readonly (TokenAmount | null | undefined)[]): TokenAmount | null {
  let total: TokenAmount | null = null;
  for (const value of values) {
    if (!value) continue;
    const next = addTokenAmounts(total, value);
    // Mixed symbols cannot be added up honestly, so the caller gets nothing
    // rather than a number that is the sum of two different things.
    if (!next) return null;
    total = next;
  }
  return total;
}

/**
 * "1.25 ETH". Significant digits rather than fixed ones, because 0.000012 ETH
 * and 1,250 ETH both have to read properly. The raw value is divided as a
 * string, so an amount too large for a JavaScript number still prints right.
 */
export function formatTokenAmount(
  value: TokenAmount | null | undefined,
  { maxDigits = 4, withSymbol = true } = {},
): string | null {
  if (!value) return null;
  let raw: bigint;
  try {
    raw = BigInt(value.raw);
  } catch {
    return null;
  }
  const negative = raw < 0n;
  if (negative) raw = -raw;

  const base = 10n ** BigInt(Math.max(0, value.decimals));
  const whole = raw / base;
  const fraction = raw % base;

  let text: string;
  if (fraction === 0n) {
    text = whole.toString();
  } else {
    const digits = fraction.toString().padStart(Math.max(0, value.decimals), '0');
    // Keep maxDigits of precision, counted from the first digit that is not a
    // zero, so a small amount does not print as "0.0000".
    const leadingZeros = digits.length - digits.replace(/^0+/, '').length;
    const keep = whole > 0n ? maxDigits : leadingZeros + maxDigits;
    text = `${whole.toString()}.${digits.slice(0, Math.min(digits.length, keep)).replace(/0+$/, '')}`;
    if (text.endsWith('.')) text = text.slice(0, -1);
  }

  const grouped = groupThousands(text);
  return `${negative ? '-' : ''}${grouped}${withSymbol ? ` ${value.symbol}` : ''}`;
}

function groupThousands(text: string): string {
  const [whole, fraction] = text.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction ? `${grouped}.${fraction}` : grouped;
}

/** The dollar value beside an on-chain amount, when the snapshot carried one. */
export function formatUsd(value: number | null | undefined): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return formatMoney({ amount: Math.round(value * 100), currency: 'USD' }, { compactWhole: value >= 1000 });
}

// ---------------------------------------------------------------------------
// The numbers beside them
// ---------------------------------------------------------------------------

const NUMBER = new Intl.NumberFormat(MONEY_LOCALE);
const COMPACT = new Intl.NumberFormat(MONEY_LOCALE, { notation: 'compact', maximumFractionDigits: 1 });

/** "4,031". The same formatter the catalogue counts use. */
export function formatNumber(value: number | null | undefined): string | null {
  return typeof value === 'number' && Number.isFinite(value) ? NUMBER.format(value) : null;
}

/** "4K", for a tile that has no room for the whole number. */
export function formatCompact(value: number | null | undefined): string | null {
  return typeof value === 'number' && Number.isFinite(value) ? COMPACT.format(value) : null;
}

/**
 * "+12.4%", "no change". A change against a previous period, which is what
 * the insights tiles print. Null when there is nothing to compare against:
 * a rise from zero is not a percentage.
 */
export function formatChange(current: number, previous: number): { label: string; direction: 'up' | 'down' | 'flat' } | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  const change = (current - previous) / Math.abs(previous);
  if (Math.abs(change) < 0.0005) return { label: 'no change', direction: 'flat' };
  const percent = new Intl.NumberFormat(MONEY_LOCALE, {
    style: 'percent',
    maximumFractionDigits: 1,
    signDisplay: 'exceptZero',
  }).format(change);
  return { label: percent, direction: change > 0 ? 'up' : 'down' };
}

/** "37%" of a whole, for a distribution bar. */
export function formatPercent(part: number, whole: number, { maximumFractionDigits = 0 } = {}): string | null {
  if (!Number.isFinite(part) || !Number.isFinite(whole) || whole === 0) return null;
  return new Intl.NumberFormat(MONEY_LOCALE, { style: 'percent', maximumFractionDigits }).format(part / whole);
}
