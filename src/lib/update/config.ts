/**
 * Where this install looks for newer versions of itself.
 *
 * Defaults to the public Raisonne repository. An install that forks the app
 * and publishes its own releases points RAISONNE_UPDATE_REPO at that fork so
 * the update page follows the fork instead of the upstream.
 */

const DEFAULT_REPO = 'orkhan-art-web/raisonne-os';

function env(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

/** owner/name, lowercased, with a defensive strip of a full github URL. */
export function updateRepo(): string {
  const raw = env('RAISONNE_UPDATE_REPO') ?? DEFAULT_REPO;
  const stripped = raw
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/^\/+|\/+$/g, '');
  const match = stripped.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (!match) return DEFAULT_REPO;
  return `${match[1]}/${match[2]}`;
}

export function updateRepoUrl(repo = updateRepo()): string {
  return `https://github.com/${repo}`;
}

export function updateReleasesUrl(repo = updateRepo()): string {
  return `https://github.com/${repo}/releases`;
}

export function updateApiLatestUrl(repo = updateRepo()): string {
  return `https://api.github.com/repos/${repo}/releases/latest`;
}

export function updateApiTagsUrl(repo = updateRepo()): string {
  return `https://api.github.com/repos/${repo}/tags?per_page=5`;
}

/**
 * Whether the running process may rewrite its own tree from the owner page.
 *
 * Off by default in production: applying an update means git fetch + checkout
 * + install on the live box, and a host that deploys from an image (Coolify,
 * a container) should pull a new image instead. On in development, because
 * that is where the artist is iterating on the install itself.
 *
 * RAISONNE_UPDATE=1 turns web apply on everywhere. RAISONNE_UPDATE=0 turns it off
 * everywhere, including development. The CLI (`pnpm update:raisonne`) does not
 * read this flag: running a command on the host is already an explicit act.
 */
export function updateApplyEnabled(): boolean {
  const flag = env('RAISONNE_UPDATE')?.toLowerCase();
  if (flag === '1' || flag === 'true') return true;
  if (flag === '0' || flag === 'false') return false;
  return process.env.NODE_ENV !== 'production';
}

/** How long a successful GitHub check is reused, in ms. */
export const UPDATE_CHECK_TTL_MS = 15 * 60 * 1000;
