/**
 * Every way signing in can fail, in plain words.
 *
 * Two rules. A person is told what happened and what to do about it, not
 * what the code called it: "This sign-in took too long" rather than
 * "bad-nonce". And a failure is never dressed up as success, so a wallet
 * that returns nothing leaves the panel in a failed state with a retry,
 * never in a signed-in one.
 *
 * Pure and client safe.
 */

import { WalletRefusal, chainName, errorCode } from './wallet';

/** What the panel shows after something went wrong. */
export interface SignInProblem {
  /** One line, in bold, at the top of the message. */
  title: string;
  /** What to do next. Sometimes the same sentence twice would be worse than one. */
  detail: string;
  /** False for "you changed your mind", which is not an error and gets a quieter treatment. */
  severe: boolean;
  /** True when trying again, unchanged, is likely to work. */
  retryable: boolean;
}

/** EIP-1193 and EIP-1474 codes a wallet throws at a sign-in. */
const WALLET_CODES: Record<number, SignInProblem> = {
  4001: {
    title: 'You cancelled',
    detail: 'Nothing was signed and nothing was sent. Start again whenever you like.',
    severe: false,
    retryable: true,
  },
  4100: {
    title: 'The wallet is locked',
    detail: 'Unlock the wallet, or give this site permission to see an address, and try again.',
    severe: true,
    retryable: true,
  },
  4200: {
    title: 'This wallet cannot sign in here',
    detail: 'It does not support the message signing this site uses. Try another wallet in the list.',
    severe: true,
    retryable: false,
  },
  4900: {
    title: 'The wallet is disconnected',
    detail: 'It is not connected to any network. Open the wallet, connect it, and try again.',
    severe: true,
    retryable: true,
  },
  4901: {
    title: 'The wallet is not on a network',
    detail: 'Choose Ethereum or Base in the wallet and try again.',
    severe: true,
    retryable: true,
  },
  [-32002]: {
    title: 'The wallet is already asking',
    detail: 'There is a pending request in the wallet window. Answer it there, then come back.',
    severe: false,
    retryable: true,
  },
};

/** The server's own reasons, from SignInFailure in src/lib/auth/siwe.ts. */
const SERVER_REASONS: Record<string, SignInProblem> = {
  'bad-message': {
    title: 'That sign-in could not be read',
    detail: 'The message did not arrive as this site wrote it. Start again.',
    severe: true,
    retryable: true,
  },
  'bad-domain': {
    title: 'That signature was for another site',
    detail:
      'The message names a different domain, so it is not accepted here. If you are on a preview or a proxy, sign in on the site’s own address.',
    severe: true,
    retryable: false,
  },
  'bad-nonce': {
    title: 'That sign-in has already been used',
    detail: 'Each sign-in works exactly once, and only for five minutes. Ask for a new one and sign that.',
    severe: true,
    retryable: true,
  },
  expired: {
    title: 'That sign-in took too long',
    detail: 'The message expired before it came back. Try again, and approve the wallet prompt when it appears.',
    severe: true,
    retryable: true,
  },
  'bad-signature': {
    title: 'That signature does not match',
    detail:
      'The address that signed is not the one signing in. If you use a smart-contract wallet, this install needs ALCHEMY_API_KEY set before it can check one.',
    severe: true,
    retryable: true,
  },
  'not-configured': {
    title: 'Sign-in is not set up on this install',
    detail: 'Nothing is wrong with your wallet. The artist has to set RAISONNE_SESSION_SECRET.',
    severe: true,
    retryable: false,
  },
};

export const NO_WALLET: SignInProblem = {
  title: 'No wallet found in this browser',
  detail:
    'Signing in needs a browser wallet extension, or a browser that has one built in. Open this page in your wallet’s own browser, or install one, and this list will fill up.',
  severe: true,
  retryable: true,
};

export const NETWORK_FAILED: SignInProblem = {
  title: 'This site could not be reached',
  detail: 'The sign-in request did not get through. Check your connection and try again.',
  severe: true,
  retryable: true,
};

export const RATE_LIMITED: SignInProblem = {
  title: 'Too many attempts',
  detail: 'Give it a minute and try again.',
  severe: true,
  retryable: true,
};

export function wrongChainProblem(current: number | null): SignInProblem {
  return {
    title: `Your wallet is on ${chainName(current)}`,
    detail: 'Sign-in messages are bound to Ethereum or Base. Switch the wallet, or let this page ask it to.',
    severe: true,
    retryable: true,
  };
}

/** The problem for a reason the server sent back. */
export function serverProblem(reason: unknown, detail?: unknown): SignInProblem {
  const known = typeof reason === 'string' ? SERVER_REASONS[reason] : undefined;
  if (known) return known;
  return {
    title: 'That sign-in did not go through',
    detail: typeof detail === 'string' && detail.trim() ? detail.trim().slice(0, 240) : 'Please try again.',
    severe: true,
    retryable: true,
  };
}

/** The problem for something a wallet threw. */
export function walletProblem(error: unknown): SignInProblem {
  const code = errorCode(error);
  if (code !== null && WALLET_CODES[code]) return WALLET_CODES[code];

  if (error instanceof WalletRefusal) {
    return {
      title: 'The wallet answered with nothing',
      detail: `${error.message} Try again, or use another wallet in the list.`,
      severe: true,
      retryable: true,
    };
  }

  // A wallet that rejects by message rather than by code is common enough to
  // be worth reading, and "user rejected" is the only phrase they agree on.
  const message = error instanceof Error ? error.message : '';
  if (/user (rejected|denied|cancel)/i.test(message)) return WALLET_CODES[4001];

  return {
    title: 'The wallet could not complete that',
    detail: message.trim() ? message.trim().slice(0, 240) : 'Try again, or use another wallet in the list.',
    severe: true,
    retryable: true,
  };
}
