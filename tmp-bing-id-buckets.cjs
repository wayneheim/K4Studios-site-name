const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(command) {
  return execSync(command, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 50 });
}

function safeJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

function toPercent(count, total) {
  if (!total) return 0;
  return Math.round((count / total) * 10000) / 100;
}

function gitSawId(id) {
  const files = [
    'src/data/imageIdMap.json',
    'public/imageIdMap.json',
    'netlify/functions/imageIdMap.json',
    'public/image-manifest.json'
  ];
  const cmd = `git log --all -n 1 -S\"${id}\" --format=%H -- ${files.join(' ')}`;
  const out = run(cmd).trim();
  return out.length > 0;
}

function getBing404Ids(limit = 100, days = 180) {
  const sql = [
    "WITH rows AS (",
    "  SELECT",
    "    substr(target_id, instr(target_id, '/i-') + 1) AS image_id,",
    "    target_id,",
    "    ts",
    "  FROM raw_events",
    `  WHERE ts >= datetime('now','-${days} days')`,
    "    AND lower(ua) LIKE '%bingbot%'",
    "    AND event_type = '404'",
    "    AND target_id LIKE '%/i-%'",
    ")",
    "SELECT image_id, MAX(ts) AS last_seen, MIN(target_id) AS sample_url, COUNT(*) AS hit_count",
    "FROM rows",
    "GROUP BY image_id",
    "ORDER BY last_seen DESC",
    `LIMIT ${limit}`
  ].join(' ');

  const cmd = `npx wrangler d1 execute k4-analytics --remote --config cloudflare-worker/wrangler.analytics.noroutes.toml --json --command \"${sql}\"`;
  const output = run(cmd);
  const parsed = JSON.parse(output);
  return parsed?.[0]?.results || [];
}

(function main() {
  const rows = getBing404Ids(100, 180);
  const imageIdMap = safeJson(path.join(process.cwd(), 'public', 'imageIdMap.json'));
  const manifest = safeJson(path.join(process.cwd(), 'public', 'image-manifest.json'));

  const currentMapIds = new Set(Object.keys(imageIdMap || {}));
  const currentManifestIds = new Set(Object.keys(manifest || {}));

  const details = [];
  let bucketA = 0;
  let bucketB = 0;
  let bucketC = 0;

  for (const row of rows) {
    const id = row.image_id;
    const inMap = currentMapIds.has(id);
    const inManifest = currentManifestIds.has(id);
    const currentlyValid = inMap || inManifest;

    let bucket = 'C';
    let historical = false;

    if (currentlyValid) {
      bucket = 'C';
      bucketC += 1;
    } else {
      historical = gitSawId(id);
      if (historical) {
        bucket = 'B';
        bucketB += 1;
      } else {
        bucket = 'A';
        bucketA += 1;
      }
    }

    details.push({
      image_id: id,
      last_seen: row.last_seen,
      hit_count: row.hit_count,
      sample_url: row.sample_url,
      in_current_imageIdMap: inMap,
      in_current_manifest: inManifest,
      historical_in_git: historical,
      bucket
    });
  }

  const total = details.length;
  const summary = {
    sample_size: total,
    bucket_A_never_existed: { count: bucketA, pct: toPercent(bucketA, total) },
    bucket_B_previously_existed_removed: { count: bucketB, pct: toPercent(bucketB, total) },
    bucket_C_currently_valid_misclassified: { count: bucketC, pct: toPercent(bucketC, total) }
  };

  const output = {
    generated_at: new Date().toISOString(),
    summary,
    details
  };

  const outFile = path.join(process.cwd(), 'bing-404-id-buckets.json');
  fs.writeFileSync(outFile, JSON.stringify(output, null, 2));

  console.log('SUMMARY', JSON.stringify(summary));
  console.log('OUTPUT_FILE', outFile);

  const sampleByBucket = {
    A: details.filter((d) => d.bucket === 'A').slice(0, 8),
    B: details.filter((d) => d.bucket === 'B').slice(0, 8),
    C: details.filter((d) => d.bucket === 'C').slice(0, 8)
  };
  console.log('SAMPLES', JSON.stringify(sampleByBucket, null, 2));
})();
