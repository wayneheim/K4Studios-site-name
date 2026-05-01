import { spawn } from 'node:child_process';
import os from 'node:os';

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const maxOldSpaceSize = process.env.K4_BUILD_HEAP_MB || '24576';
const uvThreadpoolSize = process.env.UV_THREADPOOL_SIZE || String(Math.min(32, Math.max(4, os.cpus().length)));
const astroBuildConcurrency = process.env.ASTRO_BUILD_CONCURRENCY || String(Math.min(16, Math.max(2, Math.floor(os.cpus().length / 2))));

function run(command, args, options = {}) {
  const label = options.label || [command, ...args].join(' ');
  const started = performance.now();

  return new Promise((resolve, reject) => {
    console.log(`\n[build-local-fast] ${label}`);
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: {
        ...process.env,
        ...(options.env || {}),
      },
    });

    child.on('error', reject);
    child.on('close', (code, signal) => {
      const seconds = ((performance.now() - started) / 1000).toFixed(1);
      if (code === 0) {
        console.log(`[build-local-fast] done: ${label} (${seconds}s)`);
        resolve();
        return;
      }

      reject(new Error(`${label} failed with ${signal || `exit code ${code}`}`));
    });
  });
}

function npmScript(script) {
  return run(npmCmd, ['run', script, '--silent'], { label: script });
}

async function runParallel(labels) {
  await Promise.all(labels.map(npmScript));
}

async function main() {
  const started = performance.now();

  await npmScript('gen:master-data');

  await runParallel([
    'gen:prefetch-map',
    'gen:image-id-map',
    'gen:image-sitemaps',
    'gen:sitemap',
    'gen:sitemap:matches',
    'gen:story-slider',
    'gen:image-manifest',
    'copy:pricing',
    'copy:series-data',
    'gen:engrained-data',
  ]);

  await run(npxCmd, ['astro', 'build'], {
    label: 'astro build',
    env: {
      NODE_OPTIONS: `--max-old-space-size=${maxOldSpaceSize}`,
      UV_THREADPOOL_SIZE: uvThreadpoolSize,
      ASTRO_BUILD_CONCURRENCY: astroBuildConcurrency,
    },
  });

  await runParallel([
    'copy:redirects',
    'sanitize:public-output',
  ]);

  const seconds = ((performance.now() - started) / 1000).toFixed(1);
  console.log(`\n[build-local-fast] complete (${seconds}s)`);
}

main().catch((error) => {
  console.error(`\n[build-local-fast] ${error.message}`);
  process.exit(1);
});
