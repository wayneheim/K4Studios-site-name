import assert from 'node:assert/strict';
import test from 'node:test';
import { VIDEO_LASTMOD_FLOORS, applyPublishedLastmodFloor } from './sitemap-lastmod-floors.mjs';

test('only the eight approved published dates can hold an older eligible timestamp', () => {
  assert.equal(Object.keys(VIDEO_LASTMOD_FLOORS).length, 8);
  for (const [url, floor] of Object.entries(VIDEO_LASTMOD_FLOORS)) {
    const source = { lastmod: '2026-04-30T18:00:03-04:00', contributingFile: 'src/pages/Videos/[slug].astro', sources: [] };
    const held = applyPublishedLastmodFloor(url, source);
    assert.equal(held.lastmod, floor);
    assert.equal(held.floorHeld, true);
    assert.equal(held.contributingFile, null);
    assert.equal(held.eligibleContributingFile, source.contributingFile);
    assert.equal(source.lastmod, '2026-04-30T18:00:03-04:00');
  }
  const other = { lastmod: '2026-04-30T18:00:03-04:00' };
  assert.equal(applyPublishedLastmodFloor('/Videos/new-video', other), other);
});

test('a newer eligible file advances the date, without advancing the fixed floor', () => {
  const url = '/Videos/only-path-forward';
  const source = { lastmod: '2026-11-23T12:00:00-05:00', contributingFile: 'src/pages/Videos/[slug].astro', sources: [] };
  const advanced = applyPublishedLastmodFloor(url, source);
  assert.equal(advanced.lastmod, source.lastmod);
  assert.equal(advanced.contributingFile, source.contributingFile);
  assert.equal(advanced.floorHeld, false);
  assert.equal(VIDEO_LASTMOD_FLOORS[url], '2026-11-04T21:26:36-05:00');
  assert.equal(applyPublishedLastmodFloor(url, { ...source, lastmod: '2026-04-30T18:00:03-04:00' }).lastmod, VIDEO_LASTMOD_FLOORS[url]);
});
