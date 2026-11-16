import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { syncPageSchemaDescriptions } from './syncPageSchemaDescriptions.mjs';

test('uses entity-decoded head text for page nodes, preserving media descriptions and head bytes', () => {
  const head = '<meta name="description" content="A &amp; B &#8212; &quot;full&quot;."><meta property="og:description" content="unchanged">';
  const graph = { '@graph': [
    { '@type': 'CollectionPage', description: 'generic', mainEntity: { '@type': 'ImageGallery', description: 'generic' } },
    { '@type': ['WebPage', 'ProfilePage'], description: 'different' },
    { '@type': 'Article', description: 'old' },
    { '@type': 'ImageObject', description: 'artwork copy' },
    { '@type': 'VideoObject', description: 'video copy' },
    { '@type': 'CollectionPage', url: 'https://www.k4studios.com/Other/Shows', description: 'another page' },
  ] };
  const html = head + '<script type="application/ld+json">' + JSON.stringify(graph) + '</script><main>Same body</main>';
  const output = syncPageSchemaDescriptions(html);
  assert.ok(output.startsWith(head));
  assert.ok(output.endsWith('<main>Same body</main>'));
  const nodes = JSON.parse(output.match(/<script[^>]*>(.*?)<\/script>/)[1])['@graph'];
  for (const n of nodes.slice(0, 3)) assert.equal(n.description, 'A & B — "full".');
  assert.equal(nodes[0].mainEntity.description, 'A & B — "full".');
  assert.equal(nodes[3].description, 'artwork copy');
  assert.equal(nodes[4].description, 'video copy');
  assert.equal(nodes[5].description, 'another page');
});
test('already aligned JSON-LD and invalid JSON remain byte-identical', () => {
  const html = '<meta name="description" content="Same."><script type="application/ld+json">{ "@type": "Article", "description": "Same." }</script><script type="application/ld+json">invalid</script>';
  assert.equal(syncPageSchemaDescriptions(html), html);
});
test('scope contains exactly 23 targets and excludes the standing Color exception and all video pages', () => {
  const targets = JSON.parse(fs.readFileSync(new URL('../data/seo/schemaDescriptionSyncPages.json', import.meta.url)));
  assert.equal(Object.keys(targets).length, 23);
  assert.ok(!Object.hasOwn(targets, '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color'));
  assert.ok(!Object.keys(targets).some(path => path.startsWith('/Videos')));
});
