import fs from 'node:fs';
import { PAPER_EDITION_LIMITS, ENGRAINED_EDITION_LIMIT, getArtistProofs, artistProofState, validateEditionCounts } from '../src/data/editionPolicy.js';
import { galleryData as engrained } from '../src/data/Other/K4-Select-Series/Engrained/Engrained-Series.mjs';

const registryPath = new URL('../src/data/seriesRegistry.json', import.meta.url);
const statePath = new URL('../src/data/editionState.json', import.meta.url);
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
let paperSizes = 0, woodProofs = 0;
for (const record of Object.values(registry.series || {})) {
  for (const tier of (record.tiers || []).filter(tier => PAPER_EDITION_LIMITS[tier])) {
    record.editionData ||= {};
    const data = record.editionData[tier] ||= { soldBySize: {}, printedBySize: {} };
    validateEditionCounts(tier, data.soldBySize);
    validateEditionCounts(tier, data.printedBySize);
    if (Number(data.sold) > 0) throw new Error('Review existing paper sales before changing edition policy.');
    data.artistProofsBySize = getArtistProofs(tier, record.excludeSizes, data.artistProofsBySize);
    paperSizes += Object.keys(data.artistProofsBySize).length;
  }
}
for (const record of Object.values(state)) {
  if (!PAPER_EDITION_LIMITS[record.series]) continue;
  validateEditionCounts(record.series, record.soldBySize);
  validateEditionCounts(record.series, record.printedBySize);
  if (Number(record.sold) > 0) throw new Error('Review legacy paper sales before changing edition policy.');
  delete record.editionLimit;
  record.editionLimitsBySize = PAPER_EDITION_LIMITS[record.series];
  // The registry is authoritative for paper APs. Do not maintain a second pool.
  delete record.artistProofsBySize;
}
for (const item of engrained.filter(item => /^i-[A-Za-z0-9]+$/.test(item.id) && item.id !== 'i-k4studios')) {
  const key = `${item.id}:engrained`;
  state[key] ||= { imageId: item.id, series: 'engrained', editionLimit: Number(item.editionSize) || ENGRAINED_EDITION_LIMIT, printed: Number(item.inventory?.printed) || 0, sold: Number(item.inventory?.sold) || 0 };
  state[key].artistProof = artistProofState(state[key].artistProof);
  woodProofs++;
}
if (process.argv.includes('--write')) {
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}
console.log(JSON.stringify({ mode: process.argv.includes('--write') ? 'written' : 'dry-run', paperSizeProofs: paperSizes, engrainedProofs: woodProofs }));
