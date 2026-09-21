import {
  UPDATE_CHECK_TTL_MS,
  updateApiLatestUrl,
  updateApiTagsUrl,
  updateRepo,
  updateReleasesUrl,
  updateRepoUrl,
} from './config.ts';
import type { UpstreamRelease } from './types.ts';

/**
 * Talks to GitHub for the latest Raisonne release.
 *
 * Public repositories need no token. A private fork can set
 * RAISONNE_UPDATE_GITHUB_TOKEN (a classic PAT with `contents:read`) so the
 * check can see releases the anonymous API cannot.
 *
 * Failures are soft: the panel still shows what this install is running, and
 * names the error so the artist can tell a missing release from a network
 * problem. Nothing here is cached across process restarts; the in-memory
 * cache only stops the owner page from hitting GitHub on every render.
 */

interface CacheEntry {
  release: UpstreamRelease | null;
  error: string | null;
  fetchedAt: number;
  repo: string;
}

let cache: CacheEntry | null = null;

function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'raisonne-update-check',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  const token = process.env.RAISONNE_UPDATE_GITHUB_TOKEN?.trim();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function versionFromTag(tag: string): string {
  return tag.trim().replace(/^v/i, '');
}

function plainNotes(body: unknown): string {
  if (typeof body !== 'string' || !body.trim()) return '';
  // Release notes are markdown. The panel wants a short plain extract, not a
  // renderer: strip the most common marks and cut to a few hundred characters.
  return body
    .replace(/\r\n/g, '\n')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/[*_~>]/g, '')
    .replace(/\n{2,}/g, '\n')
    .trim()
    .slice(0, 600);
}

async function fetchJson(url: string): Promise<{ ok: true; body: unknown } | { ok: false; error: string }> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: githubHeaders(),
      // The Next fetch cache would pin a stale "latest" across deploys.
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'network error';
    return { ok: false, error: `Could not reach GitHub (${message}).` };
  }

  if (response.status === 404) {
    return { ok: false, error: 'No release has been published on that repository yet.' };
  }
  if (response.status === 401 || response.status === 403) {
    return {
      ok: false,
      error:
        'GitHub refused the request. A private fork needs RAISONNE_UPDATE_GITHUB_TOKEN with contents:read, and a public one is rate-limited without it.',
    };
  }
  if (!response.ok) {
    return { ok: false, error: `GitHub answered ${response.status}.` };
  }

  try {
    return { ok: true, body: await response.json() };
  } catch {
    return { ok: false, error: 'GitHub returned a body that was not JSON.' };
  }
}

function releaseFromGithub(body: Record<string, unknown>, repo: string): UpstreamRelease | null {
  const tag = typeof body.tag_name === 'string' ? body.tag_name.trim() : '';
  if (!tag) return null;
  // Drafts and prereleases are not what "latest stable" means. The releases
  // API's /latest already skips drafts; prereleases still appear when they
  // are the only release, which is honest for an early project.
  if (body.draft === true) return null;
  const version = versionFromTag(tag);
  if (!version) return null;
  const htmlUrl =
    typeof body.html_url === 'string' && body.html_url
      ? body.html_url
      : `${updateReleasesUrl(repo)}/tag/${encodeURIComponent(tag)}`;
  return {
    version,
    tag,
    url: htmlUrl,
    notes: plainNotes(body.body),
    publishedAt: typeof body.published_at === 'string' ? body.published_at : null,
  };
}

async function latestFromTags(repo: string): Promise<UpstreamRelease | null> {
  const result = await fetchJson(updateApiTagsUrl(repo));
  if (!result.ok) return null;
  if (!Array.isArray(result.body) || result.body.length === 0) return null;
  for (const entry of result.body) {
    if (!entry || typeof entry !== 'object') continue;
    const name = typeof (entry as { name?: unknown }).name === 'string' ? (entry as { name: string }).name : '';
    if (!name) continue;
    const version = versionFromTag(name);
    if (!/^\d+\.\d+/.test(version)) continue;
    return {
      version,
      tag: name,
      url: `${updateReleasesUrl(repo)}/tag/${encodeURIComponent(name)}`,
      notes: '',
      publishedAt: null,
    };
  }
  return null;
}

export interface LatestCheck {
  release: UpstreamRelease | null;
  error: string | null;
  repo: string;
  fetchedAt: number;
}

/**
 * The latest published release for this install's upstream.
 *
 * Pass `force` after an apply so the panel does not keep showing the version
 * it cached before the tree moved.
 */
export async function checkLatestRelease(options: { force?: boolean } = {}): Promise<LatestCheck> {
  const repo = updateRepo();
  const now = Date.now();
  if (!options.force && cache && cache.repo === repo && now - cache.fetchedAt < UPDATE_CHECK_TTL_MS) {
    return { release: cache.release, error: cache.error, repo, fetchedAt: cache.fetchedAt };
  }

  const latest = await fetchJson(updateApiLatestUrl(repo));
  let release: UpstreamRelease | null = null;
  let error: string | null = null;

  if (latest.ok && latest.body && typeof latest.body === 'object') {
    release = releaseFromGithub(latest.body as Record<string, unknown>, repo);
    if (!release) error = 'The latest release on GitHub had no usable tag.';
  } else {
    // No /releases/latest yet: fall back to tags so an install tracking a
    // repo that only pushed tags still learns there is something newer.
    const fromTags = await latestFromTags(repo);
    if (fromTags) {
      release = fromTags;
    } else {
      error = latest.ok === false ? latest.error : 'No release and no version tag found on the upstream repository.';
    }
  }

  cache = { release, error, fetchedAt: now, repo };
  return { release, error, repo, fetchedAt: now };
}

export function clearUpdateCheckCache(): void {
  cache = null;
}

export function upstreamLinks(repo = updateRepo()) {
  return {
    repo,
    url: updateRepoUrl(repo),
    releasesUrl: updateReleasesUrl(repo),
  };
}
