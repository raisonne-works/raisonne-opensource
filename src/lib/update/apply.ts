import { execFile, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { updateApplyEnabled, updateRepo, updateRepoUrl } from './config.ts';
import type { ApplyCapability, ApplyRecord, ApplyResult, UpdateStatus, VersionRelation } from './types.ts';
import { checkLatestRelease, clearUpdateCheckCache, upstreamLinks } from './check.ts';
import { compareVersions, readGitIdentity, readPackageIdentity } from './version.ts';

/**
 * Applies a Raisonne app update on a git-based install.
 *
 * What is never touched:
 *   - src/fixtures/local/   (the artist's catalogue)
 *   - .data/                (orders, update state)
 *   - .env*                 (secrets)
 *   - node_modules/         (reinstalled after)
 *
 * Those paths are gitignored, so a clean fast-forward cannot carry them
 * away. The guard below still refuses a dirty worktree so a half-edited
 * source file is not silently discarded.
 *
 * What this deliberately does not do is restart the Node process. The
 * running server is still the old build until the host rebuilds and
 * restarts it (`pnpm build && pnpm start`, or the platform's deploy). The
 * panel says so.
 */

const execFileAsync = promisify(execFile);

const STATE_DIR = '.data';
const STATE_FILE = 'update-state.json';
const LOCK_FILE = 'update.lock';

function statePath(root: string): string {
  return join(root, STATE_DIR, STATE_FILE);
}

function lockPath(root: string): string {
  return join(root, STATE_DIR, LOCK_FILE);
}

function git(args: string[], root: string, timeoutMs = 60_000): string {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: timeoutMs,
  }).trim();
}

async function gitAsync(args: string[], root: string, timeoutMs = 120_000): Promise<string> {
  const { stdout } = await execFileAsync('git', args, {
    cwd: root,
    encoding: 'utf8',
    timeout: timeoutMs,
    maxBuffer: 8 * 1024 * 1024,
  });
  return (stdout ?? '').trim();
}

function originMatchesUpstream(origin: string | null, repo: string): boolean {
  if (!origin) return false;
  const normalised = origin
    .trim()
    .replace(/\.git$/i, '')
    .replace(/^git@github\.com:/i, 'https://github.com/')
    .replace(/^ssh:\/\/git@github\.com\//i, 'https://github.com/')
    .replace(/\/$/i, '')
    .toLowerCase();
  const expected = `https://github.com/${repo}`.toLowerCase();
  return normalised === expected || normalised.endsWith(`/${repo.toLowerCase()}`);
}

function relationOf(current: string, latest: string | null): VersionRelation {
  if (!latest) return 'unknown';
  const cmp = compareVersions(current, latest);
  if (cmp < 0) return 'behind';
  if (cmp > 0) return 'ahead';
  return 'current';
}

function readLastApply(root: string): ApplyRecord | null {
  try {
    const raw = JSON.parse(readFileSync(statePath(root), 'utf8')) as Partial<ApplyRecord>;
    if (typeof raw.targetVersion !== 'string' || typeof raw.ok !== 'boolean' || typeof raw.finishedAt !== 'string') {
      return null;
    }
    return {
      targetVersion: raw.targetVersion,
      targetTag: typeof raw.targetTag === 'string' ? raw.targetTag : raw.targetVersion,
      ok: raw.ok,
      summary: typeof raw.summary === 'string' ? raw.summary : raw.ok ? 'Updated.' : 'Update failed.',
      detail: typeof raw.detail === 'string' ? raw.detail : null,
      finishedAt: raw.finishedAt,
      restartRequired: raw.restartRequired === true,
    };
  } catch {
    return null;
  }
}

function writeLastApply(root: string, record: ApplyRecord): void {
  mkdirSync(join(root, STATE_DIR), { recursive: true });
  writeFileSync(statePath(root), `${JSON.stringify(record, null, 2)}\n`, 'utf8');
}

function cliCommand(version: string | null): string {
  return version ? `pnpm update:raisonne -- --to=${version}` : 'pnpm update:raisonne';
}

export function applyCapability(root?: string, options: { via?: 'web' | 'cli' } = {}): ApplyCapability {
  const gitId = readGitIdentity(root);
  const repo = updateRepo();
  const command = cliCommand(null);
  const via = options.via ?? 'web';

  if (via === 'web' && !updateApplyEnabled()) {
    return {
      ok: false,
      reason:
        'Applying an update from the site is off on this install. Set RAISONNE_UPDATE=1 to allow it, or run the command on the host.',
      command,
    };
  }

  if (!gitId.isRepo) {
    return {
      ok: false,
      reason:
        'This install is not a git checkout, so it cannot pull a release itself. If it runs from an image or a platform deploy, pull the new release there instead.',
      command: null,
    };
  }

  if (!originMatchesUpstream(gitId.origin, repo)) {
    return {
      ok: false,
      reason: `git origin is not ${updateRepoUrl(repo)}, so a pull would not be a Raisonne update. Point origin at that repository, or set RAISONNE_UPDATE_REPO to the fork this install tracks.`,
      command,
    };
  }

  if (gitId.dirty) {
    return {
      ok: false,
      reason:
        'The working tree has uncommitted changes. Commit, stash or discard them before updating, so the pull cannot overwrite work in progress.',
      command,
    };
  }

  return { ok: true, method: 'git' };
}

export async function getUpdateStatus(
  options: { forceCheck?: boolean; via?: 'web' | 'cli' } = {},
): Promise<UpdateStatus> {
  const pkg = readPackageIdentity();
  const gitId = readGitIdentity();
  const links = upstreamLinks();
  const latest = await checkLatestRelease({ force: options.forceCheck });
  const currentVersion = pkg.version;
  const via = options.via ?? 'web';

  return {
    current: {
      version: currentVersion,
      name: pkg.name,
      commit: gitId.commit,
      dirty: gitId.dirty,
    },
    upstream: links,
    latest: latest.release,
    relation: relationOf(currentVersion, latest.release?.version ?? null),
    apply: applyCapability(gitId.root, { via }),
    lastApply: readLastApply(gitId.root),
    checkedAt: new Date(latest.fetchedAt).toISOString(),
    checkError: latest.error,
  };
}

function isLocked(root: string): boolean {
  try {
    const raw = readFileSync(lockPath(root), 'utf8');
    const parsed = JSON.parse(raw) as { startedAt?: number };
    const startedAt = typeof parsed.startedAt === 'number' ? parsed.startedAt : 0;
    // A lock older than 30 minutes is treated as stale (process died mid-update).
    if (startedAt && Date.now() - startedAt > 30 * 60 * 1000) return false;
    return true;
  } catch {
    return false;
  }
}

function takeLock(root: string): boolean {
  mkdirSync(join(root, STATE_DIR), { recursive: true });
  if (isLocked(root) && existsSync(lockPath(root))) return false;
  writeFileSync(lockPath(root), `${JSON.stringify({ startedAt: Date.now(), pid: process.pid })}\n`, 'utf8');
  return true;
}

function releaseLock(root: string): void {
  try {
    unlinkSync(lockPath(root));
  } catch {
    // Best-effort: a missing lock is the state we wanted.
  }
}

async function runPnpmInstall(root: string): Promise<void> {
  const pnpm = process.env.npm_execpath?.includes('pnpm') ? 'pnpm' : 'pnpm';
  await execFileAsync(pnpm, ['install', '--frozen-lockfile'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 10 * 60 * 1000,
    maxBuffer: 16 * 1024 * 1024,
    env: process.env,
  }).catch(async error => {
    // Frozen lockfile fails when the release bumped the lock in a way the
    // local pnpm cannot honour; fall back to a plain install once.
    const message = error instanceof Error ? error.message : '';
    if (!/ERR_PNPM_OUTDATED_LOCKFILE|frozen-lockfile|lockfile/i.test(message)) throw error;
    await execFileAsync(pnpm, ['install'], {
      cwd: root,
      encoding: 'utf8',
      timeout: 10 * 60 * 1000,
      maxBuffer: 16 * 1024 * 1024,
      env: process.env,
    });
  });
}

/**
 * Pulls the requested release (or the latest) into this install.
 *
 * Safe to call from a route handler: it re-checks capability, takes a lock,
 * and never deletes local data directories.
 */
export async function applyUpdate(
  options: { toVersion?: string | null; via?: 'web' | 'cli' } = {},
): Promise<ApplyResult> {
  const gitId = readGitIdentity();
  const root = gitId.root;
  const via = options.via ?? 'web';
  const capability = applyCapability(root, { via });

  if (!capability.ok) {
    const status = await getUpdateStatus();
    return {
      ok: false,
      summary: 'This install cannot apply an update itself.',
      detail: capability.reason,
      restartRequired: false,
      status,
    };
  }

  if (!takeLock(root)) {
    const status = await getUpdateStatus();
    return {
      ok: false,
      summary: 'An update is already running on this install.',
      detail: 'Wait for it to finish, or clear .data/update.lock if a previous attempt died.',
      restartRequired: false,
      status,
    };
  }

  try {
    const latest = await checkLatestRelease({ force: true });
    const target = options.toVersion?.replace(/^v/i, '') || latest.release?.version || null;
    const tag =
      options.toVersion && options.toVersion.trim()
        ? options.toVersion.trim().startsWith('v')
          ? options.toVersion.trim()
          : `v${options.toVersion.trim()}`
        : latest.release?.tag || (target ? `v${target}` : null);

    if (!target || !tag) {
      const status = await getUpdateStatus({ forceCheck: true });
      const record: ApplyRecord = {
        targetVersion: target ?? 'unknown',
        targetTag: tag ?? 'unknown',
        ok: false,
        summary: 'No release to update to.',
        detail: latest.error ?? 'The upstream repository has not published a release yet.',
        finishedAt: new Date().toISOString(),
        restartRequired: false,
      };
      writeLastApply(root, record);
      return { ok: false, summary: record.summary, detail: record.detail, restartRequired: false, status };
    }

    const current = readPackageIdentity(root).version;
    if (compareVersions(current, target) === 0 && !options.toVersion) {
      const status = await getUpdateStatus({ forceCheck: true });
      return {
        ok: true,
        summary: `Already on ${current}.`,
        detail: null,
        restartRequired: false,
        status,
      };
    }

    // Re-check dirty immediately before touching the tree.
    const dirty = git(['status', '--porcelain'], root);
    if (dirty) {
      const status = await getUpdateStatus();
      return {
        ok: false,
        summary: 'The working tree became dirty before the update could start.',
        detail: dirty.slice(0, 500),
        restartRequired: false,
        status,
      };
    }

    await gitAsync(['fetch', '--tags', '--force', 'origin', tag], root);
    // Prefer a fast-forward merge onto the current branch when the tag is an
    // ancestor tip; fall back to checking out the tag in detached HEAD so a
    // release always lands even on a branch that diverged in history shape
    // but not content. Local data stays because it is untracked.
    try {
      await gitAsync(['merge', '--ff-only', tag], root);
    } catch {
      await gitAsync(['checkout', '--force', tag], root);
    }

    try {
      await runPnpmInstall(root);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'pnpm install failed.';
      const status = await getUpdateStatus({ forceCheck: true });
      const record: ApplyRecord = {
        targetVersion: target,
        targetTag: tag,
        ok: false,
        summary: `Code moved to ${tag}, but dependencies did not install.`,
        detail: detail.slice(0, 2000),
        finishedAt: new Date().toISOString(),
        restartRequired: true,
      };
      writeLastApply(root, record);
      clearUpdateCheckCache();
      return { ok: false, summary: record.summary, detail: record.detail, restartRequired: true, status };
    }

    clearUpdateCheckCache();
    const nextVersion = readPackageIdentity(root).version;
    const record: ApplyRecord = {
      targetVersion: nextVersion || target,
      targetTag: tag,
      ok: true,
      summary: `Updated to ${nextVersion || target}. Rebuild and restart the app to run it.`,
      detail: 'Run `pnpm build && pnpm start` (or redeploy on your host). Local catalogue data, orders and env files were left alone.',
      finishedAt: new Date().toISOString(),
      restartRequired: true,
    };
    writeLastApply(root, record);
    const status = await getUpdateStatus({ forceCheck: true });
    return {
      ok: true,
      summary: record.summary,
      detail: record.detail,
      restartRequired: true,
      status,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Update failed.';
    const status = await getUpdateStatus({ forceCheck: true });
    const record: ApplyRecord = {
      targetVersion: options.toVersion ?? 'latest',
      targetTag: options.toVersion ?? 'latest',
      ok: false,
      summary: 'The update did not finish.',
      detail: detail.slice(0, 2000),
      finishedAt: new Date().toISOString(),
      restartRequired: false,
    };
    writeLastApply(root, record);
    return { ok: false, summary: record.summary, detail: record.detail, restartRequired: false, status };
  } finally {
    releaseLock(root);
  }
}

/** For the CLI: same apply path, no HTTP. Host command is already explicit. */
export async function applyUpdateFromCli(toVersion?: string): Promise<ApplyResult> {
  return applyUpdate({ toVersion: toVersion ?? null, via: 'cli' });
}
