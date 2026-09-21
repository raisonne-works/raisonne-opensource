/**
 * CLI entry for `pnpm update:raisonne`.
 *
 * Same apply path the owner page uses, without HTTP. Useful on a host where
 * the site cannot rewrite its own tree (RAISONNE_UPDATE off, or no owner
 * session available during a deploy hook).
 *
 *   pnpm update:raisonne
 *   pnpm update:raisonne -- --to=0.2.0
 *   pnpm update:raisonne -- --check
 */

import { applyUpdateFromCli, getUpdateStatus } from '../src/lib/update/apply.ts';

function argValue(name: string): string | null {
  const prefix = `--${name}=`;
  for (const arg of process.argv.slice(2)) {
    if (arg === `--${name}`) return '1';
    if (arg.startsWith(prefix)) return arg.slice(prefix.length) || null;
  }
  return null;
}

async function main(): Promise<number> {
  const checkOnly = argValue('check') === '1' || process.argv.includes('--check');
  const to = argValue('to');

  if (checkOnly) {
    const status = await getUpdateStatus({ forceCheck: true, via: 'cli' });
    const latest = status.latest ? `v${status.latest.version}` : '(none)';
    console.log(`current\t v${status.current.version}${status.current.commit ? ` (${status.current.commit})` : ''}`);
    console.log(`latest\t ${latest}`);
    console.log(`relation\t ${status.relation}`);
    console.log(`upstream\t ${status.upstream.repo}`);
    if (status.checkError) console.log(`check\t ${status.checkError}`);
    if (!status.apply.ok) {
      console.log(`apply\t blocked: ${status.apply.reason}`);
      if (status.apply.command) console.log(`command\t ${status.apply.command}`);
    } else {
      console.log('apply\t ready');
    }
    return status.relation === 'behind' ? 2 : 0;
  }

  const result = await applyUpdateFromCli(to ?? undefined);
  console.log(result.ok ? 'ok' : 'failed');
  console.log(result.summary);
  if (result.detail) console.log(result.detail);
  if (result.restartRequired) {
    console.log('Restart required: pnpm build && pnpm start (or redeploy on your host).');
  }
  return result.ok ? 0 : 1;
}

main()
  .then(code => {
    process.exitCode = code;
  })
  .catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
