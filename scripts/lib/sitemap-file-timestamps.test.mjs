import assert from 'node:assert/strict';
import { mkdtemp, writeFile, utimes, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createFileTimestampReader } from './sitemap-file-timestamps.mjs';

test('clean files use commit time; dirty, staged and new files use their own mtime', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'k4-lastmod-time-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith('k4-lastmod-time-'));
    return rm(root, { recursive: true, force: true });
  });
  const git = args => execFileSync('git', args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], env: {
    ...process.env, GIT_AUTHOR_DATE: '2021-01-02T12:00:00Z', GIT_COMMITTER_DATE: '2021-01-02T12:00:00Z',
  } });
  git(['init', '--quiet']);
  const file = path.join(root, 'article.ts');
  await writeFile(file, 'original');
  git(['add', 'article.ts']);
  git(['-c', 'user.name=Lastmod Test', '-c', 'user.email=lastmod@example.invalid', 'commit', '--quiet', '--no-gpg-sign', '-m', 'content']);
  await utimes(file, new Date('2027-01-01'), new Date('2027-01-01'));
  const clean = await createFileTimestampReader(root)(file);
  assert.equal(Date.parse(clean.timestamp), Date.parse('2021-01-02T12:00:00Z'));
  assert.equal(clean.timestampMethod, 'git-committer');
  await writeFile(file, 'changed');
  await utimes(file, new Date('2022-02-02'), new Date('2022-02-02'));
  assert.deepEqual(await createFileTimestampReader(root)(file), { timestamp: '2022-02-02T00:00:00.000Z', timestampMethod: 'mtime-uncommitted' });
  git(['add', 'article.ts']);
  assert.equal((await createFileTimestampReader(root)(file)).timestamp, '2022-02-02T00:00:00.000Z');
  const fresh = path.join(root, 'new.ts');
  await writeFile(fresh, 'new');
  await utimes(fresh, new Date('2023-03-03'), new Date('2023-03-03'));
  assert.deepEqual(await createFileTimestampReader(root)(fresh), { timestamp: '2023-03-03T00:00:00.000Z', timestampMethod: 'mtime-uncommitted' });
});
