import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parse } from 'parse5';
import { pathToFileURL } from 'node:url';
import { galleryIdentEntries, semantic } from '../src/data/semantic/K4-Sem.ts';

// Run against the production artifact, or pass a served origin for post-deploy checks.
const origin = process.argv[2] === '--artifact' ? null : process.argv[2];
const packetPath = process.argv[3];
const packet = packetPath ? fs.readFileSync(packetPath, 'utf8') : null;
const slugs = ['WWII-Photography', 'Roaring-20s-Photography', 'Painterly-Landscape-Photography', 'Painterly-Transportation-Photography', 'Painterly-Portrait-Photography'];
const counts = [6, 2, 8, 3, 1];
for (const phrase of ['Roaring 20s Photography', 'Roaring Twenties Photography']) {
  assert.ok(semantic.roaring20s.landingPhrases.some(entry => entry.phrase === phrase && entry.link === '/Roaring-20s-Photography' && entry.use), phrase + ': keyword target');
}
assert.ok(!galleryIdentEntries.some(entry => entry.link === '/Roaring-Twenties-Photography'), 'No stale Roaring Twenties doorway target');
const walk = node => [node, ...(node.childNodes || []).flatMap(walk)];
const attr = (node, name) => node.attrs?.find(item => item.name === name)?.value;
const text = node => node.nodeName === '#text' ? node.value : (node.childNodes || []).map(text).join('');
const normalized = node => text(node).replace(/\s+/g, ' ').trim();
const hasClass = (node, name) => (attr(node, 'class') || '').split(/\s+/).includes(name);
const visible = items => items.filter(item => item?.id && item.id !== 'i-k4studios' && !['hidden', 'hide', 'ghost', 'non', 'none', ''].includes(String(item.visibility ?? 'show').trim().toLowerCase()));
for (const [index, slug] of slugs.entries()) {
  const response = origin ? await fetch(origin.replace(/\/$/, '') + '/' + slug) : null;
  if (response) assert.equal(response.status, 200, slug);
  const html = response ? await response.text() : fs.readFileSync(`dist/${slug}/index.html`, 'utf8');
  const nodes = walk(parse(html));
  const one = predicate => { const found = nodes.filter(predicate); assert.equal(found.length, 1, slug + ': unique element'); return found[0]; };
  const h1 = normalized(one(n => n.tagName === 'h1'));
  const title = normalized(one(n => n.tagName === 'title'));
  assert.equal(attr(one(n => n.tagName === 'meta' && attr(n, 'property') === 'og:title'), 'content'), title, slug + ': Open Graph title');
  assert.equal(attr(one(n => n.tagName === 'meta' && attr(n, 'name') === 'twitter:title'), 'content'), title, slug + ': Twitter title');
  const kicker = normalized(one(n => hasClass(n, 'gateway-kicker')));
  const description = attr(one(n => n.tagName === 'meta' && attr(n, 'name') === 'description'), 'content');
  for (const [key, value] of [['property', 'og:description'], ['name', 'twitter:description']]) {
    assert.equal(attr(one(n => n.tagName === 'meta' && attr(n, key) === value), 'content'), description, slug + ': ' + value);
  }
  const graph = nodes.filter(n => n.tagName === 'script' && attr(n, 'type') === 'application/ld+json').flatMap(n => { const data = JSON.parse(text(n)); return data['@graph'] || [data]; });
  const gallery = graph.find(n => [].concat(n['@type']).includes('ImageGallery') && [].concat(n['@type']).includes('CollectionPage'));
  assert.ok(gallery, slug + ': ImageGallery');
  assert.equal(gallery.description, description, slug + ': JSON-LD description');
  const list = graph.find(n => n['@type'] === 'ItemList' && n['@id'] === gallery.mainEntity['@id']);
  assert.ok(list?.itemListElement.length > 0, slug + ': ItemList');
  const faq = graph.find(n => n['@type'] === 'FAQPage');
  const questions = nodes.filter(n => hasClass(n, 'faq-question__text')).map(normalized);
  const answers = nodes.filter(n => attr(n, 'data-faq-panel') !== undefined).map(normalized);
  assert.deepEqual(faq.mainEntity.map(q => q.name), questions, slug + ': FAQ questions');
  assert.deepEqual(faq.mainEntity.map(q => q.acceptedAnswer.text), answers, slug + ': FAQ answers');
  const taxonomy = one(n => hasClass(n, 'subject-taxonomy'));
  const sections = nodes.filter(n => hasClass(n, 'catalog-gallery-section'));
  const introduction = one(n => attr(n, 'id') === 'collection-introduction-heading');
  const seriesSelector = one(n => hasClass(n, 'print-options'));
  assert.ok(nodes.indexOf(introduction) < nodes.indexOf(seriesSelector), slug + ': collection introduction before print series');
  assert.ok(nodes.indexOf(seriesSelector) < nodes.indexOf(sections[0]), slug + ': print series before grids');
  assert.equal(sections.length, counts[index], slug + ': grid count');
  assert.ok(nodes.indexOf(taxonomy) < nodes.indexOf(sections[0]), slug + ': taxonomy before grid');
  let total = 0;
  const sectionCounts = [];
  for (const section of sections) {
    const cta = walk(section).find(n => hasClass(n, 'catalog-collection-cta'));
    const href = attr(cta, 'href');
    assert.ok(href, slug + ': collection CTA');
    const galleryPath = href.split('/all')[0];
    let dataPath = 'src/data' + galleryPath;
    if (galleryPath.includes('/By-Theme/')) dataPath += '/' + galleryPath.split('/').at(-1);
    const data = await import(pathToFileURL(process.cwd() + '/' + dataPath + '.mjs'));
    const count = visible(data.galleryData).length;
    assert.ok(normalized(cta).includes(`${count} works in this gallery`), slug + ': count matches source');
    for (const link of walk(section).filter(n => attr(n, 'data-context-image-link') !== undefined)) {
      assert.ok(attr(link, 'href').startsWith(galleryPath + '/i-'), slug + ': artwork link');
    }
    total += count;
    sectionCounts.push(count);
  }
  assert.equal(list.numberOfItems, total, slug + ': total count');
  if (index === 1) assert.equal(total, 48, 'Roaring 20s approved count');
  if (index === 0) assert.ok(!/\bSS\b|Waffen|Schutzstaffel|pea[ -]dot/i.test(html), 'WWII copy guard');
  assert.ok(!/href=["']\/Facing-History["']/.test(html), 'No Facing History doorway');
  if (packet) {
    const block = packet.slice(packet.indexOf(`${index + 1}. /${slug}`));
    assert.equal(title, block.match(/Title tag \(DRAFT\): (.+)/)[1].trim(), slug + ': approved title');
    assert.equal(description, block.match(/Description, all four layers \(DRAFT\): (.+)/)[1].trim(), slug + ': approved description');
    assert.equal(h1, block.match(/H1: (.+)/)[1].trim(), slug + ': approved H1');
    assert.equal(kicker, block.match(/Eyebrow above H1 \(DRAFT\): (.+)/)[1].trim(), slug + ': approved eyebrow');
    assert.equal(normalized(nodes.find(n => hasClass(n, 'gateway-copy-text'))), block.match(/Opening paragraph .*?: > (.+)/)[1].trim(), slug + ': opening');
  }
  console.log(`PASS /${slug}: ${total} works [${sectionCounts.join(', ')}]; metadata, schema, taxonomy, FAQ and links`);
}
