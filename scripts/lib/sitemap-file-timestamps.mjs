import { stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

// Each run reads current Git/worktree state; generated-output dates are never inputs.
export function createFileTimestampReader(repoRoot) {
  const cache = new Map();
  const git = args => execFileSync('git', args, {
    cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  git(['rev-parse', '--is-inside-work-tree']);
  return async function timestampForFile(file) {
    if (!cache.has(file)) cache.set(file, (async () => {
      const relative = path.relative(repoRoot, file).replaceAll('\\', '/');
      if (relative.startsWith('../') || path.isAbsolute(relative)) throw new Error('Lastmod source is outside the repository');
      const fileStat = await stat(file);
      const dirty = Boolean(git(['status', '--porcelain', '--untracked-files=all', '--', relative]));
      const committerTime = dirty ? '' : git(['log', '-1', '--format=%cI', '--', relative]);
      return {
        timestamp: dirty || !committerTime ? fileStat.mtime.toISOString() : committerTime,
        timestampMethod: dirty ? 'mtime-uncommitted' : committerTime ? 'git-committer' : 'mtime-no-git-history',
      };
    })());
    return cache.get(file);
  };
}
