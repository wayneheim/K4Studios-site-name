/**
 * Check which SmugMug URLs in the Cowboy Color gallery are broken (404).
 * Tests the "s" (small) size URL for each image via the proxy.
 */
const fs = require('fs');
const manifest = require('./public/image-manifest.json');

const content = fs.readFileSync(
  'src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color.mjs',
  'utf8'
);

const re = /"id":\s*"(i-[a-zA-Z0-9]+)"/g;
const ids = [];
let match;
while ((match = re.exec(content)) !== null) {
  if (match[1] !== 'i-k4studios') ids.push(match[1]);
}

console.log(`Testing ${ids.length} image IDs against live proxy...`);

const CONCURRENCY = 20;
const PROXY_BASE = 'https://www.k4studios.com/img';

async function checkId(id) {
  try {
    const res = await fetch(`${PROXY_BASE}/${id}/s`, { method: 'HEAD', redirect: 'follow' });
    return { id, status: res.status };
  } catch (e) {
    return { id, status: 'ERR', error: e.message };
  }
}

async function main() {
  const broken = [];
  const working = [];

  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    const batch = ids.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(checkId));
    for (const r of results) {
      if (r.status === 200) {
        working.push(r.id);
      } else {
        broken.push(r);
      }
    }
    process.stdout.write(`\rChecked ${Math.min(i + CONCURRENCY, ids.length)}/${ids.length}...`);
  }

  console.log('\n');
  console.log(`Working: ${working.length}`);
  console.log(`Broken: ${broken.length}`);
  
  if (broken.length > 0) {
    console.log('\nBroken IDs:');
    for (const b of broken) {
      console.log(`  ${b.id} => ${b.status}`);
    }
  }

  // Write broken IDs to file for further processing
  if (broken.length > 0) {
    fs.writeFileSync('tmp-broken-cowboy-color-ids.json', JSON.stringify(broken.map(b => b.id), null, 2));
    console.log(`\nWrote ${broken.length} broken IDs to tmp-broken-cowboy-color-ids.json`);
  }
}

main();
