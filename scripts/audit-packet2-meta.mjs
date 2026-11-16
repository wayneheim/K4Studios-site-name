import fs from 'node:fs';
import assert from 'node:assert/strict';
import { parse } from 'parse5';
const args = process.argv.slice(2);
const option = (key, fallback) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
const capture = args.includes('--capture');
const origin = option('--origin', 'https://www.k4studios.com');
const output = option('--output', capture ? 'tmp/packet2-production-baseline.json' : 'tmp/packet2-preview-audit.json');
const targets = JSON.parse(fs.readFileSync('src/data/seo/fullDescriptionAllPages.json', 'utf8'));
const oldPacket = JSON.parse(fs.readFileSync('tmp/gallery-landing-production-baseline.json', 'utf8'));
const allPaths = [...new Set([...oldPacket.controls.filter(r => r.path.endsWith('/all')).map(r => r.path), '/Other/K4-Select-Series/Engrained/Engrained-Series/all'])];
assert.equal(allPaths.length, 54);
const controls = [...new Set([...oldPacket.landings.map(r => r.path), ...oldPacket.controls.filter(r => !r.path.endsWith('/all')).map(r => r.path), '/Blog/what-is-painterly-photography'])];
const baseline = capture ? null : JSON.parse(fs.readFileSync('tmp/packet2-production-baseline.json', 'utf8'));
const attr = (node, key) => node.attrs?.find(a => a.name === key)?.value;
function all(node) { return [node, ...(node.childNodes || []).flatMap(all)]; }
function inspect(html) {
  const nodes = all(parse(html, { sourceCodeLocationInfo: true }));
  const meta = key => nodes.filter(n => n.tagName === 'meta' && (attr(n, 'name') === key || attr(n, 'property') === key)).map(n => attr(n, 'content'));
  const schemas = nodes.filter(n => n.tagName === 'script' && attr(n, 'type') === 'application/ld+json').flatMap(n => { const j = JSON.parse(n.childNodes[0].value); return j['@graph'] || [j]; });
  const rawMeta = nodes.filter(n => n.tagName === 'meta' && attr(n, 'name') === 'description').map(n => html.slice(n.sourceCodeLocation.startOffset, n.sourceCodeLocation.endOffset));
  return { title: nodes.filter(n => n.tagName === 'title').map(n => n.childNodes.map(c => c.value || '').join('')), meta: meta('description'), rawMeta, og: meta('og:description'), twitter: meta('twitter:description'), schema: schemas.filter(n => [n['@type']].flat().includes('CollectionPage')).map(n => n.description) };
}
const results = { origin, capturedAt: new Date().toISOString(), allPages: [], controls: [], failures: [] };
for (const route of [...allPaths, ...controls]) {
  try {
    const response = await fetch(origin + route, { redirect: 'manual', signal: AbortSignal.timeout(60000) });
    assert.equal(response.status, 200, `${route}: HTTP ${response.status}`);
    const fields = inspect(await response.text());
    const isAll = allPaths.includes(route);
    const old = capture ? null : [...baseline.allPages, ...baseline.controls].find(r => r.path === route).fields;
    const equal = (a, b, label) => assert.ok(JSON.stringify(a) === JSON.stringify(b), `${route}: ${label}`);
    if (Object.hasOwn(targets, route)) {
      assert.equal(fields.schema.length, 1, `${route}: CollectionPage count`);
      assert.equal(fields.schema[0].length, targets[route], `${route}: full length differs from packet`);
      for (const key of ['og', 'twitter']) equal(fields[key], fields.schema, `${key}/schema mismatch`);
      if (!capture) {
        equal(fields.meta, fields.schema, 'meta/schema mismatch');
        for (const key of ['title', 'og', 'twitter', 'schema']) equal(fields[key], old[key], `changed ${key}`);
      }
    } else if (!capture) {
      for (const key of ['title', 'meta', 'rawMeta', 'og', 'twitter', 'schema']) equal(fields[key], old[key], `control changed ${key}`);
    }
    (isAll ? results.allPages : results.controls).push({ path: route, status: response.status, fields });
  } catch (error) { results.failures.push(error.message.split('\n')[0]); }
}
fs.writeFileSync(output, JSON.stringify(results, null, 2));
console.log(JSON.stringify({ origin, allPages: results.allPages.length, controls: results.controls.length, targets: Object.keys(targets).length, failures: results.failures }, null, 2));
if (results.failures.length) process.exitCode = 1;
