import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildV3RollupBatch, summarizeV3Rollup } from '../src/analytics/v3/model.js';
import { renderDashboardV3 } from '../src/analytics/v3/renderer.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const archiveDir = path.resolve(here, '../d1-backups/purge-candidates-20260624-retention45-r2/raw_events');
const requestedDays = Math.max(1, Math.min(Number(process.argv.find((arg) => arg.startsWith('--days='))?.split('=')[1] || 7), 49));
const files = (await readdir(archiveDir)).filter((name) => name.endsWith('.json')).sort().slice(-requestedDays);
const rows = [];

for (const file of files) {
  const payload = JSON.parse(await readFile(path.join(archiveDir, file), 'utf8'));
  for (const result of payload) rows.push(...(result?.results || []));
}

const rollup = buildV3RollupBatch(rows);
const summary = summarizeV3Rollup(rollup, `${files.length}-day archived sample`);
const html = renderDashboardV3({ summary });
let incrementalRollupWrites = 2; // acquire and release the update lock
for (let index = 0; index < rows.length; index += 250) {
  const batch = buildV3RollupBatch(rows.slice(index, index + 250));
  incrementalRollupWrites += batch.daily.length + batch.dimensions.length
    + batch.sessions.length + batch.images.length + 1; // cursor
}
incrementalRollupWrites += rollup.visitors.length;

assert.ok(rows.length > 0, 'archive must contain rows');
assert.ok(rollup.accepted > 0, 'archive must contain confirmed core events');
assert.ok(rollup.accepted < rollup.scanned, 'diagnostic and pixel rows must stay out of the core population');
assert.ok(summary.counts.sessions > 0, 'archive should produce confirmed sessions');
assert.ok(summary.counts.page_views > 0, 'archive should produce page views');
assert.ok(summary.entryPages.length > 0, 'archive should produce entry pages');
assert.ok(summary.visitorGeography.length > 0, 'archive should produce visitor geography');
assert.ok(summary.imageGeography.length > 0, 'archive should produce image-viewer geography');
assert.ok(summary.imageGeography.some((row) => row.imageViews > 0), 'image geography should include view totals');
assert.ok(summary.topImages.some((row) => row.pagePath), 'image rows should retain clickable page paths');
assert.ok(html.includes('pricing-opened'), 'priced images should restore the green V2 highlight');
assert.ok(!html.includes('harvester_friction'), 'diagnostic data must not be embedded in the initial report');
assert.ok(html.includes('Load diagnostics'), 'manual diagnostic gate must be present');
assert.ok(html.includes('Update with new rows'), 'cursor update control must be present');

console.log(JSON.stringify({ files, rollupRows: {
  daily: rollup.daily.length, sessions: rollup.sessions.length,
  visitors: rollup.visitors.length, dimensions: rollup.dimensions.length, images: rollup.images.length,
  estimatedIncrementalWrites: incrementalRollupWrites,
  writesPerScannedRawRow: Number((incrementalRollupWrites / rollup.scanned).toFixed(3))
}, ...summary }, null, 2));
