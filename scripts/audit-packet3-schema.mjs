import fs from 'node:fs';
import assert from 'node:assert/strict';
import { parse } from 'parse5';
import pathModule from 'node:path';
import { pathToFileURL } from 'node:url';
const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const capture = args.includes('--capture');
const origin = option('--origin', 'https://www.k4studios.com');
const dist = option('--dist', null);
let handler;
async function getResponse(path) {
  if (!dist) return fetch(origin + path, { redirect: 'manual', signal: AbortSignal.timeout(60000) });
  const file = pathModule.join(dist, path.replace(/^\//, ''), 'index.html');
  if (fs.existsSync(file)) return new Response(fs.readFileSync(file), { status: 200 });
  handler ||= (await import(pathToFileURL(pathModule.resolve('.netlify/v1/functions/ssr/ssr.mjs')).href)).default;
  return handler(new Request('https://www.k4studios.com' + path), { ip: '127.0.0.1' });
}
const targets = JSON.parse(fs.readFileSync('src/data/seo/schemaDescriptionSyncPages.json'));
const baseline = capture ? null : JSON.parse(fs.readFileSync('tmp/packet3-production-baseline.json'));
const paths = capture ? [...fs.readFileSync('public/sitemap.xml', 'utf8').matchAll(/<loc>(.*?)<\/loc>/g)].map(m => new URL(m[1]).pathname) : baseline.pages.map(row => row.path);
assert.equal(paths.length, 252);
const pageTypes = new Set(['WebPage', 'CollectionPage', 'ProfilePage', 'Article', 'BlogPosting', 'ImageGallery', 'AboutPage']);
const attr = (n, key) => n.attrs?.find(a => a.name === key)?.value;
function nodes(n) { return [n, ...(n.childNodes || []).flatMap(nodes)]; }
function inspect(html, pathname) {
  const all = nodes(parse(html, { sourceCodeLocationInfo: true }));
  const head = all.filter(n => n.tagName === 'meta' && ['description', 'og:description', 'twitter:description'].includes(attr(n, 'name') || attr(n, 'property')));
  const rawHead = head.map(n => html.slice(n.sourceCodeLocation.startOffset, n.sourceCodeLocation.endOffset));
  const descriptions = head.map(n => attr(n, 'content'));
  const invalidSchemas = [];
  const schemas = all.filter(n => n.tagName === 'script' && attr(n, 'type') === 'application/ld+json').flatMap(n => {
    const raw = n.childNodes.map(c => c.value || '').join('');
    try { return [JSON.parse(raw)]; } catch { invalidSchemas.push(raw); return []; }
  });
  const schemaDescriptions = [];
  function walk(n, key = '') {
    if (Array.isArray(n)) return n.forEach((v, i) => walk(v, `${key}/${i}`));
    if (!n || typeof n !== 'object') return;
    let ownPage = true;
    const identifier = typeof n.url === 'string' ? n.url : n['@id'];
    if (typeof identifier === 'string') {
      try { ownPage = (new URL(identifier, `https://www.k4studios.com${pathname}`).pathname.replace(/\/+$/, '') || '/') === (pathname.replace(/\/+$/, '') || '/'); } catch { ownPage = false; }
    }
    if (typeof n.description === 'string') schemaDescriptions.push({ key, type: n['@type'], description: n.description, pageLevel: ownPage && [n['@type']].flat().some(t => pageTypes.has(t)), media: [n['@type']].flat().some(t => ['ImageObject', 'VisualArtwork', 'Product'].includes(t)) });
    Object.entries(n).forEach(([k, v]) => { if (v && typeof v === 'object') walk(v, `${key}/${k}`); });
  }
  schemas.forEach((n, i) => walk(n, String(i)));
  return { rawHead, descriptions, schemaDescriptions, invalidSchemas, title: all.filter(n => n.tagName === 'title').map(n => n.childNodes.map(c => c.value || '').join('')), bytes: html.length };
}
const result = { origin, pages: [], failures: [] };
for (const path of paths) {
  try {
    const response = await getResponse(path);
    assert.equal(response.status, 200, `${path}: HTTP ${response.status}`);
    const fields = inspect(await response.text(), path);
    const equal = (a, b, label) => assert.ok(JSON.stringify(a) === JSON.stringify(b), `${path}: ${label}`);
    if (Object.hasOwn(targets, path)) {
      assert.equal(fields.descriptions.length, 3, `${path}: head layer count`);
      for (const value of fields.descriptions) assert.equal(value, fields.descriptions[0], `${path}: head disagreement`);
      assert.equal(fields.descriptions[0].length, targets[path], `${path}: head length differs from packet`);
      assert.ok(fields.schemaDescriptions.some(n => n.pageLevel), `${path}: missing page schema`);
    }
    if (!capture) {
      const old = baseline.pages.find(row => row.path === path).fields;
      equal(fields.rawHead, old.rawHead, 'head description bytes changed');
      equal(fields.title, old.title, 'title changed');
      equal(fields.invalidSchemas, old.invalidSchemas, 'existing invalid JSON-LD changed');
      if (Object.hasOwn(targets, path)) {
        for (const n of fields.schemaDescriptions.filter(n => n.pageLevel)) assert.equal(n.description, fields.descriptions[0], `${path}: ${n.type} ${n.key} schema mismatch`);
        equal(fields.schemaDescriptions.filter(n => !n.pageLevel && !n.media), old.schemaDescriptions.filter(n => !n.pageLevel && !n.media), 'non-page schema descriptions changed');
      } else {
        // Existing section-image samples rotate; compare page-level descriptions, while
        // media descriptions remain untouched by the strictly allowlisted implementation.
        equal(fields.schemaDescriptions.filter(n => !n.media), old.schemaDescriptions.filter(n => !n.media), 'control schema descriptions changed');
      }
    }
    result.pages.push({ path, status: response.status, fields });
  } catch (error) { result.failures.push(error.message.split('\n')[0]); }
}
const output = option('--output', capture ? 'tmp/packet3-production-baseline.json' : 'tmp/packet3-preview-audit.json');
fs.writeFileSync(output, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ origin, pages: result.pages.length, targets: Object.keys(targets).length, failures: result.failures }, null, 2));
if (result.failures.length) process.exitCode = 1;
