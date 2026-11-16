import assert from 'node:assert/strict';
import { buildV3RollupBatch, summarizeV3Rollup } from '../src/analytics/v3/model.js';
import { renderDashboardV3 } from '../src/analytics/v3/renderer.js';
import analyticsWorker from '../src/analytics/worker.js';

const base = {
  source: 'js', event_type: 'page_view', target_id: '/', page: '/',
  referer: null, entry_referrer: null, country: 'US', region: 'Ohio', city: 'Kent',
  cf_asn: 10796, ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', ip: '198.51.100.10'
};
const rows = [
  { ...base, id: 1, ts: '2026-11-12T15:00:00Z', session_id: 'new-1', visitor_id: 'visitor-new-1', visitor_status: 'new' },
  { ...base, id: 2, ts: '2026-11-12T16:00:00Z', session_id: 'new-2', visitor_id: 'visitor-new-2', visitor_status: 'new' },
  { ...base, id: 3, ts: '2026-11-12T17:00:00Z', session_id: 'returning-1', visitor_id: 'visitor-returning-1', visitor_status: 'returning' },
  { ...base, id: 4, ts: '2026-11-13T15:00:00Z', session_id: 'returning-2', visitor_id: 'visitor-new-1', visitor_status: 'returning' },
  { ...base, id: 5, ts: '2026-11-13T16:00:00Z', session_id: 'unknown-1', visitor_id: 'visitor-unknown-1', visitor_status: null }
];

const rollup = buildV3RollupBatch(rows);
const summary = summarizeV3Rollup(rollup, 'Visitor mix fixture');
assert.equal(rollup.sessions.find((row) => row.sessionId === 'new-1')?.visitorStatus, 'new');
assert.deepEqual(
  { newVisitors: summary.visitorMix.newVisitors, returningVisitors: summary.visitorMix.returningVisitors, unknownVisitors: summary.visitorMix.unknownVisitors },
  { newVisitors: 2, returningVisitors: 1, unknownVisitors: 1 }
);

const todayHtml = renderDashboardV3({ summary: {
  ...summary,
  window: { key: 'today', label: 'Today' },
  visitorMix: { newVisitors: 2, returningVisitors: 1, unknownVisitors: 0, daily: [] }
} });
assert.ok(todayHtml.includes('visitor-mix-new'));
assert.ok(todayHtml.includes('<span>New</span><strong>67%</strong>'));
assert.ok(!todayHtml.includes('New vs. returning visitors'));

const returningHtml = renderDashboardV3({ summary: {
  ...summary,
  window: { key: 'yesterday', label: 'Yesterday' },
  visitorMix: { newVisitors: 1, returningVisitors: 3, unknownVisitors: 0, daily: [] }
} });
assert.ok(returningHtml.includes('visitor-mix-returning'));
assert.ok(returningHtml.includes('<span>Returning</span><strong>75%</strong>'));

const periodHtml = renderDashboardV3({ summary: {
  ...summary,
  window: { key: '7d', label: 'Last 7 days' }
} });
assert.ok(periodHtml.includes('New vs. returning visitors'));
assert.ok(periodHtml.includes('visitor-mix-totals'));
assert.ok(periodHtml.includes('visitor is not classified'));
assert.ok(!periodHtml.includes('visitor-mix-new"><span>New</span><strong>'));

// Exercise the deployed entry point: the standalone collector is not used by
// wrangler.analytics.toml, so model/renderer tests alone cannot catch dropped status.
for (const status of ['new', 'returning', null, 'invalid']) {
  const writes = [];
  const pending = [];
  const env = { DB: { prepare(sql) {
    return { bind(...values) {
      return { async run() {
        writes.push({ sql, values });
        return { success: true };
      } };
    } };
  } } };
  const request = new Request('https://edge.k4studios.com/__k4e', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': base.ua,
      'CF-Connecting-IP': base.ip,
      'Accept-Language': 'en-US',
      Origin: 'https://www.k4studios.com'
    },
    body: JSON.stringify({
      event: 'page_view', page_path: '/', session_id: 'collector-session',
      visitor_id: 'collector-visitor', visitor_status: status
    })
  });
  Object.defineProperty(request, 'cf', { value: { country: 'US', asn: 10796 } });
  const response = await analyticsWorker.fetch(request, env, {
    waitUntil(promise) { pending.push(promise); }
  });
  await Promise.all(pending);
  assert.equal(response.status, 204);
  const rawWrites = writes.filter(({ sql }) => /INSERT INTO raw_events/.test(sql));
  assert.equal(rawWrites.length, 1, 'Visitor classification must reuse the event write');
  const columns = rawWrites[0].sql.match(/raw_events \(([^)]+)\)/)[1].split(',').map((s) => s.trim());
  const saved = Object.fromEntries(columns.map((column, i) => [column, rawWrites[0].values[i]]));
  assert.equal(saved.visitor_id, 'collector-visitor');
  assert.equal(saved.session_id, 'collector-session');
  assert.equal(saved.visitor_status ?? null, ['new', 'returning'].includes(status) ? status : null);
}

console.log('Analytics V3 visitor-mix tests passed.');
