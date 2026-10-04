import 'server-only';

/**
 * One place that answers "is this switched on, and if not, what is missing".
 *
 * Nothing in Waves 2 and 3 is configured by default. A fresh clone has no
 * session secret, no Alchemy key and no Stripe keys, and that is a working
 * state, not a broken one: the catalogue keeps working, and every account,
 * collector, insights or store surface renders a designed "not configured"
 * panel naming the exact variables to set. No page may guess, invent a
 * number, or fail.
 *
 * Reading env happens here and nowhere else, so there is one list to
 * document (.env.example and the README) and one place to change.
 *
 * Nothing here is ever sent to the browser. The functions return whether a
 * key exists, never the key.
 */

import { isModuleEnabled } from '@/lib/records';
import type { Chain, SiteSettings } from '@/lib/types';

// ---------------------------------------------------------------------------
// The variables, and what each one is for
// ---------------------------------------------------------------------------

/** Every variable Waves 2 and 3 read, with the line a "not configured" panel prints. */
export const ENV_DOCS: Record<string, string> = {
  RAISONNE_SESSION_SECRET:
    'A random string of at least 32 characters. Signs the session cookie. Generate one with `openssl rand -base64 32`.',
  RAISONNE_OWNER_ADDRESSES:
    'The wallet addresses that own this install, comma separated. Anyone signing in with one of them sees the artist-only pages. Required: without it nobody is the owner, because falling back to the minting wallets in the catalogue data would hand every buyer’s address and email to whoever still holds an old minting key.',
  RAISONNE_SITE_URL:
    'The public address of this install, e.g. https://example.art. Sign-in messages are bound to its host, order links are built from it, and the sitemap uses it.',
  RAISONNE_SIWE_DOMAIN:
    'The domain a sign-in message is bound to, e.g. example.art. Defaults to the host of RAISONNE_SITE_URL. Set one of the two: an unpinned domain is taken from the request, and a request can lie.',
  RAISONNE_SESSION_TTL_MINUTES: 'How long a session lasts before it has to be renewed. Default 60, maximum 1440.',
  ALCHEMY_API_KEY:
    'An Alchemy key with the NFT API enabled. Read only: holdings, holders and transfer events. Without it the collector, guild and insights pages fall back to the snapshot alone, and with no snapshot they say so.',
  RAISONNE_CHAIN_NETWORKS:
    'Which Alchemy networks to read, comma separated, e.g. eth-mainnet,base-mainnet. Defaults to the chains the catalogue actually uses.',
  RAISONNE_CHAIN_CACHE_SECONDS: 'How long a holdings read is cached in memory. Default 300, maximum 3600.',
  STRIPE_SECRET_KEY:
    'A Stripe secret key. Test keys (sk_test_...) are the only ones this theme has been exercised with. Prices are resolved on the server from the fixtures, never from the browser.',
  STRIPE_WEBHOOK_SECRET:
    'The signing secret of the Stripe webhook endpoint (whsec_...). Without it the webhook refuses every request, because an unverified webhook can mark any order paid.',
  RAISONNE_ORDERS_DIR:
    'Where the JSON order store writes. Default .data/orders next to the project. Put it on a volume that survives a deploy, or swap the adapter for a database.',
  RAISONNE_POD_PROVIDER: 'The print-on-demand service to dispatch to (prodigi, printful, gelato). Integration is a stub.',
  RAISONNE_POD_API_KEY: 'The print-on-demand key. Integration is a stub: nothing is sent anywhere yet.',
  RAISONNE_TRUSTED_PROXY:
    '1 when a reverse proxy you control sets X-Forwarded-For. Set it: nearly every real install is behind a proxy, and without it rate limits fall back to per-wallet and per-cart counting with only a coarse ceiling per address.',
  RAISONNE_SKIN:
    'The id of the design pack this install wears, e.g. a folder name inside RAISONNE_PACK_DIR. Unset, or a pack that fails its checks, means skin zero, the design that ships with the app.',
  RAISONNE_IPFS_GATEWAY:
    'An IPFS gateway that live works and films load through, e.g. https://ipfs.example.art/ipfs/. Public gateways such as ipfs.io limit how often they answer and cannot be shown inside the page when they refuse, so a live work stays blank. Unset keeps each address as recorded.',
  RAISONNE_PACK_DIR:
    'The folder that holds design packs, one folder per pack id with a pack.json and an optional pack.css. Packs are private and never ship with the app; mount this from a volume.',
  RAISONNE_UPDATE_REPO:
    'owner/name of the GitHub repository releases are read from. Default orkhan-art-web/raisonne-os. Set this when this install tracks a fork.',
  RAISONNE_UPDATE:
    '1 allows the owner to press Update on /update in production. 0 refuses it everywhere. Unset: allowed in development only. The CLI does not need this flag.',
  RAISONNE_UPDATE_GITHUB_TOKEN:
    'Optional GitHub token with contents:read. Needed for a private fork, or to raise the anonymous rate limit when checking for releases.',
};

// ---------------------------------------------------------------------------
// Reading one variable
// ---------------------------------------------------------------------------

function env(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function envList(name: string): string[] {
  return (
    env(name)
      ?.split(',')
      .map(entry => entry.trim())
      .filter(Boolean) ?? []
  );
}

function envNumber(name: string, fallback: number, min: number, max: number): number {
  const raw = env(name);
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.round(value), min), max);
}

// ---------------------------------------------------------------------------
// Sign-in
// ---------------------------------------------------------------------------

/** The shortest secret worth calling one. A shorter value is treated as unset. */
export const SESSION_SECRET_MIN_LENGTH = 32;

/** The signing secret, or null when the install has not set a usable one. */
export function sessionSecret(): string | null {
  const value = env('RAISONNE_SESSION_SECRET');
  return value && value.length >= SESSION_SECRET_MIN_LENGTH ? value : null;
}

/** Session lifetime in seconds. Short, because the cookie is rotated on every read. */
export function sessionTtlSeconds(): number {
  return envNumber('RAISONNE_SESSION_TTL_MINUTES', 60, 5, 1440) * 60;
}

function addressList(values: readonly string[]): string[] {
  return [...new Set(values.map(address => address.trim().toLowerCase()).filter(address => address.startsWith('0x')))];
}

/**
 * The addresses that administer this install, lowercased.
 *
 * RAISONNE_OWNER_ADDRESSES and nothing else. There is deliberately no
 * fallback to the minting wallets in the catalogue data: owner means reading
 * every buyer's name, postal address and email and changing order statuses,
 * and a minting key is routinely cold, shared between people, or years older
 * than the site. An install that has not said who the artist is has no owner,
 * and the owner surfaces say which variable to set.
 */
export function adminAddresses(): string[] {
  return addressList(envList('RAISONNE_OWNER_ADDRESSES'));
}

/** True when this install has been told who owns it. */
export function ownerAddressesAreExplicit(): boolean {
  return adminAddresses().length > 0;
}

/**
 * The artist's own wallets, for reading the chain: which tokens the studio
 * still holds, which transfers were mints. This is a fact about the
 * catalogue, not a permission, so the minting wallets are exactly right here
 * and exactly wrong in adminAddresses().
 */
export function artistWalletAddresses(artistWallets: readonly { address: string }[] = []): string[] {
  return addressList([...envList('RAISONNE_OWNER_ADDRESSES'), ...artistWallets.map(wallet => wallet.address)]);
}

/**
 * The domain a SIWE message must be bound to, or null when the install has
 * not pinned one.
 *
 * Pinning matters more than it looks. EIP-4361 puts a domain in the message
 * the wallet displays and the server insists on, and that is the one
 * server-side defence against a phishing site relaying the flow. If the
 * server takes that domain from the request's own Host header, an attacker
 * asks for a nonce with `Host: evil.example`, gets back a message reading
 * "evil.example wants you to sign in", and the check becomes
 * attacker_value === attacker_value. So outside local development this is
 * the only source, and an install without it has sign-in switched off rather
 * than switched on and lying.
 */
export function siweDomain(): string | null {
  const explicit = env('RAISONNE_SIWE_DOMAIN');
  if (explicit) return explicit.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase() || null;
  const site = env('RAISONNE_SITE_URL');
  if (!site) return null;
  try {
    return new URL(site).host.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * True when this process is a deployment rather than somebody's laptop.
 *
 * Used for the two defaults that must not be loosened by accident: whether a
 * sign-in domain has to be pinned, and whether the session cookie is Secure.
 */
export function isProductionBuild(): boolean {
  return process.env.NODE_ENV === 'production';
}

// ---------------------------------------------------------------------------
// Chain reads
// ---------------------------------------------------------------------------

export function alchemyKey(): string | null {
  return env('ALCHEMY_API_KEY');
}

/** Alchemy network names, when the install pins them. Empty means "work it out from the catalogue". */
export function chainNetworks(): string[] {
  return envList('RAISONNE_CHAIN_NETWORKS').map(name => name.toLowerCase());
}

export function chainCacheSeconds(): number {
  return envNumber('RAISONNE_CHAIN_CACHE_SECONDS', 300, 30, 3600);
}

/**
 * Chains the Alchemy reader covers. Tezos, Bitcoin Ordinals and Solana are
 * not read live: their holdings and events come from the snapshot, or from
 * nowhere, and the page says which.
 */
export const ALCHEMY_CHAINS: readonly Chain[] = ['ethereum', 'base'];

// ---------------------------------------------------------------------------
// Payments, orders and print on demand
// ---------------------------------------------------------------------------

export function stripeSecretKey(): string | null {
  return env('STRIPE_SECRET_KEY');
}

export function stripeWebhookSecret(): string | null {
  return env('STRIPE_WEBHOOK_SECRET');
}

/** True when the Stripe key in use is a test key. A live key is reported, never blocked. */
export function stripeIsTestMode(): boolean {
  return stripeSecretKey()?.startsWith('sk_test_') ?? false;
}

export function ordersDir(): string {
  return env('RAISONNE_ORDERS_DIR') ?? '.data/orders';
}

export function podProviderId(): string | null {
  return env('RAISONNE_POD_PROVIDER')?.toLowerCase() ?? null;
}

export function podApiKey(): string | null {
  return env('RAISONNE_POD_API_KEY');
}

export function trustsProxyHeaders(): boolean {
  const flag = env('RAISONNE_TRUSTED_PROXY')?.toLowerCase();
  return flag === '1' || flag === 'true';
}

// ---------------------------------------------------------------------------
// What the order store has reported
// ---------------------------------------------------------------------------

/**
 * Whether the order store can actually be written to.
 *
 * The default is a relative `.data/orders`, which works on a laptop and
 * fails on a read-only container filesystem, which is where a lot of these
 * installs end up. Guessing "configured" there means a buyer meets an
 * unhandled 500 at the moment of payment, with the panel written for exactly
 * this case never rendering. So the store probes itself with a
 * write-and-delete, reports the answer here, and featureStatus('orders')
 * reads it. null means "it worked, or has not been tried yet".
 */
let ordersFailure: string | null = null;

export function reportOrderStoreFailure(reason: string | null): void {
  ordersFailure = reason;
}

export function orderStoreFailure(): string | null {
  return ordersFailure;
}

// ---------------------------------------------------------------------------
// The report every surface reads
// ---------------------------------------------------------------------------

/**
 * The capabilities Waves 2 and 3 need. A page asks for one and gets back
 * whether it works and, when it does not, exactly which variables are
 * missing, in the words the panel prints.
 */
export type FeatureId = 'accounts' | 'owner' | 'chain' | 'payments' | 'orders' | 'pod';

export interface FeatureStatus {
  id: FeatureId;
  /** Everything this feature needs is present. */
  configured: boolean;
  /** Variables that are missing, in the order they should be set. */
  missing: string[];
  /** One line for the panel heading, e.g. "Sign-in is not configured". */
  summary: string;
  /** What the visitor should understand. Written for the artist, who is the one who can fix it. */
  detail: string;
  /** Things that work but are worth saying, e.g. that Stripe is in live mode. */
  notes: string[];
}

const FEATURE_COPY: Record<FeatureId, { summary: string; detail: string }> = {
  accounts: {
    summary: 'Sign-in is not configured',
    detail:
      'Collectors sign in by signing a message with their wallet. That needs a secret to sign the session cookie with, and a domain to bind the sign-in message to, so a signature collected on another site cannot be spent here. The catalogue is unaffected.',
  },
  owner: {
    summary: 'This install has no owner',
    detail:
      'The artist-only pages read every buyer’s name, postal address and email, and change order statuses. Until this install is told which wallets are the artist’s, nobody gets them: signing in with a minting wallet from the catalogue data is not enough, because a minting key is often cold, shared, or older than the site.',
  },
  chain: {
    summary: 'Chain reads are not configured',
    detail:
      'Holdings, holders and events are read from Alchemy, or from a snapshot this install refreshes with `pnpm snapshot:chain`. Without either, these pages have nothing true to show, so they show nothing.',
  },
  payments: {
    summary: 'Payments are not configured',
    detail:
      'Checkout creates a Stripe Checkout Session on the server, with prices resolved from this install’s own data. Without keys the store can still show products and a cart, but no order can be paid.',
  },
  orders: {
    summary: 'Orders cannot be stored',
    detail:
      'Orders are written to a JSON file by default. The directory this install points at could not be used, so nothing would survive a restart.',
  },
  pod: {
    summary: 'Print on demand is not configured',
    detail:
      'Provider dispatch is a stub in this release: the flow and the pages are built, the call to Prodigi, Printful or Gelato is not. Orders stay in production until the artist marks them shipped.',
  },
};

function statusOf(id: FeatureId, missing: string[], notes: string[] = []): FeatureStatus {
  return { id, configured: missing.length === 0, missing, ...FEATURE_COPY[id], notes };
}

/** Whether one capability is ready, and what is missing when it is not. */
export function featureStatus(id: FeatureId): FeatureStatus {
  switch (id) {
    case 'accounts': {
      const missing: string[] = [];
      if (!sessionSecret()) missing.push('RAISONNE_SESSION_SECRET');
      // A deployment must pin the domain a wallet is asked to sign for. On a
      // laptop the request host is the only thing there is, and nobody is
      // being phished on localhost, so development is exempt.
      if (isProductionBuild() && !siweDomain()) missing.push('RAISONNE_SITE_URL');
      const notes: string[] = [];
      if (!ownerAddressesAreExplicit()) {
        notes.push('No RAISONNE_OWNER_ADDRESSES: collectors can sign in, but nobody is the owner, so the artist-only pages stay closed.');
      }
      if (!trustsProxyHeaders()) {
        notes.push('No RAISONNE_TRUSTED_PROXY: rate limits count per wallet and per cart rather than per client address. Set it if a proxy you control sets X-Forwarded-For.');
      }
      return statusOf('accounts', missing, notes);
    }
    case 'owner':
      return statusOf('owner', ownerAddressesAreExplicit() ? [] : ['RAISONNE_OWNER_ADDRESSES']);
    case 'chain':
      return statusOf('chain', alchemyKey() ? [] : ['ALCHEMY_API_KEY']);
    case 'payments': {
      const missing: string[] = [];
      if (!stripeSecretKey()) missing.push('STRIPE_SECRET_KEY');
      if (!stripeWebhookSecret()) missing.push('STRIPE_WEBHOOK_SECRET');
      const notes: string[] = [];
      if (stripeSecretKey() && !stripeIsTestMode()) notes.push('Stripe is in live mode: real cards will be charged.');
      return statusOf('payments', missing, notes);
    }
    case 'orders':
      // Probed rather than assumed: the default is a relative .data/orders,
      // which is exactly the path that fails on a read-only container
      // filesystem. orderStoreFailure() is set by the store itself the first
      // time a write does not work.
      return statusOf('orders', orderStoreFailure() ? ['RAISONNE_ORDERS_DIR'] : [], orderStoreFailure() ? [orderStoreFailure() as string] : []);
    case 'pod':
      return statusOf('pod', podProviderId() && podApiKey() ? [] : ['RAISONNE_POD_PROVIDER', 'RAISONNE_POD_API_KEY'], [
        'Provider dispatch is a stub: see the TODO in src/lib/store/pod.ts.',
      ]);
    default:
      return statusOf('accounts', []);
  }
}

export function isConfigured(id: FeatureId): boolean {
  return featureStatus(id).configured;
}

/** The whole report, for the artist-facing setup panel. */
export function featureReport(): FeatureStatus[] {
  return (['accounts', 'owner', 'chain', 'payments', 'orders', 'pod'] as const).map(featureStatus);
}

/**
 * What a route should do about a surface: render it, tell the artist what to
 * set, or answer 404.
 *
 *  - `on`: the module is on and everything it needs is configured.
 *  - `unconfigured`: the module is on and something is missing. The page
 *    renders its designed setup panel, naming the variables.
 *  - `off`: the module is switched off in the data. The route answers 404,
 *    so an install that does not sell anything has no /store at all.
 */
export type SurfaceState = 'on' | 'unconfigured' | 'off';

/** The three surfaces these waves add, and the module switch each one reads. */
export const SURFACE_MODULES = {
  collectors: 'collectors',
  insights: 'insights',
  store: 'store',
} as const;

export type SurfaceId = keyof typeof SURFACE_MODULES;

const SURFACE_FEATURES: Record<SurfaceId, FeatureId[]> = {
  collectors: ['accounts'],
  insights: [],
  // 'orders' belongs here: a store that can take a payment but cannot write
  // the order down is worse than one that admits it cannot sell yet.
  store: ['payments', 'orders'],
};

/**
 * Whether a route may render. The module switch is the artist's decision and
 * comes first; the environment only decides between the page and its setup
 * panel, so an install never 404s a page because a key expired.
 */
export function surfaceState(settings: SiteSettings | null | undefined, id: SurfaceId): SurfaceState {
  if (!isModuleEnabled(settings, SURFACE_MODULES[id])) return 'off';
  const missing = SURFACE_FEATURES[id].filter(feature => !isConfigured(feature));
  return missing.length ? 'unconfigured' : 'on';
}

/** The statuses a surface's setup panel should print, worst first. */
export function surfaceRequirements(id: SurfaceId): FeatureStatus[] {
  return SURFACE_FEATURES[id].map(featureStatus).sort((a, b) => Number(a.configured) - Number(b.configured));
}

// ---------------------------------------------------------------------------
// The design pack
// ---------------------------------------------------------------------------

/** The gateway IPFS media loads through, ending in a slash; null keeps recorded addresses. */
export function ipfsGateway(): string | null {
  const value = env('RAISONNE_IPFS_GATEWAY');
  if (!value || !/^https:\/\//.test(value)) return null;
  return value.replace(/\/?$/, '/');
}

/** Which pack to wear and where packs live. Either one missing means skin zero. */
export function skinSettings(): { id: string | null; dir: string | null } {
  return { id: env('RAISONNE_SKIN'), dir: env('RAISONNE_PACK_DIR') };
}
