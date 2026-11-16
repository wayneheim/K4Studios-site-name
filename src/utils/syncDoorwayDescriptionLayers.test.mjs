import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { syncDoorwayDescriptionLayers } from './syncDoorwayDescriptionLayers.mjs';

test('OG wins verbatim, including entities, while both social tags and media copy stay untouched', () => {
  const social = '<meta property="og:description" content="A &amp; B — &quot;whole&quot;."><meta name="twitter:description" content="A &amp; B — &quot;whole&quot;.">';
  const html = '<meta name="description" content="A - cut…">' + social + '<script type="application/ld+json">' + JSON.stringify({ '@graph': [
    { '@type': 'Article', url: 'https://www.k4studios.com/Other/Shows', description: 'old' },
    { '@type': 'VideoObject', description: 'video copy' },
    { '@type': 'CollectionPage', url: 'https://www.k4studios.com/Elsewhere', description: 'related page copy' },
  ] }) + '</script><main>Same body</main>';
  const result = syncDoorwayDescriptionLayers(html, '/Other/Shows');
  assert.ok(result.includes(social));
  assert.ok(result.endsWith('<main>Same body</main>'));
  assert.ok(result.includes('<meta name="description" content="A &amp; B — &quot;whole&quot;.">'));
  const graph = JSON.parse(result.match(/<script[^>]*>(.*?)<\/script>/)[1])['@graph'];
  assert.equal(graph[0].description, 'A & B — "whole".');
  assert.equal(graph[1].description, 'video copy');
  assert.equal(graph[2].description, 'related page copy');
});
test('Glossary adopts the agreed source even when its existing schema text is longer', () => {
  const html = '<meta name="description" content="Brief…"><meta property="og:description" content="Brief full source."><meta name="twitter:description" content="Brief full source."><script type="application/ld+json">{"@type":"CollectionPage","url":"https://www.k4studios.com/Glossary","description":"A much longer existing schema description that must yield to the agreed public pair."}</script>';
  const result = syncDoorwayDescriptionLayers(html, '/Glossary');
  assert.equal(JSON.parse(result.match(/<script[^>]*>(.*?)<\/script>/)[1]).description, 'Brief full source.');
});
test('scope is exactly 17 routes, separate from Packet 3; source disagreement leaves HTML unchanged', () => {
  const targets = JSON.parse(fs.readFileSync(new URL('../data/seo/doorwayDescriptionSyncPages.json', import.meta.url)));
  const previous = JSON.parse(fs.readFileSync(new URL('../data/seo/schemaDescriptionSyncPages.json', import.meta.url)));
  assert.equal(Object.keys(targets).length, 17);
  assert.ok(!Object.keys(targets).some(path => Object.hasOwn(previous, path)));
  const html = '<meta name="description" content="old"><meta property="og:description" content="one"><meta name="twitter:description" content="two">';
  assert.equal(syncDoorwayDescriptionLayers(html, '/Glossary'), html);
});
