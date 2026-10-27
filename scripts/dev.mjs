import { existsSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { spawnSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const args = process.argv.slice(2);
if (args.length && !(args.length === 2 && args[0] === '--port' && /^\d{1,5}$/.test(args[1]) && +args[1] > 0 && +args[1] <= 65535)) {
  throw new Error('Use npm run dev, or npm run dev -- --port 8788. This preview always uses local data.');
}
if (!existsSync('.dev.vars')) {
  const key = randomBytes(32).toString('hex');
  writeFileSync('.dev.vars', `PORTAL_ADMIN_KEY="${key}"\nPORTAL_ENVIRONMENT="preview"\n`, { mode: 0o600 });
}
const key = readFileSync('.dev.vars', 'utf8').match(/^PORTAL_ADMIN_KEY="?([^"\r\n]+)"?/m)?.[1];
if (!key || key.length < 32) throw new Error('Set a random PORTAL_ADMIN_KEY of at least 32 characters in .dev.vars.');
mkdirSync('.portal-access', { recursive: true, mode: 0o700 });
writeFileSync('.portal-access/local-owner-key.txt', key + '\n', { mode: 0o600 });
const wrangler = 'node_modules/wrangler/bin/wrangler.js';
const result = spawnSync(process.execPath, [wrangler, 'd1', 'migrations', 'apply', 'PORTAL_DB', '--local'], { stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status || 1);
console.log('Owner portal: /secretary/admin. Your local owner key is in .portal-access/local-owner-key.txt.');
console.log('Local edits use a local database and never change the live website.');
const child = spawn(process.execPath, [wrangler, 'dev', '--local', '--ip', '127.0.0.1', ...args], { stdio: 'inherit' });
child.on('exit', code => process.exit(code || 0));
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
