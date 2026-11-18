import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import { gradeEntryEvidence, mergeEntryEvidence } from '../src/analytics/v3/entry-engagement.js';
import { buildV3RollupBatch } from '../src/analytics/v3/model.js';
import { updateV3Rollups } from '../src/analytics/v3/updater.js';
import { getV3CoreSummary, getV3EntryVisits } from '../src/analytics/v3/queries.js';
import { renderDashboardV3, renderEntryVisits } from '../src/analytics/v3/renderer.js';
import worker from '../src/analytics/worker.js';

assert.equal(gradeEntryEvidence(null), null);
assert.equal(gradeEntryEvidence({ visibleMs: null, scrollDepth: null }), null);
assert.equal(gradeEntryEvidence({ visibleMs: 0, scrollDepth: 0 }), 1);
assert.equal(gradeEntryEvidence({ visibleMs: 120000, scrollDepth: 0 }), 1, 'Time alone must not imply strong engagement');
assert.equal(gradeEntryEvidence({ visibleMs: 12000, scrollDepth: 30 }), 2);
assert.equal(gradeEntryEvidence({ visibleMs: 35000, scrollDepth: 70 }), 3);
assert.equal(gradeEntryEvidence({ interactionMask: 8 }), 3);

const now = new Date();
const stamp = now.toISOString();
const path = '/Blog/entry-engagement-test';
const base = { ts: stamp, source: 'js', page: path, event_type: 'page_view',
  session_id: 'session-1', visitor_id: 'visitor-1', page_instance_id: 'page-1',
  country: 'US', cf_asn: 10796, ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', ip: '198.51.100.10' };
const lifecycle = (overrides = {}) => ({ ...base, event_type: 'page_engagement', engaged_ms: 35000,
  engagement_meta: JSON.stringify({ version: 1, startedAt: stamp, scrollDepth: 70, interactionMask: 1 }), ...overrides });
let evidence = mergeEntryEvidence(null, [base, lifecycle()], path);
assert.equal(evidence.grade, 3);
evidence = mergeEntryEvidence(evidence, [lifecycle({ event_type: 'session_exit' })], path);
assert.equal(evidence.visibleMs, 35000, 'Visibility and exit summaries are cumulative, not additive');
evidence = mergeEntryEvidence(evidence, [lifecycle({ page_instance_id: 'return-to-same-url', engaged_ms: 999000 })], path);
assert.equal(evidence.visibleMs, 35000, 'A return to the same URL must not inflate the first entry visit');
evidence = mergeEntryEvidence(evidence, [lifecycle({ page: '/second-page', engaged_ms: 999000 })], path);
assert.equal(evidence.visibleMs, 35000, 'Downstream pages must not inflate entry engagement');
assert.equal(mergeEntryEvidence(null, [{ ...base, event_type: 'session_exit', engaged_ms: 999000 }], path).grade, null,
  'Legacy SPA timers must not produce a confident dwell grade');
assert.equal(buildV3RollupBatch([lifecycle()]).sessions.length, 0, 'A lone lifecycle event must not manufacture a session');
assert.equal(buildV3RollupBatch([{ ...lifecycle(), cf_asn: 207990 }]).sessions.length, 0, 'Bot exclusions apply to lifecycle facts');

// Run the production SQL against SQLite rather than mocking query results.
const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE raw_events (
  id INTEGER PRIMARY KEY,ts TEXT,event_type TEXT,target_id TEXT,page TEXT,session_id TEXT,visitor_id TEXT,
  referer TEXT,entry_referrer TEXT,document_referrer TEXT,source TEXT,source_layer TEXT,country TEXT,
  region TEXT,city TEXT,cf_asn INTEGER,ua TEXT,ip TEXT,ip_hash TEXT,utm_source TEXT,utm_medium TEXT,
  utm_campaign TEXT,page_instance_id TEXT,engaged_ms INTEGER
); CREATE INDEX idx_raw_events_ts ON raw_events(ts);`);
const migrationDir = new URL('../migrations/', import.meta.url);
for (const name of (await readdir(migrationDir)).filter((name) => name.includes('analytics-v3')
  || ['2026-11-13-add-visitor-status.sql', '2026-11-16-add-entry-engagement.sql'].includes(name)).sort()) {
  db.exec(await readFile(new URL(name, migrationDir), 'utf8'));
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
      async run() {
        const result = db.prepare(sql).run(...values);
        return { meta: { changes: Number(result.changes) } };
      }
    });
    return bound();
  }
} };
// D1 batch supports both SELECT and mutation statements.
env.DB.batch = async (queries) => {
  const results = [];
  for (const query of queries) {
    // SQLite all() also executes INSERT/UPDATE; metadata is only needed for locks.
    results.push(await query.all());
  }
  return results;
};
function insert(row) {
  const keys = Object.keys(row);
  db.prepare(`INSERT INTO raw_events (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`).run(...keys.map((key) => row[key]));
}
for (let i = 1; i <= 4; i++) insert({ ...base, id: i + 1, session_id: `session-${i}`, visitor_id: `visitor-${i}`, page_instance_id: `page-${i}` });
await updateV3Rollups(env, { maxRows: 4 });
const before = db.prepare('SELECT COUNT(*) count FROM analytics_v3_daily_sessions').get().count;
assert.equal(before, 4);
insert({ ...lifecycle(), id: 6 });
insert({ ...lifecycle({ session_id: 'session-2', visitor_id: 'visitor-2', page_instance_id: 'page-2', engaged_ms: 2000,
  engagement_meta: JSON.stringify({ version: 1, startedAt: stamp, scrollDepth: 0, interactionMask: 0 }) }), id: 7 });
insert({ ...lifecycle({ session_id: 'session-3', visitor_id: 'visitor-3', page_instance_id: 'page-3', engaged_ms: 15000,
  engagement_meta: JSON.stringify({ version: 1, startedAt: stamp, scrollDepth: 30, interactionMask: 0 }) }), id: 8 });
await updateV3Rollups(env, { maxRows: 3 });
insert({ ...lifecycle({ event_type: 'session_exit' }), id: 9 });
await updateV3Rollups(env, { maxRows: 1 });
const summary = await getV3CoreSummary(env, { now });
const entry = summary.entryNavigation.find((row) => row.label === path);
assert.deepEqual(entry, { label: path, entries: 4, continued: 0, chapters: 0, graded: 3, gradeTotal: 6 });
assert.equal(summary.counts.sessions, 4);
assert.equal(summary.counts.page_views, 4);
assert.equal(summary.counts.engaged_sessions, 0, 'Lifecycle observations must not inflate the existing engagement KPI');
const mainQueries = statements.slice();
statements.length = 0;
await getV3CoreSummary(env, { now });
assert.ok(statements.every((sql) => !/raw_events|\bINSERT\b|\bUPDATE\b/i.test(sql)), 'Dashboard must read summaries only');
statements.length = 0;
const details = await getV3EntryVisits(env, { path, now });
assert.equal(details.visits.length, 4);
assert.deepEqual(details.visits.map((row) => row.grade).sort(), [1, 2, 3, null].sort());
assert.equal(details.visits.find((row) => row.grade === 3).visibleMs, 35000);
assert.ok(statements.every((sql) => !/raw_events/.test(sql)), 'Expanding a row must not read raw events');
assert.ok(mainQueries.filter((sql) => /SELECT day,session_id,landing_page/.test(sql))
  .every((sql) => /day=\? AND session_id=\?/.test(sql)), 'Updater evidence reads must use the existing primary key');
const html = renderDashboardV3({ summary });
assert.ok(html.includes('2.0&#9733;'));
assert.ok(html.includes('3 of 4 visits graded; 1 unknown'));
assert.ok(html.includes('aria-expanded="false"'));
assert.ok(html.includes('class="entry-detail-row" hidden'));
assert.ok(!/<details class="[^"]*oim-domain-funnel" open>/.test(html), 'No OIM activity must start collapsed');
assert.ok(/<details class="[^"]*oim-domain-funnel" open>/.test(renderDashboardV3({ summary: {
  ...summary, oimDomainFunnel: [{ label: 'one-image-movie.com', entries: 1, continued: 0, chapters: 0 }]
} })), 'OIM activity must start open');
assert.ok(renderEntryVisits(details.visits).includes('Visible time: <b>35.0s</b>'));
assert.ok(!renderEntryVisits([{ ...details.visits[0], source: '<script>alert(1)</script>' }]).includes('<script>'));
const protectedResponse = await worker.fetch(new Request('https://edge.k4studios.com/__k4stats-v3/entry-visits?path=/'), env, {});
assert.equal(protectedResponse.status, 401, 'Visit details must remain behind dashboard authentication');
const testEnv = { ...env, ANALYTICS_PASSWORD: 'local-test-only' };
const testHeaders = { Authorization: 'Basic ' + Buffer.from('k4admin:local-test-only').toString('base64') };
const authenticatedDetails = await worker.fetch(new Request('https://edge.k4studios.com/__k4stats-v3/entry-visits?'
  + new URLSearchParams({ path }), { headers: testHeaders }), testEnv, {});
assert.equal(authenticatedDetails.status, 200);
assert.equal(((await authenticatedDetails.json()).html.match(/class="entry-visit"/g) || []).length, 4);
assert.equal((await worker.fetch(new Request('https://edge.k4studios.com/__k4stats-v3', { headers: testHeaders }), testEnv, {})).status, 200);
assert.equal((await worker.fetch(new Request('https://edge.k4studios.com/__k4stats-v3/entry-visits?path=bad', { headers: testHeaders }), testEnv, {})).status, 400);

// Bound detail payloads while allowing every visit to be expanded via pagination.
const sessionDay = db.prepare('SELECT day FROM analytics_v3_daily_sessions LIMIT 1').get().day;
for (let index = 0; index < 102; index++) {
  db.prepare('INSERT INTO analytics_v3_daily_sessions (day,session_id,landing_page) VALUES (?,?,?)')
    .run(sessionDay, `pagination-${String(index).padStart(3, '0')}`, '/pagination');
}
const firstPage = await getV3EntryVisits(env, { path: '/pagination', now });
assert.equal(firstPage.visits.length, 100);
assert.ok(firstPage.nextCursor);
const secondPage = await getV3EntryVisits(env, { path: '/pagination', now, cursor: JSON.parse(firstPage.nextCursor) });
assert.equal(secondPage.visits.length, 2);
assert.equal(secondPage.nextCursor, null);
const midnightLoad = { ...base, id: 1000, ts: '2026-11-16T04:59:59Z', session_id: 'midnight', page_instance_id: 'midnight-page' };
const midnightSeed = buildV3RollupBatch([midnightLoad]).sessions[0];
const midnightExit = { ...lifecycle(), id: 1001, ts: '2026-11-16T05:00:04Z', session_id: 'midnight', page_instance_id: 'midnight-page',
  engagement_meta: JSON.stringify({ version: 1, startedAt: midnightLoad.ts, scrollDepth: 70, interactionMask: 1 }) };
const midnightRollup = buildV3RollupBatch([midnightExit], [{ day: midnightSeed.day, session_id: 'midnight',
  landing_page: path, entry_evidence: JSON.stringify(midnightSeed.entryEvidence) }]);
assert.equal(midnightRollup.sessions[0].day, '2026-11-15', 'An exit after Eastern midnight must enrich the original entry day');

// Collector metadata must piggyback on one raw write, with bounded values.
const writes = [], pending = [];
const collectorEnv = { DB: { prepare(sql) { return { bind(...values) { return { async run() { writes.push({ sql, values }); return {}; } }; } }; } } };
const request = new Request('https://edge.k4studios.com/__k4e', { method: 'POST', headers: {
  'Content-Type': 'application/json', 'User-Agent': base.ua, 'CF-Connecting-IP': base.ip,
  Origin: 'https://www.k4studios.com'
}, body: JSON.stringify({ event: 'page_engagement', session_id: base.session_id, visitor_id: base.visitor_id,
  page_path: path, engaged_ms: 35000, engagement_meta: { version: 1, startedAt: stamp, scrollDepth: 200, interactionMask: 999 } }) });
Object.defineProperty(request, 'cf', { value: { country: 'US', asn: 10796 } });
assert.equal((await worker.fetch(request, collectorEnv, { waitUntil(promise) { pending.push(promise); } })).status, 204);
await Promise.all(pending);
const rawWrites = writes.filter(({ sql }) => /INSERT INTO raw_events/.test(sql));
assert.equal(rawWrites.length, 1);
const columns = rawWrites[0].sql.match(/raw_events \(([^)]+)\)/)[1].split(',').map((s) => s.trim());
const saved = Object.fromEntries(columns.map((column, index) => [column, rawWrites[0].values[index]]));
assert.deepEqual(JSON.parse(saved.engagement_meta), { version: 1, startedAt: stamp, scrollDepth: 100, interactionMask: 3 });

// Exercise the real TS collector in a browser-shaped VM, with no network.
const analyticsSource = await readFile(new URL('../../src/utils/analytics.ts', import.meta.url), 'utf8');
const clientCode = ts.transpileModule(analyticsSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const windowEvents = new Map(), documentEvents = new Map(), storage = new Map(), payloads = [];
let clock = Date.now();
class TestDate extends Date { constructor(...args) { super(...(args.length ? args : [clock])); } static now() { return clock; } }
const location = new URL('https://www.k4studios.com/Blog/entry-engagement-test');
const add = (map) => (type, listener) => { map.set(type, [...(map.get(type) || []), listener]); };
const document = { visibilityState: 'visible', referrer: '', cookie: '',
  documentElement: { scrollHeight: 2000, clientHeight: 1000, scrollTop: 0 },
  addEventListener: add(documentEvents), removeEventListener() {} };
const window = { location, scrollY: 0, addEventListener: add(windowEvents), removeEventListener() {},
  history: { pushState() {}, replaceState() {} } };
const sessionStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: (key) => storage.delete(key) };
const context = { exports: {}, window, document, location, history: window.history, sessionStorage, localStorage: sessionStorage,
  Date: TestDate, URL, URLSearchParams, crypto: globalThis.crypto, performance: { getEntriesByType: () => [] },
  navigator: { sendBeacon: (_url, blob) => { payloads.push(blob); return true; } }, Blob,
  fetch: async (_url, options) => { payloads.push(options.body); return { status: 204, ok: true }; },
  console, setTimeout() {}, queueMicrotask, Image: class {} };
vm.runInNewContext(clientCode, context);
context.exports.initScrollDepthTracking();
const emitWindow = (type, event = {}) => (windowEvents.get(type) || []).forEach((callback) => callback(event));
const emitDocument = (type, event = {}) => (documentEvents.get(type) || []).forEach((callback) => callback(event));
clock += 12000;
window.scrollY = 600;
emitWindow('scroll');
emitDocument('pointerdown', { isTrusted: true });
assert.equal(payloads.length, 0, 'Scrolling and clicks must not send extra analytics messages');
document.visibilityState = 'hidden';
emitDocument('visibilitychange');
clock += 100000;
emitWindow('pagehide');
const decodePayloads = async () => Promise.all(payloads.map(async (payload) => JSON.parse(typeof payload === 'string' ? payload : await payload.text())));
let sent = await decodePayloads();
assert.equal(sent[0].engaged_ms, 12000);
assert.equal(sent[1].engaged_ms, 12000);
assert.equal(sent[0].engagement_meta.scrollDepth, 60);
assert.equal(sent[0].engagement_meta.interactionMask, 1);
document.visibilityState = 'visible';
emitWindow('pageshow');
clock += 3000;
location.pathname = '/second-page';
context.exports.updatePageContext();
context.exports.initScrollDepthTracking();
clock += 4000;
emitWindow('pagehide');
sent = await decodePayloads();
assert.equal(sent.at(-1).page_path, '/second-page');
assert.equal(sent.at(-1).engaged_ms, 4000, 'SPA navigation must reset visible time');
assert.equal(sent.at(-1).engagement_meta.interactionMask, 0, 'SPA navigation must reset interaction flags');
assert.notEqual(sent.at(-1).page_instance_id, sent[0].page_instance_id);

await mkdir(new URL('../tmp/', import.meta.url), { recursive: true });
await writeFile(new URL('../tmp/entry-engagement-preview.html', import.meta.url), html);
console.log('Entry engagement passed: collector, browser lifecycle, SQL rollups, averages, unknowns, lazy details, auth, OIM collapse.');
