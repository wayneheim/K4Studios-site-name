import assert from 'node:assert/strict';
import { buildV3RollupBatch, summarizeV3Rollup } from '../src/analytics/v3/model.js';
import { renderDashboardV3 } from '../src/analytics/v3/renderer.js';

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

console.log('Analytics V3 visitor-mix tests passed.');
