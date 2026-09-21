/**
 * Talking to a browser wallet, with no wallet library.
 *
 * Raisonne asks a wallet for two things: which address you control, and a
 * signature over a message the server wrote. That is EIP-1193 plus EIP-6963,
 * both of which are a handful of lines, so this install does not take on
 * wagmi, RainbowKit, WalletConnect or their transitive dependency trees to
 * do it. One artist, one install, one signature.
 *
 * EIP-6963 is how a browser with more than one wallet stops them fighting
 * over `window.ethereum`. Each extension announces itself with an event; the
 * page asks and then lists whoever answered. `window.ethereum` is kept as a
 * fallback for a wallet too old to announce.
 *
 * Browser only. Nothing here runs on the server, and nothing here is
 * imported by a server component.
 */

export interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] | Record<string, unknown> }): Promise<unknown>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
}

export interface WalletOption {
  /** Stable across a page life, used as a React key and as the chosen wallet. */
  id: string;
  name: string;
  /** A data: URI the wallet supplies. Rendered as an <img>, never as HTML. */
  icon: string | null;
  /** Reverse-DNS id, e.g. io.metamask. Absent for the window.ethereum fallback. */
  rdns: string | null;
  provider: Eip1193Provider;
}

interface Eip6963Detail {
  info?: { uuid?: string; name?: string; icon?: string; rdns?: string };
  provider?: Eip1193Provider;
}

/** Chains a visitor may sign in from. Must match SIGN_IN_CHAINS in src/lib/auth/siwe.ts. */
export const SIGN_IN_CHAINS = [
  { id: 1, hexId: '0x1', name: 'Ethereum' },
  { id: 8453, hexId: '0x2105', name: 'Base' },
] as const;

export type SignInChainId = (typeof SIGN_IN_CHAINS)[number]['id'];

export function isSupportedChain(id: number | null): id is SignInChainId {
  return SIGN_IN_CHAINS.some(chain => chain.id === id);
}

export function chainName(id: number | null): string {
  return SIGN_IN_CHAINS.find(chain => chain.id === id)?.name ?? (id === null ? 'an unknown network' : `chain ${id}`);
}

/** The chain a signature is asked for when the wallet is somewhere else entirely. */
export const DEFAULT_CHAIN = SIGN_IN_CHAINS[0];

// ---------------------------------------------------------------------------
// Finding wallets
// ---------------------------------------------------------------------------

/**
 * Every wallet in this browser.
 *
 * Announcements arrive asynchronously, so the listener goes on first, the
 * request goes out, and the answers are collected for a moment. A wallet
 * that never announces is caught by the window.ethereum fallback.
 */
export function discoverWallets(waitMs = 350): Promise<WalletOption[]> {
  if (typeof window === 'undefined') return Promise.resolve([]);

  return new Promise(resolve => {
    const found = new Map<string, WalletOption>();

    function onAnnounce(event: Event) {
      const detail = (event as CustomEvent<Eip6963Detail>).detail;
      const provider = detail?.provider;
      const info = detail?.info;
      if (!provider || typeof provider.request !== 'function') return;
      const id = info?.rdns || info?.uuid;
      if (!id || found.has(id)) return;
      found.set(id, {
        id,
        name: info?.name?.trim() || 'Browser wallet',
        // Only a data: or https: image is rendered. A javascript: "icon" from
        // an extension that means badly is dropped rather than put in a src.
        icon: safeIcon(info?.icon),
        rdns: info?.rdns ?? null,
        provider,
      });
    }

    window.addEventListener('eip6963:announceProvider', onAnnounce);
    window.dispatchEvent(new Event('eip6963:requestProvider'));

    window.setTimeout(() => {
      window.removeEventListener('eip6963:announceProvider', onAnnounce);

      const injected = (window as { ethereum?: Eip1193Provider }).ethereum;
      if (found.size === 0 && injected && typeof injected.request === 'function') {
        found.set('injected', { id: 'injected', name: 'Browser wallet', icon: null, rdns: null, provider: injected });
      }

      resolve([...found.values()].sort((a, b) => a.name.localeCompare(b.name)));
    }, waitMs);
  });
}

/**
 * EIP-6963 says an icon is a data URI, and only a data URI is used. A remote
 * one would need the wallet's host in next.config.ts, which would mean this
 * install's image policy was written by whatever extension is installed.
 */
function safeIcon(icon: unknown): string | null {
  if (typeof icon !== 'string') return null;
  return /^data:image\/(png|jpeg|gif|webp|svg\+xml);/i.test(icon) ? icon : null;
}

// ---------------------------------------------------------------------------
// Asking a wallet for things
// ---------------------------------------------------------------------------

/** The address the wallet is unlocked with. Prompts if it has to. */
export async function requestAddress(provider: Eip1193Provider): Promise<string> {
  const accounts = await provider.request({ method: 'eth_requestAccounts' });
  const first = Array.isArray(accounts) ? accounts[0] : null;
  if (typeof first !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(first)) {
    throw new WalletRefusal('no-account', 'The wallet did not return an address.');
  }
  return first.toLowerCase();
}

/** Which chain the wallet is on, or null when it will not say. */
export async function readChainId(provider: Eip1193Provider): Promise<number | null> {
  try {
    const raw = await provider.request({ method: 'eth_chainId' });
    const value = typeof raw === 'string' ? Number.parseInt(raw, 16) : Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * Asks the wallet to move to a chain this install can verify against.
 *
 * 4902 means the wallet does not know the chain yet. Base is the only one
 * that happens with in practice, and it is added with its public details,
 * which are not a secret and not this install's to configure.
 */
export async function switchChain(provider: Eip1193Provider, chainId: SignInChainId): Promise<void> {
  const chain = SIGN_IN_CHAINS.find(entry => entry.id === chainId) ?? DEFAULT_CHAIN;
  try {
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: chain.hexId }] });
  } catch (error) {
    if (errorCode(error) !== 4902) throw error;
    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: chain.hexId,
          chainName: chain.name,
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: chain.id === 8453 ? ['https://mainnet.base.org'] : ['https://ethereum-rpc.publicnode.com'],
          blockExplorerUrls: chain.id === 8453 ? ['https://basescan.org'] : ['https://etherscan.io'],
        },
      ],
    });
  }
}

/**
 * personal_sign over the server's message.
 *
 * The message is passed as hex rather than as text: a wallet that guesses
 * whether a string is hex or UTF-8 can guess wrong, and a message that
 * happens to start with 0x would then be signed as bytes the person never
 * read.
 */
export async function signMessage(provider: Eip1193Provider, message: string, address: string): Promise<string> {
  const signature = await provider.request({ method: 'personal_sign', params: [toHex(message), address] });
  if (typeof signature !== 'string' || !signature.startsWith('0x')) {
    throw new WalletRefusal('no-signature', 'The wallet did not return a signature.');
  }
  return signature;
}

/** UTF-8 bytes as 0x-prefixed hex. */
export function toHex(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let out = '0x';
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0');
  return out;
}

// ---------------------------------------------------------------------------
// What went wrong
// ---------------------------------------------------------------------------

/** Something the wallet itself would not do, as opposed to a network failure. */
export class WalletRefusal extends Error {
  constructor(
    readonly kind: string,
    message: string,
  ) {
    super(message);
    this.name = 'WalletRefusal';
  }
}

/** The EIP-1193 error code, when the thrown thing carries one. */
export function errorCode(error: unknown): number | null {
  if (error && typeof error === 'object') {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'number') return code;
    if (typeof code === 'string' && /^-?\d+$/.test(code)) return Number(code);
  }
  return null;
}
