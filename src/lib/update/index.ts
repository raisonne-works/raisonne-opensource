/**
 * Raisonne app updates: the whole install, not a CMS payload.
 *
 *   getUpdateStatus()  — current version vs upstream latest
 *   applyUpdate()      — pull a release into a git-based install
 *
 * Relative imports keep the `.ts` extension so scripts/update.ts can load
 * these modules with node the same way scripts/snapshot-chain.ts does.
 */

export type {
  ApplyCapability,
  ApplyRecord,
  ApplyResult,
  UpdateStatus,
  UpstreamRelease,
  VersionRelation,
} from './types.ts';

export { updateApplyEnabled, updateRepo, updateRepoUrl, updateReleasesUrl } from './config.ts';
export { checkLatestRelease, clearUpdateCheckCache, upstreamLinks } from './check.ts';
export { compareVersions, readGitIdentity, readPackageIdentity } from './version.ts';
export { applyCapability, applyUpdate, applyUpdateFromCli, getUpdateStatus } from './apply.ts';
