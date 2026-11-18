import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { parse } from 'parse5';
import { getV3CoreSummary } from '../src/analytics/v3/queries.js';
import { summarizeV3Rollup } from '../src/analytics/v3/model.js';
import { renderDashboardV3 } from '../src/analytics/v3/renderer.js';

const db = new DatabaseSync(':memory:');
db.exec('CREATE TABLE raw_events (id INTEGER PRIMARY KEY);');
const migrations = new URL('../migrations/', import.meta.url);
for (const name of (await readdir(migrations)).filter((name) => name.includes('analytics-v3')
  || ['2026-11-13-add-visitor-status.sql', '2026-11-16-add-entry-engagement.sql'].includes(name)).sort()) {
  db.exec(await readFile(new URL(name, migrations), 'utf8'));
}
const now = new Date();
const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(now);
const past = new Date(`${day}T12:00:00Z`); past.setUTCDate(past.getUTCDate() - 2);
const previousDay = past.toISOString().slice(0, 10);
const city = 'Los Angeles, California, US', otherCity = 'Kent, Ohio, US';
const fixture = [
  [previousDay, 'a-new', 'a', 'new', city, null],
  [day, 'a-return', 'a', 'returning', city, otherCity],
  [day, 'b-1', 'b', 'returning', city, city],
  [day, 'b-2', 'b', 'returning', city, city],
  [day, 'c', 'c', null, city, null],
  [day, 'd', 'd', 'new', city, city],
  [day, 'e', 'e', 'returning', city, city],
  [day, 'f', 'f', 'new', city, city],
  [day, 'g', 'g', 'returning', city, city],
  [day, 'h', 'h', null, null, city]
];
for (const row of fixture) db.prepare(`INSERT INTO analytics_v3_daily_sessions
  (day,session_id,visitor_id,visitor_status,visitor_geo,image_geo) VALUES (?,?,?,?,?,?)`).run(...row);
const queries = [];
const env = { DB: {
  prepare(sql) {
    queries.push(sql);
    const bound = (values = []) => ({ bind: (...args) => bound(args), async all() { return { results: db.prepare(sql).all(...values) }; } });
    return bound();
  },
  async batch(statements) { return Promise.all(statements.map((statement) => statement.all())); }
} };
const summary = await getV3CoreSummary(env, { now, windowKey: '7d' });
assert.deepEqual(summary.visitorGeography, [{ label: city, count: 8,
  visitorMix: { newVisitors: 3, returningVisitors: 3, unknownVisitors: 2 } }]);
assert.deepEqual(summary.imageGeography, [
  { label: city, count: 6, visitorMix: { newVisitors: 2, returningVisitors: 3, unknownVisitors: 1 }, imageViews: 0 },
  { label: otherCity, count: 1, visitorMix: { newVisitors: 1, returningVisitors: 0, unknownVisitors: 0 }, imageViews: 0 }
]);
assert.equal(summary.visitorGeography[0].count, Object.values(summary.visitorGeography[0].visitorMix).reduce((sum, value) => sum + value, 0));
assert.ok(queries.every((sql) => !/raw_events|\bINSERT\b|\bUPDATE\b/i.test(sql)), 'Geography mix reads compact summaries only');
const today = await getV3CoreSummary(env, { now, windowKey: 'today' });
assert.deepEqual(today.visitorGeography[0].visitorMix, { newVisitors: 2, returningVisitors: 4, unknownVisitors: 2 },
  'Classification follows the selected period, with new taking precedence only inside that period');
assert.equal(today.imageGeography.find((row) => row.label === otherCity).visitorMix.returningVisitors, 1);

const model = summarizeV3Rollup({ daily: [], dimensions: [], images: [], imageGeography: [], visitors: [],
  sessions: fixture.map(([day, sessionId, visitorId, visitorStatus, visitorGeo, imageGeo]) => ({ day, sessionId, visitorId, visitorStatus, visitorGeo, imageGeo })) });
assert.deepEqual(model.visitorGeography, summary.visitorGeography, 'Archive and SQL models must use identical distinct-visitor classification');
assert.deepEqual(model.imageGeography, summary.imageGeography);

const html = renderDashboardV3({ summary });
const tree = parse(html);
const nodes = [];
function walk(node) { nodes.push(node); for (const child of node.childNodes || []) walk(child); }
walk(tree);
const attr = (node, name) => node.attrs?.find((attribute) => attribute.name === name)?.value;
const hasClass = (node, name) => (attr(node, 'class') || '').split(' ').includes(name);
const text = node => node.nodeName === '#text' ? node.value : (node.childNodes || []).map(text).join('');
const previews = nodes.filter((node) => hasClass(node, 'geo-star-preview'));
assert.deepEqual(previews.map((node) => (text(node).match(/★/g) || []).length), [5, 5, 1], 'At most five visitor stars belong in each row');
assert.ok(previews.some((node) => attr(node, 'aria-label') === '3 new, 3 returning, 2 unknown; 8 distinct visitors'));
assert.equal(nodes.filter((node) => hasClass(node, 'geo-overflow')).length, 2, 'Only counts above five get +');
assert.ok(nodes.filter((node) => hasClass(node, 'geo-overflow')).every((node) => attr(node, 'open') === undefined));
assert.ok(nodes.some((node) => hasClass(node, 'geo-full-stars') && attr(node, 'data-star-count') === '3'));
assert.ok(!/<span class="geo-full-stars[^>]*>★/.test(html), 'Full lists materialize on demand without adding database reads');
const legacy = renderDashboardV3({ summary: { visitorGeography: [{ label: 'Unclassified, GB', count: 1 }] } });
assert.ok(legacy.includes('0 new, 0 returning, 1 unknown; 1 distinct visitors'));
assert.ok(html.includes('var(--new-accent)') && html.includes('var(--returning-accent)'));
await mkdir(new URL('../tmp/', import.meta.url), { recursive: true });
await writeFile(new URL('../tmp/geo-mix-preview.html', import.meta.url), html);
console.log('Geography visitor mix passed: distinct visitors, period precedence, image fallback, unknowns, five-star limit, full-list counts, summary-only SQL.');
