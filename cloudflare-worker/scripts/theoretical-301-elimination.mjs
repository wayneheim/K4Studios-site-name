import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const workerDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(workerDir, '..');

const DEFAULT_TODAY_301_FILE = path.join(workerDir, '.tmp_today_301.utf8.json');
const DEFAULT_IMAGE_ID_MAP_FILE = path.join(repoRoot, 'public', 'imageIdMap.json');

function stripUtf8Bom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

async function readJsonFile(filePath) {
  const buf = await fs.readFile(filePath);
  const text = stripUtf8Bom(buf.toString('utf8'));
  return JSON.parse(text);
}

function normalizePathname(p) {
  if (!p) return '/';
  // Treat trailing slashes as non-canonical for analysis; match ingress behavior.
  if (p.length > 1) return p.replace(/\/+$/g, '');
  return p;
}

function extractImageIdFromEnd(pathname) {
  const m = String(pathname || '').match(/\/(i-[a-zA-Z0-9-]+)$/);
  return m ? m[1] : null;
}

function getParentGalleryPath(pathname, imageId) {
  if (!imageId) return null;
  const suffix = `/${imageId}`;
  if (!pathname.endsWith(suffix)) return null;
  const parent = pathname.slice(0, -suffix.length);
  return parent || '/';
}

function toPathArray(paths) {
  if (!paths) return null;
  return Array.isArray(paths) ? paths : [paths];
}

function hasCaseInsensitiveMatch(validPaths, requestedGalleryPath) {
  const requestedLower = String(requestedGalleryPath || '').toLowerCase();
  return validPaths.some(p => String(p || '').toLowerCase() === requestedLower);
}

function findMissingLeafProbe(validPaths, requestedGalleryPath) {
  // Mirrors the worker logic in handleImagePagePolicy.
  const requestedLower = String(requestedGalleryPath || '').toLowerCase();
  const requestedPrefixLower = `${requestedLower}/`;

  return validPaths.find(p => {
    const pl = String(p || '').toLowerCase();
    return pl.length > requestedLower.length && pl.startsWith(requestedPrefixLower);
  }) || null;
}

function sortByHitsDesc(a, b) {
  if (b.hits !== a.hits) return b.hits - a.hits;
  return String(a.path).localeCompare(String(b.path));
}

function buildKnownGallerySetFromImageIdMap(imageIdMap) {
  const set = new Set();
  if (!imageIdMap || typeof imageIdMap !== 'object') return set;
  for (const paths of Object.values(imageIdMap)) {
    const pathArray = toPathArray(paths) || [];
    for (const p of pathArray) {
      if (!p) continue;
      set.add(String(p).toLowerCase());
    }
  }
  return set;
}

async function main() {
  const today301File = process.argv[2] || DEFAULT_TODAY_301_FILE;
  const imageIdMapFile = process.argv[3] || DEFAULT_IMAGE_ID_MAP_FILE;

  const today = await readJsonFile(today301File);
  const imageIdMap = await readJsonFile(imageIdMapFile);
  const knownGalleries = buildKnownGallerySetFromImageIdMap(imageIdMap);

  const results = today?.[0]?.results;
  if (!Array.isArray(results)) {
    throw new Error(`Unexpected format in ${today301File}; expected wrangler --json output with [0].results[]`);
  }

  const shallowProbeRegex = /^\/(?:Galleries|galleries)\/[^/]+\/(i-[a-zA-Z0-9-]+)$/;

  const buckets = {
    shallow_probe_404: [],
    missing_leaf_probe_404: [],
    case_mismatch_301: [],
    wrong_path_301: [],
    unknown_imageid_301: [],
    non_image_path_301: []
  };

  let totalHits = 0;

  for (const row of results) {
    const rawPath = row?.path;
    const hits = Number(row?.hits || 0);
    totalHits += hits;

    const pathname = normalizePathname(rawPath);

    const shallow = pathname.match(shallowProbeRegex);
    if (shallow) {
      buckets.shallow_probe_404.push({ path: rawPath, normalized: pathname, hits, imageId: shallow[1] });
      continue;
    }

    const imageId = extractImageIdFromEnd(pathname);
    if (!imageId) {
      buckets.non_image_path_301.push({ path: rawPath, normalized: pathname, hits });
      continue;
    }

    const requestedGalleryPath = getParentGalleryPath(pathname, imageId);
    if (!requestedGalleryPath) {
      buckets.non_image_path_301.push({ path: rawPath, normalized: pathname, hits, imageId });
      continue;
    }

    const validPaths = toPathArray(imageIdMap?.[imageId]);
    if (!validPaths) {
      buckets.unknown_imageid_301.push({ path: rawPath, normalized: pathname, hits, imageId, requestedGalleryPath });
      continue;
    }

    const matchedCaseInsensitive = hasCaseInsensitiveMatch(validPaths, requestedGalleryPath);
    if (matchedCaseInsensitive) {
      // This is likely a casing-only canonicalization (still 301 under current policy).
      buckets.case_mismatch_301.push({
        path: rawPath,
        normalized: pathname,
        hits,
        imageId,
        requestedGalleryPath,
        canonical: validPaths.find(p => String(p || '').toLowerCase() === requestedGalleryPath.toLowerCase())
      });
      continue;
    }

    const missingLeafMatch = findMissingLeafProbe(validPaths, requestedGalleryPath);
    if (missingLeafMatch) {
      buckets.missing_leaf_probe_404.push({
        path: rawPath,
        normalized: pathname,
        hits,
        imageId,
        requestedGalleryPath,
        canonical: missingLeafMatch
      });
      continue;
    }

    buckets.wrong_path_301.push({
      path: rawPath,
      normalized: pathname,
      hits,
      imageId,
      requestedGalleryPath,
      canonical: validPaths[0],
      requestedGalleryIsKnown: knownGalleries.has(String(requestedGalleryPath || '').toLowerCase())
    });
  }

  for (const list of Object.values(buckets)) list.sort(sortByHitsDesc);

  const sumHits = (arr) => arr.reduce((acc, r) => acc + (r.hits || 0), 0);
  const totalUnique = results.length;

  const eliminatedHits = sumHits(buckets.shallow_probe_404) + sumHits(buckets.missing_leaf_probe_404);
  const eliminatedUnique = buckets.shallow_probe_404.length + buckets.missing_leaf_probe_404.length;

  const wrongPathKnownHits = sumHits(buckets.wrong_path_301.filter(r => r.requestedGalleryIsKnown));
  const wrongPathUnknownHits = sumHits(buckets.wrong_path_301.filter(r => !r.requestedGalleryIsKnown));

  const pct = (n) => (totalHits ? (100 * n / totalHits).toFixed(1) : '0.0');

  const lines = [];
  lines.push(`Input: ${path.relative(repoRoot, today301File)} (unique paths=${totalUnique}, total events=${totalHits})`);
  lines.push(`ImageIdMap: ${path.relative(repoRoot, imageIdMapFile)} (keys=${Object.keys(imageIdMap || {}).length})`);
  lines.push('');
  lines.push('Theoretical outcome if new probe rules were active:');
  lines.push(`- Would become cacheable 404 (eliminated 301s): ${eliminatedHits}/${totalHits} events (${pct(eliminatedHits)}%), ${eliminatedUnique}/${totalUnique} unique paths`);
  lines.push(`  - Shallow /Galleries/<slug>/i-... probes: ${sumHits(buckets.shallow_probe_404)} events (${pct(sumHits(buckets.shallow_probe_404))}%), ${buckets.shallow_probe_404.length} paths`);
  lines.push(`  - Missing-leaf strict-prefix probes: ${sumHits(buckets.missing_leaf_probe_404)} events (${pct(sumHits(buckets.missing_leaf_probe_404))}%), ${buckets.missing_leaf_probe_404.length} paths`);
  lines.push(`- Would still be 301s: ${totalHits - eliminatedHits}/${totalHits} events (${pct(totalHits - eliminatedHits)}%)`);
  lines.push(`  - Wrong-path canonicalizations (not missing-leaf): ${sumHits(buckets.wrong_path_301)} events (${pct(sumHits(buckets.wrong_path_301))}%), ${buckets.wrong_path_301.length} paths`);
  lines.push(`    - Requested gallery is known (exists in imageIdMap somewhere): ${wrongPathKnownHits} events (${pct(wrongPathKnownHits)}%)`);
  lines.push(`    - Requested gallery is unknown (not in imageIdMap): ${wrongPathUnknownHits} events (${pct(wrongPathUnknownHits)}%)`);
  lines.push(`  - Case-only canonicalizations: ${sumHits(buckets.case_mismatch_301)} events (${pct(sumHits(buckets.case_mismatch_301))}%), ${buckets.case_mismatch_301.length} paths`);
  lines.push(`  - Unknown imageId (not in imageIdMap): ${sumHits(buckets.unknown_imageid_301)} events (${pct(sumHits(buckets.unknown_imageid_301))}%), ${buckets.unknown_imageid_301.length} paths`);
  lines.push(`  - Other/unexpected: ${sumHits(buckets.non_image_path_301)} events (${pct(sumHits(buckets.non_image_path_301))}%), ${buckets.non_image_path_301.length} paths`);

  function addTopExamples(label, arr, take = 8) {
    if (!arr.length) return;
    lines.push('');
    lines.push(`${label} (top ${Math.min(take, arr.length)}):`);
    for (const r of arr.slice(0, take)) {
      const canon = r.canonical ? ` -> ${r.canonical}` : '';
      lines.push(`- ${r.hits}x ${r.path}${canon}`);
    }
  }

  addTopExamples('Would become 404: shallow probes', buckets.shallow_probe_404);
  addTopExamples('Would become 404: missing-leaf probes', buckets.missing_leaf_probe_404);
  addTopExamples('Would still 301: wrong-path canonicalizations', buckets.wrong_path_301);

  process.stdout.write(lines.join('\n') + '\n');
}

await main();
