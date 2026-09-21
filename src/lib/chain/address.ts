import type { Address, Chain } from '@/lib/types';

/**
 * Addresses and token ids, as plain strings.
 *
 * Nothing here touches the network or the filesystem, so a client component
 * can import it. One rule the whole of Wave 2 keeps: an address is stored
 * and compared lowercased, and only ever shown in a shortened or checksummed
 * form. Two spellings of the same wallet must never become two collectors.
 */

/** The burn and mint address. A transfer from it is a mint; one to it is a burn. */
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const HEX_ADDRESS = /^0x[0-9a-f]{40}$/;

/** A 0x address, lowercased, or null when the value is not one. */
export function normalizeAddress(value: unknown): Address | null {
  if (typeof value !== 'string') return null;
  const address = value.trim().toLowerCase();
  return HEX_ADDRESS.test(address) ? address : null;
}

export function isAddress(value: unknown): value is Address {
  return normalizeAddress(value) !== null;
}

export function isSameAddress(a: unknown, b: unknown): boolean {
  const left = normalizeAddress(a);
  return left !== null && left === normalizeAddress(b);
}

export function isZeroAddress(value: unknown): boolean {
  return isSameAddress(value, ZERO_ADDRESS);
}

/** True when this address appears in the list. Both sides are normalized first. */
export function addressInList(value: unknown, list: readonly string[]): boolean {
  const address = normalizeAddress(value);
  return address !== null && list.some(entry => normalizeAddress(entry) === address);
}

// ---------------------------------------------------------------------------
// Token ids
// ---------------------------------------------------------------------------

/**
 * The catalogue's id for one token: chain:contract:tokenId, the same string
 * Work.id carries, so a holding read off the chain lines up with a record in
 * the fixtures without a lookup table.
 */
export function tokenKey(chain: Chain, contract: string, tokenId: string): string {
  return `${chain}:${contract.toLowerCase()}:${tokenId}`;
}

export function parseTokenKey(id: string): { chain: Chain; contract: string; tokenId: string } | null {
  const [chain, contract, ...rest] = id.split(':');
  if (!chain || !contract || rest.length === 0) return null;
  return { chain: chain as Chain, contract: contract.toLowerCase(), tokenId: rest.join(':') };
}

/**
 * Alchemy answers with hex token ids on some endpoints and decimal on
 * others, while the catalogue stores whatever the contract's metadata used.
 * This is the one place that turns either into the decimal form the
 * catalogue keys on.
 */
export function normalizeTokenId(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return String(Math.trunc(value));
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return raw.replace(/^0+(?=\d)/, '');
  if (/^0x[0-9a-fA-F]+$/.test(raw)) {
    try {
      return BigInt(raw).toString();
    } catch {
      return null;
    }
  }
  // Ordinals inscriptions and other non-numeric ids are kept as written.
  return raw;
}
