import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { recoverEntryEvidence, backfillUpdateSql } from './lib/entry-engagement-backfill.js';

const workerDir = fileURLToPath(new URL('../', import.meta.url));
const cli = fileURLToPath(new URL('../../node_modules/wrangler/wrangler-dist/cli.js', import.meta.url));
const args = process.argv.slice(2);
const start = args.find(arg => arg.startsWith('--start='))?.slice(8);
const end = args.find(arg => arg.startsWith('--end='))?.slice(6);
if (![start, end].every(value => /^\d{4}-\d{2}-\d{2}$/.test(value || '')) || start > end) {
  throw new Error('Use --start=YYYY-MM-DD --end=YYYY-MM-DD, optionally --apply after reviewing the audit.');
}
const directory = path.join(workerDir, 'tmp', `entry-engagement-backfill-${start}-${end}`);
await mkdir(directory, { recursive: true });
const quote = value => `'${String(value).replace(/'/g, "''")}'`;
const load = async name => {
  try { return JSON.parse(await readFile(path.join(directory, name), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
};
const save = (name, value) => writeFile(path.join(directory, name), JSON.stringify(value, null, 2));
const usage = await load('usage.json') || { rowsRead: 0, rowsWritten: 0, queries: 0 };
async function query(sql, { mutation = false } = {}) {
  if (!mutation && usage.rowsRead >= 100000) throw new Error('Audit read cap reached; cached progress is preserved.');
  const result = spawnSync(process.execPath, [cli, 'd1', 'execute', 'k4-analytics', '--remote',
    '--config', 'wrangler.analytics.noroutes.toml', '--command', sql.replace(/\r?\n/g, ' '), '--json'],
  { cwd: workerDir, encoding: 'utf8', shell: false, windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error((result.stderr || result.stdout).slice(-2000));
  const payload = JSON.parse(result.stdout);
  for (const item of payload) {
    if (!item.success) throw new Error('D1 reported an unsuccessful query.');
    usage.rowsRead += Number(item.meta?.rows_read || 0);
    usage.rowsWritten += Number(item.meta?.rows_written || 0);
    usage.queries += 1;
  }
  await save('usage.json', usage);
  return payload;
}
const read = async sql => (await query(sql))[0].results;
const baselineSql = `SELECT COUNT(*) sessions,SUM(page_view_count) page_views,SUM(engaged) engaged,
  COUNT(DISTINCT visitor_id) visitors FROM analytics_v3_daily_sessions WHERE day BETWEEN ${quote(start)} AND ${quote(end)}`;

if (args.includes('--apply')) {
  const plan = await load('plan.json');
  const snapshot = await load('snapshot.json');
  if (!plan || !snapshot) throw new Error('Run the read-only audit first.');
  let changed = 0;
  for (let index = 0; index < plan.updates.length; index += 15) {
    const group = plan.updates.slice(index, index + 15);
    const result = await query(group.map(({ session, evidence }) => backfillUpdateSql(session, evidence)).join('\n'), { mutation: true });
    changed += result.reduce((sum, item) => sum + Number(item.meta?.changes || 0), 0);
    if (index % 150 === 0) console.log(JSON.stringify({ phase: 'apply', processed: Math.min(index + 15, plan.updates.length), total: plan.updates.length }));
  }
  const after = (await read(baselineSql))[0];
  const cursor = (await read('SELECT last_raw_event_id FROM analytics_v3_state WHERE singleton=1'))[0].last_raw_event_id;
  const countsUnchanged = JSON.stringify(after) === JSON.stringify(snapshot.baseline);
  if (Number(cursor) === Number(snapshot.cursor) && !countsUnchanged) throw new Error('Unexpected change in session counts; inspect the saved snapshot.');
  const report = { changed, ...plan.summary, countsUnchanged, updaterAdvanced: Number(cursor) !== Number(snapshot.cursor), usage };
  await save('applied.json', report);
  console.log(JSON.stringify(report));
  process.exit(0);
}

let snapshot = await load('snapshot.json');
if (!snapshot) {
  const state = (await read('SELECT last_raw_event_id FROM analytics_v3_state WHERE singleton=1'))[0];
  const baseline = (await read(baselineSql))[0];
  const sessions = await read(`SELECT * FROM analytics_v3_daily_sessions
    WHERE day BETWEEN ${quote(start)} AND ${quote(end)} AND entry_evidence IS NULL
      AND landing_page IS NOT NULL AND visitor_id IS NOT NULL AND visitor_id<>'' ORDER BY day DESC,session_id`);
  snapshot = { start, end, cursor: Number(state.last_raw_event_id), baseline, sessions };
  await save('snapshot.json', snapshot);
}
const visitors = [...new Set(snapshot.sessions.map(row => row.visitor_id))];
const byVisitor = new Map();
for (const session of snapshot.sessions) {
  if (!byVisitor.has(session.visitor_id)) byVisitor.set(session.visitor_id, []);
  byVisitor.get(session.visitor_id).push(session);
}
async function rawRows(group, afterId = 0) {
  const sessionIds = [...new Set(group.flatMap(visitor => byVisitor.get(visitor).map(row => row.session_id)))];
  const rows = await read(`SELECT id,ts,event_type,target_id,page,session_id,visitor_id,source,cf_asn,ua,
    country,ip,ip_hash,entry_referrer,document_referrer,referer,page_instance_id,engaged_ms,engagement_meta
    FROM raw_events INDEXED BY idx_raw_events_visitor_id
    WHERE visitor_id IN (${group.map(quote).join(',')}) AND session_id IN (${sessionIds.map(quote).join(',')})
      AND source='js' AND id>${Number(afterId)} AND id<=${snapshot.cursor}
      AND ts>=${quote(start + ' 00:00:00')} ORDER BY id LIMIT 5001`);
  if (rows.length < 5001) return rows;
  if (group.length > 1) {
    const half = Math.ceil(group.length / 2);
    return [...await rawRows(group.slice(0, half)), ...await rawRows(group.slice(half))];
  }
  const first = rows.slice(0, 5000);
  return [...first, ...await rawRows(group, Number(first.at(-1).id))];
}
const updates = [];
const summary = { examined: snapshot.sessions.length, recovered: 0, withTiming: 0, legacyTiming: 0, withActions: 0,
  remainingUnknown: 0, todayRecovered: 0, todayLegacyTiming: 0, grades: { 1: 0, 2: 0, 3: 0 } };
let examinedVisitors = 0;
for (let index = 0; index < visitors.length; index += 80) {
  const group = visitors.slice(index, index + 80);
  const cacheName = `raw-${String(index).padStart(5, '0')}.json`;
  let rows = await load(cacheName);
  if (!rows) { rows = await rawRows(group); await save(cacheName, rows); }
  const grouped = new Map();
  for (const row of rows) {
    if (!grouped.has(row.visitor_id)) grouped.set(row.visitor_id, []);
    grouped.get(row.visitor_id).push(row);
  }
  for (const visitor of group) for (const session of byVisitor.get(visitor)) {
    const evidence = recoverEntryEvidence(session, grouped.get(visitor) || []);
    if (!evidence) continue;
    updates.push({ session, evidence });
    summary.recovered++;
    if (evidence.visibleMs != null) summary.withTiming++;
    if (evidence.timingSource === 'legacy-validated') summary.legacyTiming++;
    if (evidence.interactionMask) summary.withActions++;
    if (session.day === end) summary.todayRecovered++;
    if (session.day === end && evidence.timingSource === 'legacy-validated') summary.todayLegacyTiming++;
    summary.grades[evidence.grade]++;
  }
  examinedVisitors += group.length;
  console.log(JSON.stringify({ phase: 'audit', visitors: examinedVisitors, totalVisitors: visitors.length,
    recovered: summary.recovered, rowsRead: usage.rowsRead }));
}
summary.remainingUnknown = summary.examined - summary.recovered;
await save('plan.json', { summary, updates });
console.log(JSON.stringify({ ...summary, usage, plan: path.join(directory, 'plan.json'), applied: false }));
