import { randomBytes } from 'node:crypto';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { credentialPath, loadCommerceCredential, protectCommerceCredential } from './editorpro-commerce-credential.mjs';

const root = process.cwd();
const file = credentialPath(root);
const token = loadCommerceCredential(root) || randomBytes(32).toString('base64url');
const protectedToken = existsSync(file) ? null : protectCommerceCredential(token);
const env = { ...process.env };
delete env.CLOUDFLARE_API_TOKEN;
const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
  '$env:CLOUDFLARE_API_TOKEN=$null; & ../node_modules/.bin/wrangler.cmd secret put EDITORPRO_COMMERCE_TOKEN --config wrangler.live.toml'], {
  cwd: resolve(root, 'cloudflare-commerce'), env, input: token + String.fromCharCode(10), encoding: 'utf8', windowsHide: true,
});
const output = `${result.stdout || ''}${result.stderr || ''}`;
process.stdout.write(output);
if (result.error || !output.includes('Success! Uploaded secret EDITORPRO_COMMERCE_TOKEN')) throw new Error('Commerce credential setup did not confirm success.');
if (!existsSync(file)) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify({ version: 1, protectedToken }), { mode: 0o600, flag: 'wx' });
}
console.log('EditorPro commerce access configured. The credential is protected locally and was not added to any .env file.');
