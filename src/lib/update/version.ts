import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * What this install is running.
 *
 * package.json is the source of truth for the version string a release ships.
 * Git is optional extra context for the panel (commit, dirty), never a
 * substitute for the version field: a release without a bumped version is a
 * release nobody can tell apart from the last one.
 */

export interface PackageIdentity {
  name: string;
  version: string;
}

export interface GitIdentity {
  commit: string | null;
  dirty: boolean;
  /** True when .git exists and git answered. */
  isRepo: boolean;
  /** remote origin url, if any. */
  origin: string | null;
  /** Absolute path of the work tree root git reported, or the process cwd. */
  root: string;
}

function projectRoot(): string {
  // next runs from the package root in both `next dev` and `next start`.
  return process.cwd();
}

export function readPackageIdentity(root = projectRoot()): PackageIdentity {
  const path = join(root, 'package.json');
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as { name?: unknown; version?: unknown };
    const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : 'raisonne';
    const version =
      typeof raw.version === 'string' && raw.version.trim() ? raw.version.trim().replace(/^v/i, '') : '0.0.0';
    return { name, version };
  } catch {
    return { name: 'raisonne', version: '0.0.0' };
  }
}

function git(args: string[], root: string): string | null {
  try {
    return execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5_000,
    }).trim();
  } catch {
    return null;
  }
}

export function readGitIdentity(root = projectRoot()): GitIdentity {
  if (!existsSync(join(root, '.git'))) {
    return { commit: null, dirty: false, isRepo: false, origin: null, root };
  }

  const top = git(['rev-parse', '--show-toplevel'], root) ?? root;
  const commit = git(['rev-parse', '--short', 'HEAD'], top);
  const status = git(['status', '--porcelain'], top);
  const origin = git(['remote', 'get-url', 'origin'], top);

  return {
    commit,
    dirty: Boolean(status && status.length > 0),
    isRepo: commit !== null,
    origin,
    root: top,
  };
}

/**
 * Compare two dotted versions. Pre-release tags (-rc.1) sort below the plain
 * version. Returns negative when a < b, zero when equal, positive when a > b.
 * Non-numeric junk is treated as 0 so a bad string never throws.
 */
export function compareVersions(a: string, b: string): number {
  const parse = (value: string) => {
    const cleaned = value.trim().replace(/^v/i, '');
    const [core, pre = ''] = cleaned.split('-', 2);
    const parts = core.split('.').map(part => {
      const n = Number.parseInt(part.replace(/[^0-9].*$/, ''), 10);
      return Number.isFinite(n) ? n : 0;
    });
    while (parts.length < 3) parts.push(0);
    return { parts, pre };
  };

  const left = parse(a);
  const right = parse(b);
  const len = Math.max(left.parts.length, right.parts.length);
  for (let i = 0; i < len; i += 1) {
    const d = (left.parts[i] ?? 0) - (right.parts[i] ?? 0);
    if (d !== 0) return d;
  }
  if (!left.pre && right.pre) return 1;
  if (left.pre && !right.pre) return -1;
  if (left.pre === right.pre) return 0;
  return left.pre < right.pre ? -1 : 1;
}
