import * as color from './src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color.mjs';
import * as bw from './src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White.mjs';
import * as na from './src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/NA-Color.mjs';

const sets = [
  ['Color', color.galleryData],
  ['Black-White', bw.galleryData],
  ['NA-Color', na.galleryData],
];

const genericAlt = /^(welcome||copyright|image|photo|placeholder)/i;
const genericKw = new Set(['a','fine art','photography','archival','historical','western','portrait','cowboy','wayne heim']);

function avg(arr) {
  return arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0;
}

const out = {};

for (const [name, data] of sets) {
  const rows = data.filter((x) => x.visibility !== 'ghost' && x.id !== 'i-k4studios');
  const total = rows.length;

  const descLen = rows.map((r) => String(r.description || '').trim().length);
  const altLen = rows.map((r) => String(r.alt || '').trim().length);
  const notesLen = rows.map((r) => String(r.notes || '').trim().length);
  const kwCounts = rows.map((r) => (Array.isArray(r.keywords) ? r.keywords.length : 0));

  const missingDesc = rows.filter((r) => !String(r.description || '').trim()).length;
  const missingAlt = rows.filter((r) => !String(r.alt || '').trim()).length;
  const genericAltCount = rows.filter((r) => {
    const alt = String(r.alt || '').trim();
    return genericAlt.test(alt) || alt.toLowerCase().includes('wayne heim');
  }).length;
  const missingNotes = rows.filter((r) => !String(r.notes || '').trim()).length;

  const longDesc = rows.filter((r) => String(r.description || '').length > 320).length;
  const veryLongDesc = rows.filter((r) => String(r.description || '').length > 500).length;

  const shortAlt = rows.filter((r) => String(r.alt || '').trim().length < 40).length;
  const longAlt = rows.filter((r) => String(r.alt || '').trim().length > 150).length;

  const kwOver25 = rows.filter((r) => (Array.isArray(r.keywords) ? r.keywords.length : 0) > 25).length;
  const kwOver35 = rows.filter((r) => (Array.isArray(r.keywords) ? r.keywords.length : 0) > 35).length;

  const dupKeywords = rows.filter((r) => {
    const kws = (r.keywords || []).map((k) => String(k).trim().toLowerCase());
    return new Set(kws).size !== kws.length;
  }).length;

  const genericHeavy = rows.filter((r) => {
    const kws = (r.keywords || []).map((k) => String(k).trim().toLowerCase());
    if (!kws.length) return false;
    const hits = kws.filter((k) => genericKw.has(k)).length;
    return hits >= 4;
  }).length;

  const descStarts = rows.map((r) => String(r.description || '').trim().slice(0, 60));
  const startFreq = {};
  for (const s of descStarts) {
    if (!s) continue;
    startFreq[s] = (startFreq[s] || 0) + 1;
  }
  const repeatedStarts = Object.entries(startFreq).filter(([, c]) => c >= 3).length;

  out[name] = {
    total,
    missingDesc,
    missingAlt,
    genericAltCount,
    missingNotes,
    longDesc,
    veryLongDesc,
    shortAlt,
    longAlt,
    kwAvg: avg(kwCounts),
    kwMax: Math.max(...kwCounts, 0),
    kwOver25,
    kwOver35,
    dupKeywords,
    genericHeavy,
    descAvg: avg(descLen),
    altAvg: avg(altLen),
    notesAvg: avg(notesLen),
    repeatedStarts,
  };
}

console.log(JSON.stringify(out, null, 2));
