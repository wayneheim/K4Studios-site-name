// Generates src/data/sitemapMatches.ts by pairing URLs from src/data/galleryMaps/MasterGalleryData.mjs
// Pairing preference:
// 1) Pair Color with Black-White within the same gallery
// 2) Pair remaining pages within the same section
// 3) Pair any remaining globally
// Deterministic using a seed (MATCH_SEED env var or default). If odd count, last URL is left unmatched.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = '../src/data/galleryMaps/MasterGalleryData.mjs';
const OUT_DIR = path.resolve(__dirname, '..', 'src', 'data');
const OUT_FILE = path.join(OUT_DIR, 'sitemapMatches.ts');

// xmur3 string hash to seed PRNG
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

// mulberry32 PRNG
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededRngFromString(seedStr) {
  const seedGen = xmur3(seedStr);
  const seed = seedGen();
  return mulberry32(seed);
}

function shuffleInPlace(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function stableId(a, b) {
  const s = [a, b].sort().join('|');
  const seed = xmur3(s)();
  return 'M' + seed.toString(16).padStart(8, '0');
}

async function main() {
  const seed = process.env.MATCH_SEED || 'K4-Studios';
  const { galleryDataMap } = await import(DATA_FILE);

  // Extract URLs from galleryDataMap
  const urls = [];
  for (const [galleryPath, images] of Object.entries(galleryDataMap)) {
    for (const image of images) {
      const url = `https://www.k4studios.com${galleryPath}/${image.id}`;
      urls.push(url);
    }
  }

  // Ensure uniqueness
  const uniqueUrls = Array.from(new Set(urls));

  // Build metadata for pairing rules
  const items = uniqueUrls.map(u => {
    const { pathname } = new URL(u);
    const segs = pathname.replace(/\/+$/, '').split('/').filter(Boolean);
    const last = segs[segs.length - 1]?.toLowerCase();
    const isColor = last === 'color' || last === 'colour';
    const isBW = last === 'black-white' || last === 'black-and-white' || last === 'bw' || last === 'blackwhite';
    const isVariant = isColor || isBW;
    const gallerySegs = isVariant ? segs.slice(0, -1) : segs;
    // Section logic: for /Galleries/... choose parent of gallery as section
    let sectionKey = null;
    if (segs[0]?.toLowerCase() === 'galleries') {
      if (gallerySegs.length >= 3) {
        // /Galleries/{section...}/{gallery}
        sectionKey = '/' + gallerySegs.slice(0, -1).join('/');
      } else if (gallerySegs.length >= 2) {
        // /Galleries/{section}
        sectionKey = '/' + gallerySegs.slice(0, -1).join('/');
      } else {
        sectionKey = '/Galleries';
      }
    }
    const galleryKey = '/' + gallerySegs.join('/');
    return {
      url: u,
      segs,
      isColor,
      isBW,
      isVariant,
      galleryKey,
      sectionKey,
    };
  });

  const paired = new Set();
  let pairs = [];

  // 1) Pair Color with Black-White in the same gallery
  const byGallery = new Map();
  for (const it of items) {
    if (!byGallery.has(it.galleryKey)) byGallery.set(it.galleryKey, []);
    byGallery.get(it.galleryKey).push(it);
  }
  for (const list of byGallery.values()) {
    const colors = list.filter(x => x.isColor && !paired.has(x.url));
    const bws = list.filter(x => x.isBW && !paired.has(x.url));
    const n = Math.min(colors.length, bws.length);
    // Deterministic order per gallery
    const rng = seededRngFromString(seed + '|gallery|' + list[0].galleryKey);
    shuffleInPlace(colors, rng);
    shuffleInPlace(bws, rng);
    for (let i = 0; i < n; i++) {
      const a = colors[i].url;
      const b = bws[i].url;
      pairs.push({ matchId: stableId(a, b), a, b });
      paired.add(a); paired.add(b);
    }
  }

  // 2) Pair remaining within the same section
  const bySection = new Map();
  for (const it of items) {
    if (paired.has(it.url)) continue;
    const key = it.sectionKey || '__no_section__';
    if (!bySection.has(key)) bySection.set(key, []);
    bySection.get(key).push(it);
  }
  for (const [key, list] of bySection.entries()) {
    // Skip singleton lists, handled in global
    const remaining = list.filter(x => !paired.has(x.url));
    if (remaining.length < 2) continue;
    const rng = seededRngFromString(seed + '|section|' + key);
    const arr = remaining.map(x => x.url);
    shuffleInPlace(arr, rng);
    for (let i = 0; i + 1 < arr.length; i += 2) {
      const a = arr[i];
      const b = arr[i + 1];
      if (paired.has(a) || paired.has(b)) continue;
      pairs.push({ matchId: stableId(a, b), a, b });
      paired.add(a); paired.add(b);
    }
  }

  // 3) Pair any remaining globally
  const remainingGlobal = items.map(x => x.url).filter(u => !paired.has(u));
  const rngGlobal = seededRngFromString(seed + '|global');
  shuffleInPlace(remainingGlobal, rngGlobal);
  for (let i = 0; i + 1 < remainingGlobal.length; i += 2) {
    const a = remainingGlobal[i];
    const b = remainingGlobal[i + 1];
    pairs.push({ matchId: stableId(a, b), a, b });
    paired.add(a); paired.add(b);
  }
  const unmatched = remainingGlobal.length % 2 === 1 ? [remainingGlobal[remainingGlobal.length - 1]] : [];

  // Make it a cycle of all URLs for a tour
  const allUrls = [...new Set(pairs.flatMap(p => [p.a, p.b]))];
  shuffleInPlace(allUrls, seededRngFromString(seed + '|cycle'));
  const cyclePairs = [];
  for (let i = 0; i < allUrls.length; i++) {
    const a = allUrls[i];
    const b = allUrls[(i + 1) % allUrls.length];
    cyclePairs.push({ matchId: `C${i.toString().padStart(4, '0')}`, a, b });
  }
  pairs = cyclePairs;

  const timestamp = new Date().toISOString();
  const out = `// AUTO-GENERATED FILE. Do not edit manually.
// Generated by scripts/generate-sitemap-matches.mjs at ${timestamp}
// Seed: ${seed}

export type SitemapMatch = {
  matchId: string;
  a: string;
  b: string;
};

export const sitemapMatches: SitemapMatch[] = ${JSON.stringify(pairs, null, 2)} as const;

export const unmatchedUrls: string[] = ${JSON.stringify(unmatched, null, 2)} as const;
`;

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_FILE, out, 'utf8');
  console.log(`Wrote ${pairs.length} matches${unmatched.length ? `, ${unmatched.length} unmatched` : ''} to ${path.relative(path.resolve(__dirname, '..'), OUT_FILE)}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
