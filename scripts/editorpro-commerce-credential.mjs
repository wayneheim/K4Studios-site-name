import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

export const COMMERCE_ORIGIN = 'https://k4-commerce-live.wayneheim.workers.dev';
export const credentialPath = (root = process.cwd()) => resolve(root, '.netlify/editorpro-commerce.json');

// DPAPI binds this local service credential to the current Windows account.
// Plaintext travels only through child-process pipes, never arguments or files.
export function protectCommerceCredential(value, decrypt = false) {
  if (process.platform !== 'win32') throw new Error('EditorPro commerce credential storage requires Windows.');
  const script = decrypt
    ? `$cipher=[Console]::In.ReadToEnd().Trim();$secure=ConvertTo-SecureString $cipher;$ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure);try{[Console]::Out.Write([Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr))}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)}`
    : `$plain=[Console]::In.ReadToEnd();$secure=ConvertTo-SecureString $plain -AsPlainText -Force;[Console]::Out.Write((ConvertFrom-SecureString $secure))`;
  const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
    input: value, encoding: 'utf8', windowsHide: true,
  });
  if (result.error || result.status !== 0 || !result.stdout.trim()) throw new Error('Could not access the protected EditorPro commerce credential.');
  return result.stdout.trim();
}

export function loadCommerceCredential(root = process.cwd()) {
  const file = credentialPath(root);
  if (!existsSync(file)) return null;
  const saved = JSON.parse(readFileSync(file, 'utf8'));
  if (saved.version !== 1 || typeof saved.protectedToken !== 'string') throw new Error('Invalid protected EditorPro commerce credential file.');
  const token = protectCommerceCredential(saved.protectedToken, true);
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error('Invalid EditorPro commerce credential.');
  return token;
}
