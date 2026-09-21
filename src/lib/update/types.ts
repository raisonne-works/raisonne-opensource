/**
 * What an install knows about its own version, and what the upstream has.
 *
 * Raisonne is one self-hosted app per artist. Updates are the whole app:
 * the same tree that runs the site, not a CMS payload and not a plugin.
 * Local data (fixtures/local, .data, .env) is never part of an update.
 */

/** A published release of the Raisonne app itself. */
export interface UpstreamRelease {
  /** Semver without a leading v, e.g. "0.2.0". */
  version: string;
  /** Tag name as published, e.g. "v0.2.0". */
  tag: string;
  /** Release page the artist can open. */
  url: string;
  /** Short body from the release notes, plain text, may be empty. */
  notes: string;
  /** When the release was published, ISO 8601, or null. */
  publishedAt: string | null;
}

export type VersionRelation = 'behind' | 'current' | 'ahead' | 'unknown';

export type ApplyCapability =
  | { ok: true; method: 'git' }
  | {
      ok: false;
      /**
       * Why this install cannot apply an update itself. The panel prints the
       * sentence as-is; the command is the one thing to run instead.
       */
      reason: string;
      command: string | null;
    };

export interface UpdateStatus {
  /** What this process is running right now. */
  current: {
    version: string;
    /** package.json name, usually "raisonne". */
    name: string;
    /** Git HEAD short sha when the install is a clone, else null. */
    commit: string | null;
    /** True when the working tree has uncommitted tracked changes. */
    dirty: boolean;
  };
  /** Where releases are read from. */
  upstream: {
    repo: string;
    /** https://github.com/{repo} */
    url: string;
    /** https://github.com/{repo}/releases */
    releasesUrl: string;
  };
  /** Latest stable release, or null when none could be read. */
  latest: UpstreamRelease | null;
  /** How current sits against latest. */
  relation: VersionRelation;
  /** Whether the owner can press Update on this install. */
  apply: ApplyCapability;
  /** Last apply attempt this process knows about, if any. */
  lastApply: ApplyRecord | null;
  /** When this status was assembled, ISO 8601. */
  checkedAt: string;
  /** Soft error while talking to GitHub; the rest of the status still stands. */
  checkError: string | null;
}

export interface ApplyRecord {
  /** The version that was requested. */
  targetVersion: string;
  /** The tag that was checked out. */
  targetTag: string;
  ok: boolean;
  /** One sentence for the panel. */
  summary: string;
  /** Longer log the panel can show when something failed. */
  detail: string | null;
  /** ISO 8601. */
  finishedAt: string;
  /** True when the tree moved and the running process is still the old build. */
  restartRequired: boolean;
}

export interface ApplyResult {
  ok: boolean;
  summary: string;
  detail: string | null;
  restartRequired: boolean;
  status: UpdateStatus;
}
