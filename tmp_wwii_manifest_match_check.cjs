const fs = require('fs');
const path = require('path');

const dist = 'dist';
const manifest = JSON.parse(fs.readFileSync('public/image-manifest.json', 'utf8'));

function parseLocs(xml) {
  const out = [];
  const re = /<loc>([\s\S]*?)<\/loc>/gi;
  let m;
  while ((m = re.exec(xml))) out.push(m[1].trim());
  return out;
}

function visit(file, seen, set) {
  const p = path.resolve(file);
  if (seen.has(p) || !fs.existsSync(p)) return;
  seen.add(p);

  const xml = fs.readFileSync(p, 'utf8');
  const locs = parseLocs(xml);

  if (/<sitemapindex[\s>]/i.test(xml)) {
    for (const loc of locs) {
      const u = new URL(loc);
      visit(path.join(dist, u.pathname.replace(/^\/+/, '')), seen, set);
    }
    return;
  }

  for (const loc of locs) set.add(loc);
}

function expectedPathFromManifest(id) {
  const rec = manifest[id];
  if (!rec) return null;
  const src = rec.src || rec.xl || rec.l || rec.m || rec.s;
  if (!src) return null;
  try {
    const u = new URL(src);
    const parts = u.pathname.split('/').filter(Boolean);
    const idx = parts.findIndex((p) => p.toLowerCase() === id.toLowerCase());
    if (idx < 0) return null;
    return '/' + parts.slice(0, idx + 1).join('/');
  } catch {
    return null;
  }
}

const entry = fs.existsSync(path.join(dist, 'sitemap-index.xml'))
  ? path.join(dist, 'sitemap-index.xml')
  : path.join(dist, 'sitemap.xml');

const all = new Set();
visit(entry, new Set(), all);

const wwii = [...all]
  .map((u) => new URL(u))
  .filter((u) => u.pathname.includes('/Facing-History/WWII/') && /\/i-[A-Za-z0-9_-]+$/.test(u.pathname));

let exact = 0;
let mismatch = 0;
let missing = 0;
const agg = new Map();
const samples = [];

for (const u of wwii) {
  const p = u.pathname;
  const id = p.split('/').pop();
  const expected = expectedPathFromManifest(id);
  const gallery = p.replace(/\/i-[A-Za-z0-9_-]+$/, '');

  if (!agg.has(gallery)) {
    agg.set(gallery, { total: 0, exact: 0, mismatch: 0, missing: 0 });
  }

  const a = agg.get(gallery);
  a.total += 1;

  if (!expected) {
    missing += 1;
    a.missing += 1;
    if (samples.length < 12) {
      samples.push({ id, sitemap: p, manifest: '(none)', status: 'MISSING_MANIFEST_PATH' });
    }
  } else if (expected === p) {
    exact += 1;
    a.exact += 1;
  } else {
    mismatch += 1;
    a.mismatch += 1;
    if (samples.length < 12) {
      samples.push({ id, sitemap: p, manifest: expected, status: 'MISMATCH' });
    }
  }
}

console.log('WWII_TOTAL', wwii.length);
console.log('WWII_EXACT', exact);
console.log('WWII_MISMATCH', mismatch);
console.log('WWII_MISSING_MANIFEST_PATH', missing);
console.log('WWII_EXACT_RATE', ((exact / wwii.length) * 100).toFixed(2) + '%');

console.log('BY_GALLERY');
for (const [gallery, s] of agg.entries()) {
  const rate = ((s.exact / s.total) * 100).toFixed(2) + '%';
  console.log(`${gallery} | total=${s.total} exact=${s.exact} mismatch=${s.mismatch} missing=${s.missing} exactRate=${rate}`);
}

console.log('SAMPLE_DIFFS');
for (const row of samples) {
  console.log(`${row.status} | ${row.id} | sitemap=${row.sitemap} | manifest=${row.manifest}`);
}
