import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { recoverEntryEvidence, backfillUpdateSql } from './lib/entry-engagement-backfill.js';
import { mergeEntryEvidence, entryVisit } from '../src/analytics/v3/entry-engagement.js';
import { renderEntryVisits } from '../src/analytics/v3/renderer.js';

const session = { day: '2026-11-16', session_id: 'session-1', visitor_id: 'visitor-1',
  landing_page: '/Blog/entry-test', entry_evidence: null };
const base = { ...session, id: 1, ts: '2026-11-16T15:00:00Z', event_type: 'page_view',
  page: session.landing_page, page_instance_id: 'page-1', source: 'js',
  ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', country: 'US', cf_asn: 10796, ip: '198.51.100.10' };
const row = (seconds, overrides = {}) => ({ ...base, id: seconds + 1,
  ts: new Date(Date.parse(base.ts) + seconds * 1000).toISOString(), ...overrides });
const legacy = row(12, { event_type: 'session_exit', engaged_ms: 12000 });
const recovered = recoverEntryEvidence(session, [base, legacy]);
assert.equal(recovered.visibleMs, 12000);
assert.equal(recovered.timingSource, 'legacy-validated');
assert.equal(recovered.scrollDepth, null);
assert.equal(recovered.grade, 1);
assert.equal(recovered.origin, 'historical-audit-v1');
assert.equal(recoverEntryEvidence(session, [base]), null, 'A page load alone cannot become a graded visit');
assert.equal(recoverEntryEvidence(session, [base, { ...legacy, engaged_ms: 120000 }]), null, 'Reject implausible cumulative timers');
assert.equal(recoverEntryEvidence(session, [{ ...base, page_instance_id: null }, legacy]), null, 'No page identity means unknown');
assert.equal(recoverEntryEvidence({ ...session, entry_evidence: '{}' }, [base, legacy]), null, 'Never replace current collector evidence');
assert.equal(recoverEntryEvidence(session, [base, { ...legacy, visitor_id: 'other' }]), null);
assert.equal(recoverEntryEvidence(session, [{ ...base, cf_asn: 207990 }, { ...legacy, cf_asn: 207990 }]), null, 'Keep bot exclusions');

const otherPage = row(5, { page: '/next-page' });
assert.equal(recoverEntryEvidence(session, [base, otherPage, legacy]), null, 'Reject old SPA timing carried across pages');
const action = row(2, { event_type: 'gallery_preview_click' });
const earlyAction = recoverEntryEvidence(session, [base, action, otherPage, legacy]);
assert.equal(earlyAction.visibleMs, null);
assert.equal(earlyAction.grade, 2, 'An initial-page action can survive even when its timer is unsafe');
const laterAction = row(15, { event_type: 'xl_zoom' });
assert.equal(recoverEntryEvidence(session, [base, otherPage, laterAction, legacy]), null, 'A later return must not contribute initial-page actions');
const longLegacy = row(60, { event_type: 'page_engagement', engaged_ms: 60000 });
assert.equal(recoverEntryEvidence(session, [base, action, longLegacy]).grade, 2, 'Legacy time cannot promote navigation to strong engagement');
const duplicate = row(15, { event_type: 'page_engagement', engaged_ms: 15000 });
assert.equal(recoverEntryEvidence(session, [base, legacy, duplicate]).visibleMs, 15000, 'Use a maximum, not a sum');
const newTiming = row(35, { event_type: 'page_engagement', engaged_ms: 35000,
  engagement_meta: JSON.stringify({ version: 1, startedAt: base.ts, scrollDepth: 70, interactionMask: 1 }) });
const current = recoverEntryEvidence(session, [base, newTiming]);
assert.equal(current.grade, 3);
assert.equal(current.timingSource, 'visibility-v1');
assert.equal(current.scrollDepth, 70);
const laterBatch = mergeEntryEvidence(recovered, [row(15, { event_type: 'page_engagement', engaged_ms: 15000 })], base.page);
assert.equal(laterBatch.timingSource, 'legacy-validated', 'Incremental updates must preserve the legacy label');
assert.equal(laterBatch.visibleMs, 12000, 'Unvalidated later legacy times must not modify a validated historical maximum');
assert.ok(renderEntryVisits([entryVisit({ ...session, entry_evidence: JSON.stringify(recovered) })]).includes('Visible time (legacy)'));

const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE analytics_v3_daily_sessions (
  day TEXT,session_id TEXT,visitor_id TEXT,landing_page TEXT,entry_evidence TEXT,
  page_view_count INTEGER,engaged INTEGER,PRIMARY KEY(day,session_id));`);
db.prepare('INSERT INTO analytics_v3_daily_sessions VALUES (?,?,?,?,?,?,?)')
  .run(session.day, session.session_id, session.visitor_id, session.landing_page, null, 1, 0);
const before = db.prepare('SELECT COUNT(*) visits,SUM(page_view_count) views,SUM(engaged) engaged FROM analytics_v3_daily_sessions').get();
assert.equal(db.prepare(backfillUpdateSql(session, recovered)).run().changes, 1);
assert.equal(db.prepare(backfillUpdateSql(session, { ...recovered, grade: 3 })).run().changes, 0, 'Reruns and concurrent updates must not overwrite populated evidence');
assert.deepEqual(db.prepare('SELECT COUNT(*) visits,SUM(page_view_count) views,SUM(engaged) engaged FROM analytics_v3_daily_sessions').get(), before);
assert.deepEqual(JSON.parse(db.prepare('SELECT entry_evidence FROM analytics_v3_daily_sessions').get().entry_evidence), recovered);
console.log('Historical backfill passed: legacy validation, SPA/revisit exclusion, current-data protection, cumulative maxima, labels, idempotent evidence-only SQL.');
