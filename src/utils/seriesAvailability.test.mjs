import test from 'node:test';
import assert from 'node:assert/strict';
import { getConfiguredSeries, getOfferedSeries, resolveImageSeries } from '../data/seriesAvailability.js';

test('limited editions exclude both open tiers without changing stored assignments', () => {
  for (const tiers of [['chronicle'], ['legend'], ['foundation', 'chronicle'], ['sketch', 'foundation', 'chronicle', 'legend']]) {
    const record = { tiers };
    const before = [...tiers];
    assert.deepEqual(getOfferedSeries({}, record), tiers.filter(tier => ['chronicle', 'legend'].includes(tier)));
    assert.deepEqual(getConfiguredSeries({}, record), before);
    assert.deepEqual(record.tiers, before);
  }
});

test('open-only pieces keep their offers and noSketch remains respected', () => {
  assert.deepEqual(getOfferedSeries({}), ['sketch', 'foundation']);
  assert.deepEqual(getOfferedSeries({ noSketch: true }), ['foundation']);
  assert.deepEqual(getOfferedSeries({ availableSeries: [] }), ['sketch']);
  assert.deepEqual(getOfferedSeries({ availableSeries: [], noSketch: true }), []);
});

test('Merchant context offers only Sketch even for limited pieces', () => {
  const record = { tiers: ['foundation', 'chronicle', 'legend'] };
  assert.deepEqual(getOfferedSeries({}, record, { merchantSketch: true }), ['sketch']);
  assert.deepEqual(getOfferedSeries({ noSketch: true }, record, { merchantSketch: true }), []);
});

test('gallery-specific registry takes precedence over stale image assignments', () => {
  const image = { id: 'i-test', availableSeries: ['foundation'] };
  const registry = { images: { 'i-test:/src/data/Galleries/Test.mjs': 'limited' }, series: { limited: { tiers: ['legend'] } } };
  assert.deepEqual(resolveImageSeries({ image, galleryPath: '/Galleries/Test', registry }).tiers, ['legend']);
  assert.deepEqual(resolveImageSeries({ image, galleryPath: '/Galleries/Test', registry, merchantSketch: true }).tiers, ['sketch']);
});
