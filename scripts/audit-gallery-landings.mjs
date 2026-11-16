import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { parse } from 'parse5';

// Run --capture before editing, then audit the local server or the exact preview.
const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const origin = option('--origin', 'http://localhost:4321');
const dist = option('--dist', null);
let ssrHandler;
const baselineFile = option('--baseline', 'tmp/gallery-landing-baseline.json');
const output = option('--output', 'tmp/gallery-landing-audit.json');
const capture = args.includes('--capture');
const checkImages = args.includes('--check-images');
const preserveCowboyColorDescription = args.includes('--preserve-cowboy-color-description');
const cowboyColorPath = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color';
const files = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name).replaceAll('\\', '/')]);
const landingPaths = files('src/pages/Galleries').filter(file => file.endsWith('/index.astro'))
  .map(file => file.replace('src/pages', '').replace('/index.astro', '')).sort();
assert.equal(landingPaths.length, 54, 'Packet must cover exactly 54 landings');
const attr = (node, name) => node?.attrs?.find(a => a.name === name)?.value;
const all = (node, predicate) => [ ...(predicate(node) ? [node] : []),
  ...(node.childNodes || []).flatMap(child => all(child, predicate)) ];
const text = node => node.nodeName === '#text' ? node.value : (node.childNodes || []).map(text).join('');
const hasClass = (node, name) => (attr(node, 'class') || '').split(/\s+/).includes(name);
const typed = (node, type) => [node?.['@type']].flat().includes(type);

function inspect(html) {
  const doc = parse(html);
  const head = all(doc, n => n.tagName === 'head')[0];
  const meta = key => all(head, n => n.tagName === 'meta' && (attr(n, 'name') === key || attr(n, 'property') === key)).map(n => attr(n, 'content'));
  const schemas = all(doc, n => n.tagName === 'script' && attr(n, 'type') === 'application/ld+json')
    .flatMap(n => { const j = JSON.parse(text(n)); return j['@graph'] || [j]; });
  const collection = schemas.find(n => typed(n, 'CollectionPage'));
  const list = schemas.find(n => typed(n, 'ItemList') && n['@id']?.endsWith('#itemlist'));
  const intro = all(doc, n => attr(n, 'id') === 'intro-section')[0];
  const hero = intro && all(intro, n => n.tagName === 'a' && hasClass(n, 'mobile-sample-image'))[0];
  const thumbnails = all(doc, n => n.tagName === 'a' && hasClass(n, 'gallery-thumb'));
  const visible = [hero, ...thumbnails].filter(Boolean).map(n => ({
    url: new URL(attr(n, 'href'), 'https://www.k4studios.com').href,
    image: attr(all(n, c => c.tagName === 'img')[0], 'src') || attr(n, 'href'),
  })).filter((n, i, array) => array.findIndex(other => other.url === n.url) === i);
  const bodyText = all(doc, n => n.nodeName === '#text' && !['script', 'style'].includes(n.parentNode?.tagName))
    .map(n => n.value).join('').replace(/\s+/g, ' ').trim();
  return {
    title: text(all(head, n => n.tagName === 'title')[0]),
    meta: meta('description'), og: meta('og:description'), twitter: meta('twitter:description'),
    canonical: all(head, n => n.tagName === 'link' && attr(n, 'rel') === 'canonical').map(n => attr(n, 'href')),
    description: collection?.description, schemas, list, visible,
    intro: intro ? text(intro).replace(/\s+/g, ' ').trim() : null,
    bodyText,
    links: all(doc, n => n.tagName === 'a' && !hasClass(n, 'gallery-thumb') && !hasClass(n, 'kw-link')).map(n => attr(n, 'href')),
    hero: hero ? attr(nestedImage(hero), 'src') || attr(hero, 'href') : null,
  };
}
function nestedImage(node) { return all(node, n => n.tagName === 'img')[0]; }
function equal(actual, expected, message) {
  assert.ok(JSON.stringify(actual) === JSON.stringify(expected), message);
}
function stableSchema(value) {
  if (Array.isArray(value)) return value.map(stableSchema);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key,
    // Section pages already sample their featured images randomly per request.
    key === 'image' && Array.isArray(nested) ? '[existing random featured-image sample]' : stableSchema(nested)]));
}

const baseline = capture ? {} : JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
const imageIdMap = JSON.parse(fs.readFileSync('src/data/imageIdMap.json', 'utf8'));
const sectionPaths = files('src/pages/Galleries').filter(f => f.endsWith('.astro') && !f.includes('[') && !f.includes('/index.') && !/\/all[^/]*\.astro$/.test(f) && !f.includes('/_'))
  .map(f => f.replace('src/pages', '').replace('.astro', ''));
const controlPaths = capture ? [...new Set([
  ...landingPaths.filter(p => !p.endsWith('/Fine-Art-Photography/Transportation/Trains-Black-White')).map(p => `${p}/all`), ...sectionPaths,
  ...Object.keys(imageIdMap).filter(id => id !== 'i-k4studios')
    .reduce((samples, id) => {
      const data = imageIdMap[id];
      for (const p of [data].flat()) if (landingPaths.includes(p) && !samples.some(s => s.startsWith(`${p}/i-`))) samples.push(`${p}/${id}`);
      return samples;
    }, []),
  '/', '/Other/K4-Select-Series/Engrained/Engrained-Series', '/cowboy-art-prints',
])] : baseline.controls.map(row => row.path);

const results = { origin, capturedAt: new Date().toISOString(),
  comparisonNotes: ['Existing random section-schema image arrays and automatic kw-link destinations are excluded from cross-render equality. Authored links are compared as sets.'],
  landings: [], controls: [], images: [], exceptions: [], failures: [] };
async function fetchPage(route) {
  if (dist) {
    const file = path.join(dist, route.replace(/^\//, ''), 'index.html');
    if (fs.existsSync(file)) return inspect(fs.readFileSync(file, 'utf8'));
    ssrHandler ||= (await import(pathToFileURL(path.resolve('.netlify/v1/functions/ssr/ssr.mjs')).href)).default;
    const response = await ssrHandler(new Request(`https://www.k4studios.com${route}`), { ip: '127.0.0.1' });
    assert.equal(response.status, 200, `${route}: built SSR HTTP ${response.status}`);
    return inspect(await response.text());
  }
  const response = await fetch(`${origin}${route}`);
  assert.equal(response.status, 200, `${route}: HTTP ${response.status}`);
  return inspect(await response.text());
}
for (const route of landingPaths) {
  try {
    const page = await fetchPage(route);
    results.landings.push({ path: route, page });
    if (!capture) {
      const old = baseline.landings.find(row => row.path === route).page;
      for (const key of ['title', 'canonical', 'intro', 'bodyText', 'hero', 'description']) equal(page[key], old[key], `${route}: changed ${key}`);
      // The existing keyword linker varies repeated link placement per render.
      equal([...new Set(page.links)].sort(), [...new Set(old.links)].sort(), `${route}: changed link destinations`);
      for (const key of ['meta', 'og', 'twitter']) {
        const expected = preserveCowboyColorDescription && route === cowboyColorPath ? old[key] : [old.description];
        if (JSON.stringify(page[key]) !== JSON.stringify(expected)) results.failures.push(`${route}: ${key} differs from ${preserveCowboyColorDescription && route === cowboyColorPath ? 'preserved original tags' : 'complete source'}`);
      }
      if (preserveCowboyColorDescription && route === cowboyColorPath) results.exceptions.push({
        path: route,
        reason: 'User approved preserving the existing meta/OG/Twitter descriptions and reporting the CollectionPage parity exception.',
        descriptionParity: false,
      });
      assert.ok(!page.meta[0].endsWith('…'), `${route}: truncated meta`);
      assert.ok(page.list, `${route}: missing ItemList`);
      const collection = page.schemas.find(node => typed(node, 'CollectionPage'));
      const gallery = page.schemas.find(node => typed(node, 'ImageGallery'));
      assert.ok(gallery, `${route}: missing ImageGallery`);
      assert.equal(collection.mainEntity['@id'], gallery['@id'], `${route}: collection/gallery connection`);
      assert.equal(gallery.mainEntity['@id'], page.list['@id'], `${route}: gallery/list connection`);
      assert.equal(page.list.numberOfItems, page.visible.length, `${route}: visible count`);
      equal(page.list.itemListElement.map(i => i.url), page.visible.map(i => i.url), `${route}: visible works/order`);
      page.list.itemListElement.forEach((entry, index) => {
        assert.equal(entry.position, index + 1);
        assert.ok(entry.item.name);
        assert.ok(entry.item.contentUrl || entry.item.image);
        const visibleImageId = page.visible[index].image.match(/i-[a-zA-Z0-9]+/)?.[0];
        assert.equal(new URL(entry.item.contentUrl || entry.item.image).pathname.split('/')[2], visibleImageId, `${route}: image mismatch`);
      });
    }
  } catch (error) { results.failures.push(error.message.split('\n')[0]); }
}
for (const route of controlPaths) {
  try {
    const page = await fetchPage(route);
    const fields = Object.fromEntries(['title', 'meta', 'og', 'twitter', 'canonical', 'schemas', 'bodyText', 'links', 'hero'].map(k => [k, page[k]]));
    if (!capture) {
      const old = baseline.controls.find(row => row.path === route).fields;
      for (const key of Object.keys(fields)) {
        const normalize = key === 'schemas' ? stableSchema : key === 'links' ? value => [...new Set(value)].sort() : value => value;
        equal(normalize(fields[key]), normalize(old[key]), `${route}: control ${key} changed`);
      }
    }
    results.controls.push({ path: route, fields });
  } catch (error) { results.failures.push(error.message.split('\n')[0]); }
}
if (checkImages) {
  const urls = [...new Set(results.landings.flatMap(row => row.page.list?.itemListElement.map(i => i.item.contentUrl || i.item.image) || []))];
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  for (const url of urls) {
      await sleep(1800);
      try {
        let response = await fetch(url, { signal: AbortSignal.timeout(60000) });
        if (response.status === 429) {
          const retryAfter = Math.max(60, Number(response.headers.get('retry-after')) || 60);
          await response.body?.cancel();
          console.log(`Image rate limit: respecting Retry-After ${retryAfter}s.`);
          for (let remaining = retryAfter; remaining > 0; remaining -= 30) await sleep(Math.min(30, remaining) * 1000);
          response = await fetch(url, { signal: AbortSignal.timeout(60000) });
        }
        results.images.push({ url, status: response.status });
        await response.body?.cancel();
        assert.equal(response.status, 200, `${url}: image HTTP ${response.status}`);
      } catch (error) { results.failures.push(error.message); }
      if (results.images.length % 20 === 0) console.log(`Images checked: ${results.images.length}/${urls.length}`);
      if (results.images.at(-1)?.status === 429) {
        results.failures.push('Image checks incomplete: rate limit persisted after Retry-After.');
        break;
      }
  }
}
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(capture ? baselineFile : output, JSON.stringify(results, null, 2));
console.log(JSON.stringify({ origin, landings: results.landings.length, controls: results.controls.length, images: results.images.length, exceptions: results.exceptions, failures: results.failures }, null, 2));
if (results.failures.length) process.exitCode = 1;
