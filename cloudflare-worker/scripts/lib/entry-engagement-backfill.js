import { isV3CoreEvent, normalizeV3Path } from '../../src/analytics/v3/model.js';
import { gradeEntryEvidence, mergeEntryEvidence, parseEntryEvidence } from '../../src/analytics/v3/entry-engagement.js';

const dayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' });
const timestamp = value => {
  const normalized = String(value || '').replace(' ', 'T');
  return Date.parse(/[zZ]|[+-]\d\d:\d\d$/.test(normalized) ? normalized : `${normalized}Z`);
};

// Only the verified first page instance may contribute evidence. This function
// changes no counts and is shared by the offline audit and its safety tests.
export function recoverEntryEvidence(session, rows) {
  if (session.entry_evidence != null || !session.landing_page || !session.visitor_id) return null;
  const all = rows.filter(row => row.session_id === session.session_id && row.visitor_id === session.visitor_id
    && isV3CoreEvent({ ...row, event_type: 'page_view' }))
    .map(row => ({ ...row, page: normalizeV3Path(row.page), time: timestamp(row.ts) }))
    .filter(row => Number.isFinite(row.time)).sort((a, b) => a.time - b.time || Number(a.id) - Number(b.id));
  const coreOnDay = all.filter(row => dayFormatter.format(new Date(row.time)) === session.day && isV3CoreEvent(row));
  const first = coreOnDay.find(row => row.event_type === 'page_view')
    || (session.entry_is_image_fallback ? coreOnDay.find(row => row.event_type === 'chapter_view') : null);
  if (!first || first.page !== normalizeV3Path(session.landing_page) || !first.page_instance_id) return null;
  const instanceRows = all.filter(row => row.page_instance_id === first.page_instance_id && row.time >= first.time);
  // Old SPA pages reused a document instance. Stop actions at the first other
  // page, and reject old dwell completely if this instance visited another URL.
  const otherPage = instanceRows.find(row => row.page && row.page !== first.page);
  const entryRows = instanceRows.filter(row => row.page === first.page && (!otherPage || row.time < otherPage.time));
  let evidence = mergeEntryEvidence(null, entryRows, first.page);
  if (!evidence) return null;
  evidence.startedAt = first.ts;
  evidence.pageInstanceId = first.page_instance_id;
  const hasNewTiming = entryRows.some(row => parseEntryEvidence(row.engagement_meta)?.version === 1
    && Number.isFinite(row.engaged_ms) && row.engaged_ms >= 0);
  if (!hasNewTiming && !otherPage) {
    const times = entryRows.filter(row => ['page_engagement', 'session_exit'].includes(row.event_type)
      && Number.isFinite(row.engaged_ms) && row.engaged_ms >= 0
      && row.engaged_ms <= row.time - first.time + 5000);
    if (times.length) {
      evidence.visibleMs = Math.max(...times.map(row => row.engaged_ms));
      evidence.timingSource = 'legacy-validated';
    }
  }
  evidence.grade = gradeEntryEvidence(evidence);
  if (evidence.grade == null) return null;
  return { ...evidence, origin: 'historical-audit-v1', firstRawEventId: Number(first.id) };
}

export function backfillUpdateSql(session, evidence) {
  const quote = value => `'${String(value).replace(/'/g, "''")}'`;
  return `UPDATE analytics_v3_daily_sessions SET entry_evidence=${quote(JSON.stringify(evidence))}`
    + ` WHERE day=${quote(session.day)} AND session_id=${quote(session.session_id)}`
    + ` AND visitor_id=${quote(session.visitor_id)} AND landing_page=${quote(session.landing_page)} AND entry_evidence IS NULL;`;
}
