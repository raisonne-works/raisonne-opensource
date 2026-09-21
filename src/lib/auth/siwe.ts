import 'server-only';

import { createPublicClient, http, recoverMessageAddress } from 'viem';
import { base, mainnet } from 'viem/chains';
import { createSiweMessage, parseSiweMessage, validateSiweMessage, verifySiweMessage } from 'viem/siwe';

import { timingSafeEqual } from 'node:crypto';

import { isSameAddress, normalizeAddress } from '@/lib/chain/address';
import { alchemyKey } from '@/lib/config';

import { consumeNonce } from './nonce';

/**
 * Sign in with Ethereum, EIP-4361.
 *
 * The flow, in full:
 *
 *  1. The browser asks for a nonce. The server issues one and remembers it.
 *  2. The server builds the message, with the domain, the address, the chain
 *     and that nonce. The browser never writes the message: a wallet prompt
 *     the site did not compose is a phishing prompt.
 *  3. The wallet signs it. The browser sends the message and the signature.
 *  4. The server parses the message, checks the domain, the expiry and the
 *     address, consumes the nonce (once, ever) and verifies the signature.
 *
 * Smart-contract wallets are supported where it is cheap: when the install
 * has an Alchemy key, verification goes through viem's verifySiweMessage,
 * which asks the wallet contract itself (ERC-1271, and ERC-6492 for one that
 * is not deployed yet). With no key, only a plain key-pair wallet can sign
 * in, and the result says so rather than failing silently.
 */

/** Chains a visitor may sign in from, and the RPC each one needs for a contract wallet. */
const SIGN_IN_CHAINS = { 1: mainnet, 8453: base } as const;

export type SignInChainId = keyof typeof SIGN_IN_CHAINS;

export function isSupportedChainId(value: unknown): value is SignInChainId {
  return value === 1 || value === 8453;
}

const ALCHEMY_NETWORK: Record<SignInChainId, string> = { 1: 'eth-mainnet', 8453: 'base-mainnet' };

/** What a sign-in message says it is for. The wording is the artist's, the fields are the standard's. */
export const SIGN_IN_STATEMENT = 'Sign in to see the works you hold. This does not cost anything and does not approve any transaction.';

export interface BuildMessageParams {
  address: string;
  /** The host the visitor is on, e.g. "example.art". */
  domain: string;
  /** The full origin, e.g. "https://example.art". */
  uri: string;
  nonce: string;
  chainId?: SignInChainId;
  statement?: string;
  issuedAt?: Date;
  expiresAt?: Date;
}

/** How long a signed message stays acceptable. The nonce expires first; this is the belt to that braces. */
export const MESSAGE_TTL_SECONDS = 600;

/** The exact EIP-4361 text the wallet is asked to sign. */
export function buildSiweMessage(params: BuildMessageParams): string | null {
  const address = normalizeAddress(params.address);
  if (!address) return null;
  const issuedAt = params.issuedAt ?? new Date();
  return createSiweMessage({
    address: toChecksumInput(address),
    chainId: params.chainId ?? 1,
    domain: params.domain,
    nonce: params.nonce,
    uri: params.uri,
    version: '1',
    statement: params.statement ?? SIGN_IN_STATEMENT,
    issuedAt,
    expirationTime: params.expiresAt ?? new Date(issuedAt.getTime() + MESSAGE_TTL_SECONDS * 1000),
  });
}

/**
 * viem wants the 0x-prefixed form; the checksum is the wallet's business,
 * and every comparison this install makes is lowercased anyway.
 */
function toChecksumInput(address: string): `0x${string}` {
  return address as `0x${string}`;
}

export type SignInFailure =
  | 'bad-message'
  | 'bad-domain'
  | 'bad-nonce'
  | 'expired'
  | 'bad-signature'
  | 'not-configured';

export type SignInResult =
  | {
      ok: true;
      address: string;
      chainId: number;
      /** False when only a key-pair signature could be checked, because no RPC is configured. */
      contractWalletsChecked: boolean;
    }
  | { ok: false; reason: SignInFailure; detail: string };

export interface VerifyParams {
  message: string;
  signature: string;
  /** This install's own pinned sign-in domain. The message must name it. */
  domain: string;
  /**
   * The nonce this browser was issued, out of its sign-in cookie. The
   * message has to carry the same one: without that check, verify is an
   * unauthenticated endpoint that sets a session cookie, and a message
   * signed in an attacker's browser can be posted into a victim's.
   */
  issuedNonce?: string | null;
  now?: Date;
}

/**
 * Checks a signed message and, if everything holds, says whose it is.
 *
 * The order matters: everything free is checked before the nonce is spent,
 * and the nonce is spent before the signature is verified, so a replayed
 * message cannot be retried until it is accepted.
 */
export async function verifySignIn({ message, signature, domain, issuedNonce, now = new Date() }: VerifyParams): Promise<SignInResult> {
  if (typeof message !== 'string' || typeof signature !== 'string' || !signature.startsWith('0x')) {
    return { ok: false, reason: 'bad-message', detail: 'The message or the signature is missing' };
  }

  const fields = parseSiweMessage(message);
  const address = normalizeAddress(fields.address);
  if (!fields.nonce || !address) {
    return { ok: false, reason: 'bad-message', detail: 'The message is not an EIP-4361 sign-in message' };
  }

  // `domain` is already the pinned one, settled by signInOrigin() before the
  // message was ever built. It is not re-derived here and never comes from
  // the request, because a domain taken from the request makes this check
  // compare an attacker's value with an attacker's value.
  const expected = domain;
  if (!expected || fields.domain !== expected) {
    return { ok: false, reason: 'bad-domain', detail: `The message was signed for ${fields.domain ?? 'nowhere'}, not for ${expected}` };
  }

  const valid = validateSiweMessage({ message: fields, domain: expected, time: now });
  if (!valid) {
    return { ok: false, reason: 'expired', detail: 'The message has expired or is not valid yet' };
  }

  // The nonce has to be both one this server issued (the store) and the one
  // issued to this browser (the cookie). The store alone stops a replay; the
  // cookie stops a sign-in started somewhere else being finished here.
  if (!issuedNonce || !safeEqualString(fields.nonce, issuedNonce)) {
    return {
      ok: false,
      reason: 'bad-nonce',
      detail: 'This sign-in did not start in this browser. Open the sign-in page here and try again.',
    };
  }

  if (!(await consumeNonce(fields.nonce))) {
    return { ok: false, reason: 'bad-nonce', detail: 'This sign-in has already been used, or took too long' };
  }

  const chainId = isSupportedChainId(fields.chainId) ? fields.chainId : 1;
  const client = publicClientFor(chainId);

  try {
    if (client) {
      const verified = await verifySiweMessage(client, {
        message,
        signature: signature as `0x${string}`,
        address: toChecksumInput(address),
        domain: expected,
        nonce: fields.nonce,
        time: now,
      });
      if (!verified) return { ok: false, reason: 'bad-signature', detail: 'That signature does not match the address' };
      return { ok: true, address, chainId, contractWalletsChecked: true };
    }

    const recovered = await recoverMessageAddress({ message, signature: signature as `0x${string}` });
    if (!isSameAddress(recovered, address)) {
      return {
        ok: false,
        reason: 'bad-signature',
        detail: 'That signature does not match the address. A smart-contract wallet needs ALCHEMY_API_KEY set to sign in.',
      };
    }
    return { ok: true, address, chainId, contractWalletsChecked: false };
  } catch {
    return { ok: false, reason: 'bad-signature', detail: 'The signature could not be checked' };
  }
}

/**
 * A read-only client for contract-wallet checks. Alchemy's key is reused
 * rather than asking the artist for a second RPC: an install that reads
 * holdings already has one.
 */
function publicClientFor(chainId: SignInChainId) {
  const key = alchemyKey();
  if (!key) return null;
  return createPublicClient({
    chain: SIGN_IN_CHAINS[chainId],
    transport: http(`https://${ALCHEMY_NETWORK[chainId]}.g.alchemy.com/v2/${key}`),
  });
}

/** Constant-time string compare, for a value an attacker gets to guess at. */
function safeEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
