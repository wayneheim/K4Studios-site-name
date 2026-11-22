import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEditionCatalog } from './editionCatalog.js';

test('mixed tiers partition stably without changing membership, order, or identity', () => {
  const images = [
    { id: 'open-1', tiers: [{ key: 'sketch', pricing: [{ price: 25 }] }] },
    { id: 'limited-1', tiers: [{ key: 'foundation', pricing: [{ price: 75 }] }, { key: 'chronicle', pricing: [{ price: 1100 }] }] },
    { id: 'open-2', tiers: [{ key: 'foundation', pricing: [{ price: 150 }] }] },
    { id: 'limited-2', tiers: [{ key: 'legend', pricing: [{ price: 3800 }] }] },
    { id: 'wood', tiers: [] },
  ];
  const before = structuredClone(images);
  const result = buildEditionCatalog(images, image => image.tiers);
  assert.equal(result.hasSplit, true);
  assert.deepEqual(result.orderedEntries.map(entry => entry.item.id), ['limited-1', 'limited-2', 'wood', 'open-1', 'open-2']);
  assert.deepEqual(result.orderedEntries.map(entry => entry.idx), [1, 3, 4, 0, 2]);
  assert.equal(result.limitedPrice, 1100);
  assert.equal(result.openPrice, 25);
  assert.equal(result.limitedCount, 3);
  assert.deepEqual(images, before);
  assert.equal(result.orderedEntries[0].item, images[1]);
});

test('single-group and empty grids retain input order and suppress headers', () => {
  for (const tiers of [[], [{ key: 'sketch' }], [{ key: 'legend' }]]) {
    const images = [{ id: 'first' }, { id: 'second' }];
    const result = buildEditionCatalog(images, () => tiers);
    assert.equal(result.hasSplit, false);
    assert.deepEqual(result.orderedEntries.map(entry => entry.item), images);
  }
  assert.equal(buildEditionCatalog([], () => []).hasSplit, false);
});

test('section prices use only valid prices supplied for the applicable editions', () => {
  const result = buildEditionCatalog([
    { tiers: [{ key: 'sketch', pricing: [{ price: 25 }] }, { key: 'chronicle', pricing: [{ price: NaN }, { price: 0 }, { price: 1500 }] }] },
    { tiers: [{ key: 'foundation', pricing: [{ price: 150 }] }] },
  ], image => image.tiers);
  assert.equal(result.limitedPrice, 1500);
  assert.equal(result.openPrice, 150);
});
