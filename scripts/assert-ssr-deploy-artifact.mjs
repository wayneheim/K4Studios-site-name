import fs from 'node:fs';
import path from 'node:path';

const workspaceRoot = process.cwd();
const candidates = [
  path.join(workspaceRoot, '.netlify', 'v1', 'functions', 'ssr', 'ssr.mjs'),
  path.join(workspaceRoot, '.netlify', 'functions-internal', 'ssr', 'ssr.mjs'),
  path.join(workspaceRoot, '.netlify', 'functions-internal', 'ssr.zip'),
];

const artifact = candidates.find((candidate) => {
  try {
    return fs.statSync(candidate).isFile() && fs.statSync(candidate).size > 0;
  } catch {
    return false;
  }
});

if (!artifact) {
  console.error('[deploy:ssr-guard] REFUSING DEPLOY: Astro SSR artifact is missing.');
  console.error('[deploy:ssr-guard] Run the full Astro build and verify .netlify/v1/functions/ssr/ssr.mjs before deploying.');
  process.exit(1);
}

console.log(`[deploy:ssr-guard] PASS: ${path.relative(workspaceRoot, artifact)}`);
