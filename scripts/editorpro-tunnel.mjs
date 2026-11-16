// Run alongside `npx netlify dev`; owns only the password gateway and named connector.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';
import { createEditorGateway } from './editorpro-auth-proxy.mjs';

dotenv.config({ path: '.env.local', quiet: true });
const port = Number(process.env.EDITORPRO_AUTH_PORT || 8890);
const hostname = process.env.EDITORPRO_PUBLIC_HOST || 'editorpro-dev.k4studios.com';
const config = resolve('.netlify/editorpro-tunnel.yml');
if (!existsSync(config)) throw new Error('Missing local named-tunnel config: .netlify/editorpro-tunnel.yml');
const windowsCloudflared = process.env.APPDATA && resolve(process.env.APPDATA, 'npm/node_modules/cloudflared/bin/cloudflared.exe');
const executable = process.env.CLOUDFLARED_PATH || (process.platform === 'win32' && existsSync(windowsCloudflared) ? windowsCloudflared : 'cloudflared');
const gateway = createEditorGateway({ password: process.env.EDITORPRO_PASSWORD, hostname });
let connector;
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  connector?.kill();
  gateway.closeAllConnections();
  gateway.close();
  process.exitCode = code;
  setTimeout(() => process.exit(code), 500).unref();
}
gateway.on('error', (error) => { console.error(error.message); stop(1); });
gateway.listen(port, '127.0.0.1', () => {
  connector = spawn(executable, ['tunnel', '--config', config, '--metrics', '127.0.0.1:20242', 'run'], { stdio: 'inherit', windowsHide: true });
  connector.on('error', (error) => { console.error(error.message); stop(1); });
  connector.on('exit', (code) => stop(code || 0));
  console.log(`EditorPro: https://${hostname}/admin/GalleryEditor (password protected)`);
  console.log(`Local gateway: 127.0.0.1:${port}; Netlify Dev must be running on port 8888.`);
});
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
