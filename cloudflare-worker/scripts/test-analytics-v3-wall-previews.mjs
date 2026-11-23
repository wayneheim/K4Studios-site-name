import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, readdir } from 'node:fs/promises';
import { buildV3RollupBatch, summarizeV3Rollup } from '../src/analytics/v3/model.js';
import { updateV3Rollups } from '../src/analytics/v3/updater.js';
import { getV3CoreSummary } from '../src/analytics/v3/queries.js';
import { renderDashboardV3 } from '../src/analytics/v3/renderer.js';

const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE raw_events (
  id INTEGER PRIMARY KEY,ts TEXT,event_type TEXT,target_id TEXT,page TEXT,session_id TEXT,visitor_id TEXT,
  referer TEXT,entry_referrer TEXT,document_referrer TEXT,source TEXT,source_layer TEXT,country TEXT,
  region TEXT,city TEXT,cf_asn INTEGER,ua TEXT,ip TEXT,ip_hash TEXT,utm_source TEXT,utm_medium TEXT,
  utm_campaign TEXT,page_instance_id TEXT,engaged_ms INTEGER
); CREATE INDEX idx_raw_events_ts ON raw_events(ts);`);
const migrations = new URL('../migrations/', import.meta.url);
for (const name of (await readdir(migrations)).filter(name => name.includes('analytics-v3')
  || ['2026-11-13-add-visitor-status.sql', '2026-11-16-add-entry-engagement.sql'].includes(name)).sort()) {
  db.exec(await readFile(new URL(name, migrations), 'utf8'));
}
db.prepare('UPDATE analytics_v3_state SET last_raw_event_id=1 WHERE singleton=1').run();
const statements = [];
const env = { DB: {
  prepare(sql) {
    statements.push(sql);
    const bound = (values = []) => ({
      bind: (...next) => bound(next),
      async all() { return { results: db.prepare(sql).all(...values) }; },
      async first() { return db.prepare(sql).get(...values) || null; },
      async run() { return { meta: { changes: Number(db.prepare(sql).run(...values).changes) } }; },
    });
    return bound();
  },
  async batch(queries) { return Promise.all(queries.map(query => query.all())); },
} };
const now = new Date();
const base = { ts: now.toISOString(), event_type: 'wall_preview_open', source: 'js',
  source_layer: 'wall_preview_size_5x7_v1', page: '/Galleries/Test/i-preview', target_id: 'i-preview',
  session_id: 's-1', visitor_id: 'v-1', country: 'US', cf_asn: 10796,
  ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', ip: '198.51.100.10' };
const events = [
  base, base,
  { ...base, source_layer: 'wall_preview_size_16x20_v1' },
  { ...base, source_layer: 'wall_preview_size_5x7_zoom_v2' },
  { ...base, source_layer: 'wall_preview_size_5x7_zoom_v2' },
  { ...base, source_layer: 'wall_preview_size_5x7_pricing_v2' },
  { ...base, source_layer: 'wall_preview_size_16x20_order_v2' },
  { ...base, source_layer: 'unexpected-label', session_id: 's-2', visitor_id: 'v-2' },
  { ...base, ua: 'Googlebot' }, { ...base, cf_asn: 16509 },
  { ...base, source: 'edge' }, { ...base, visitor_id: null },
  { ...base, ip: '184.56.48.57' },
  { ...base, event_type: 'page_view' },
  { ...base, ts: new Date(now.getTime() - 86400000).toISOString(), source_layer: 'wall_preview_size_40x60_v1', session_id: 's-3', visitor_id: 'v-3' },
];
assert.equal(buildV3RollupBatch(events).dimensions.filter(row => row.dimension === 'wall_preview_size').reduce((sum, row) => sum + row.count, 0), 9);
for (const [index, event] of events.entries()) {
  const row = { ...event, id: index + 2 };
  const keys = Object.keys(row);
  db.prepare(`INSERT INTO raw_events (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`).run(...keys.map(key => row[key]));
}
await updateV3Rollups(env, { maxRows: 4 });
await updateV3Rollups(env, { maxRows: 100 });
await updateV3Rollups(env, { maxRows: 100 });
statements.length = 0;
const summary = await getV3CoreSummary(env, { now });
assert.deepEqual(Object.fromEntries(summary.wallPreviews.map(row => [row.label, row.count])), {
  '5 × 7': 2, '16 × 20': 1, 'Unknown size': 1,
  '5 × 7 · Z': 2, '5 × 7 · P': 1, '16 × 20 · O': 1,
});
assert.ok(!statements.some(sql => /\braw_events\b/i.test(sql)), 'Dashboard reads must not scan raw events');
const html = renderDashboardV3({ summary });
const block = html.match(/<section class="panel wall-previews-panel">[\s\S]*?<\/section>/)?.[0];
assert.ok(block);
assert.match(block, /<strong>8<\/strong> preview clicks/);
assert.match(block, /25\.0%/);
assert.match(block, /12\.5%/);
assert.match(block, /<th>Source<\/th>/);
for (const [letter, label] of [['Z', 'Zoom'], ['P', 'Pricing'], ['O', 'Order']]) {
  assert.match(block, new RegExp(`title="${label} window" aria-label="${label} window">${letter}<`));
}
assert.match(block, /title="Source not recorded" aria-label="Source not recorded">—</);
const week = await getV3CoreSummary(env, { now, windowKey: '7d' });
assert.equal(week.wallPreviews.reduce((sum, row) => sum + row.count, 0), 9);
const empty = renderDashboardV3({ summary: { ...summary, wallPreviews: [] } });
assert.match(empty, /No preview clicks recorded for this period/);
assert.equal(summary.counts.pricing_opens, 0, 'A display preview is not a pricing open or a cart event');
// All seven sizes, three sources and legacy rows must fit without truncating totals.
const matrix = ['5x7', '8x10', '11x14', '16x20', '20x24', '30x40', '40x60'].flatMap(size =>
  ['v1', 'zoom_v2', 'pricing_v2', 'order_v2'].map(suffix => ({ ...base, source_layer: `wall_preview_size_${size}_${suffix}` })));
matrix.push({ ...base, source_layer: 'unknown' });
assert.equal(summarizeV3Rollup(buildV3RollupBatch(matrix)).wallPreviews.length, 29);
for (const [index, event] of matrix.entries()) {
  const row = { ...event, id: events.length + index + 2 };
  const keys = Object.keys(row);
  db.prepare(`INSERT INTO raw_events (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`).run(...keys.map(key => row[key]));
}
await updateV3Rollups(env, { maxRows: 100 });
statements.length = 0;
const complete = await getV3CoreSummary(env, { now });
assert.equal(complete.wallPreviews.length, 29);
assert.equal(complete.wallPreviews.reduce((sum, row) => sum + row.count, 0), 37);
assert.equal(statements.filter(sql => /\braw_events\b/i.test(sql)).length, 0);
assert.ok(statements.every(sql => /^\s*(SELECT|WITH)\b/i.test(sql)), 'Stats pulls must remain read-only');

db.close();
console.log('See on Wall analytics: repeat clicks, size breakdown, filters, date windows, incremental updates, read-only queries, and dashboard block passed.');
