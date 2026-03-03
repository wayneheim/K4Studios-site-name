const { execSync } = require('child_process');

async function main() {
  const cmd = `npx wrangler d1 execute k4-analytics --remote --config cloudflare-worker/wrangler.analytics.noroutes.toml --json --command "SELECT DISTINCT substr(target_id, instr(target_id, '/i-') + 1) AS image_id, target_id FROM raw_events WHERE ts >= datetime('now','-30 days') AND lower(ua) LIKE '%bingbot%' AND event_type='404' AND target_id LIKE '%/i-%' LIMIT 800;"`;
  const out = execSync(cmd, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 40 });
  const rows = JSON.parse(out)?.[0]?.results || [];

  const [imageMap, manifest] = await Promise.all([
    (await fetch('https://www.k4studios.com/imageIdMap.json')).json(),
    (await fetch('https://k4studios.com/image-manifest.json?v=20260223-699cdba7')).json()
  ]);

  const mapIds = new Set(Object.keys(imageMap || {}));
  const manifestIds = new Set(Object.keys(manifest || {}));

  const mapHit = rows.find((row) => mapIds.has(row.image_id));
  const manifestHit = rows.find((row) => manifestIds.has(row.image_id));

  const result = {
    sampleSize: rows.length,
    imageMapMatch: mapHit ? {
      image_id: mapHit.image_id,
      target_id: mapHit.target_id,
      canonical_path: Array.isArray(imageMap[mapHit.image_id]) ? imageMap[mapHit.image_id][0] : imageMap[mapHit.image_id]
    } : null,
    manifestMatch: manifestHit ? {
      image_id: manifestHit.image_id,
      target_id: manifestHit.target_id,
      manifest_src: manifest[manifestHit.image_id]?.src || null
    } : null
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
