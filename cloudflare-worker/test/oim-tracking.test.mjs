import test from 'node:test';
import assert from 'node:assert/strict';
import { buildV3RollupBatch, summarizeV3Rollup } from '../src/analytics/v3/model.js';

test('OIM logo opens from different pages combine into one engagement action', () => {
  const base = {
    ts: '2026-11-23T15:00:00Z', event_type: 'oim_info_open', source: 'js',
    source_layer: 'oim_info_open_v1', session_id: 'oim-session', visitor_id: 'oim-visitor',
    country: 'US', cf_asn: 10796, ip: '198.51.100.10',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  };
  const rows = ['/Galleries/Test/i-first', '/Galleries/Test/all', '/cowboy-art-prints']
    .map((page, index) => ({ ...base, id: index + 1, page, target_id: `i-work${index}` }));
  const summary = summarizeV3Rollup(buildV3RollupBatch([
    ...rows,
    { ...base, id: 4, page: '/Galleries/Test/i-first', event_type: 'collector_notes_open' },
    { ...rows[0], id: 5, source: 'pixel' },
  ]));
  assert.deepEqual(summary.actions.filter(row => row.label === 'OIM-1 logo opened'), [
    { label: 'OIM-1 logo opened', count: 3 },
  ]);
  assert.equal(summary.actions.find(row => row.label === 'Collector notes opened')?.count, 1);
  assert.equal(summary.actionGroups.find(row => row.label === 'Engagement')?.count, 4);
  assert.ok(summary.cartFunnel.every(row => row.count === 0));
});
