import { spawnSync } from 'node:child_process';
import os from 'node:os';

const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const kwlinkBuildSeed = process.env.K4_KWLINK_BUILD_SEED || new Date().toISOString();

const env = {
  ...process.env,
  K4_KWLINK_BUILD_SEED: kwlinkBuildSeed,
  NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=24576',
  UV_THREADPOOL_SIZE: process.env.UV_THREADPOOL_SIZE || String(Math.min(32, Math.max(4, os.cpus().length))),
  ASTRO_BUILD_CONCURRENCY:
    process.env.ASTRO_BUILD_CONCURRENCY || String(Math.min(16, Math.max(2, Math.floor(os.cpus().length / 2)))),
};

console.log(
  `[build:astro:fast] ASTRO_BUILD_CONCURRENCY=${env.ASTRO_BUILD_CONCURRENCY} UV_THREADPOOL_SIZE=${env.UV_THREADPOOL_SIZE} K4_KWLINK_BUILD_SEED=${env.K4_KWLINK_BUILD_SEED}`
);

const result = spawnSync(npxCmd, ['astro', 'build'], {
  stdio: 'inherit',
  env,
  shell: process.platform === 'win32',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
