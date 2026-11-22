import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createPageSpecificSourceResolver } from './page-specific-sitemap-sources.mjs';

async function fixture(t, files, config = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'k4-page-sources-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith('k4-page-sources-'));
    return rm(root, { recursive: true, force: true });
  });
  for (const [name, source] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(root, name)), { recursive: true });
    await writeFile(path.join(root, name), source);
  }
  const resolver = createPageSpecificSourceResolver({ repoRoot: root,
    resolveGalleryDataset: async href => path.join(root, 'src/data', href.slice(1) + '.mjs'),
    ...config,
  });
  return async (route, url) => (await resolver(path.join(root, route), url))
    .map(item => ({ ...item, file: path.relative(root, item.file).replaceAll('\\', '/') }));
}

test('a cornerstone owns its data, visual JSON and essay; shared imports are excluded', async t => {
  const get = await fixture(t, {
    'src/pages/Blog/example.astro': '---\nimport {data} from "@/data/cornerstones/example"; import Essay from "@/data/cornerstones/essays/example.astro"; import Layout from "@/layouts/BaseLayout.astro";\n---\n<Essay />',
    'src/data/cornerstones/example.ts': 'import visual from "./example.json"; import registry from "@/data/generated/index.json";',
    'src/data/cornerstones/example.json': '{}', 'src/data/cornerstones/essays/example.astro': '---\n---\n<p>essay</p>',
    'src/layouts/BaseLayout.astro': '---\nimport map from "@/data/imageIdMap.json";\n---\n<slot />',
    'src/data/generated/index.json': '{}', 'src/data/imageIdMap.json': '{}',
  });
  assert.deepEqual((await get('src/pages/Blog/example.astro', '/Blog/example')).map(x => x.file).sort(), [
    'src/data/cornerstones/essays/example.astro', 'src/data/cornerstones/example.json',
    'src/data/cornerstones/example.ts', 'src/pages/Blog/example.astro',
  ]);
});

test('shared configs locate only the selected page sections and are never date sources', async t => {
  const get = await fixture(t, {
    'src/pages/collection.astro': '---\nimport {commercialIntentPages} from "@/data/doorway/commercialIntentPages"; const config = commercialIntentPages.cowboys;\n---\n',
    'src/data/doorway/commercialIntentPages.ts': 'export const commercialIntentPages = {};',
  }, { loadModule: async () => ({ commercialIntentPages: {
    cowboys: { gridSections: [{ galleryPath: '/Galleries/Cowboys/Color' }] },
    unrelated: { gridSections: [{ galleryPath: '/Galleries/Unrelated/Color' }] },
  } }) });
  assert.deepEqual((await get('src/pages/collection.astro', '/collection')).map(x => x.file), [
    'src/pages/collection.astro', 'src/data/Galleries/Cowboys/Color.mjs',
  ]);
});

test('unresolved glob-based content leaves the dependency set at the route, without widening', async t => {
  const get = await fixture(t, { 'src/pages/zone.astro': '---\nconst all = import.meta.glob("@/data/Galleries/**/*.mjs");\n---\n' });
  assert.deepEqual((await get('src/pages/zone.astro', '/zone')).map(x => x.kind), ['route']);
});

test('direct gallery datasets count, while neighboring global registries do not', async t => {
  const get = await fixture(t, {
    'src/pages/gallery.astro': '---\nimport data from "@/data/Galleries/Cowboys/Color.mjs"; import map from "@/data/galleryMaps/MasterGalleryData.mjs"; const rawGalleryData = data;\n---\n',
    'src/data/Galleries/Cowboys/Color.mjs': 'export const galleryData = [];',
    'src/data/galleryMaps/MasterGalleryData.mjs': 'export const galleryDataMap = {};',
  });
  assert.deepEqual((await get('src/pages/gallery.astro', '/gallery')).map(x => x.kind), ['route', 'gallery-dataset']);
});

test('an essay illustration pool does not inherit gallery-wide edits', async t => {
  const get = await fixture(t, {
    'src/pages/Blog/story.astro': '---\nimport pictures from "@/data/Galleries/Cowboys/Color.mjs"; const hero = pictures[0];\n---\n<p>Own essay text.</p>',
    'src/data/Galleries/Cowboys/Color.mjs': 'export const galleryData = [];',
  });
  assert.deepEqual((await get('src/pages/Blog/story.astro', '/Blog/story')).map(source => source.file), ['src/pages/Blog/story.astro']);
});

test('the named catch-all never contributes, while its specific dataset can', async t => {
  const get = await fixture(t, {
    'src/pages/[...gallery]/all.astro': '---\nimport data from "@/data/Galleries/Cowboys/Color.mjs";\n---\n',
    'src/data/Galleries/Cowboys/Color.mjs': 'export const galleryData = [];',
  });
  assert.deepEqual((await get('src/pages/[...gallery]/all.astro', '/Galleries/Cowboys/Color/all')).map(source => source.file), ['src/data/Galleries/Cowboys/Color.mjs']);
});

test('a template-selected family uses only the displayed datasets, excluding its registry', async t => {
  const get = await fixture(t, {
    'src/pages/landscapes/index.astro': '---\nimport {familyDoorwayPages} from "@/data/doorway/familyDoorwayPages";\n---\n<Family config={familyDoorwayPages["landscapes"]}/>',
  }, { loadModule: async () => ({ familyDoorwayPages: {
    landscapes: { gridSections: [{ galleryPath: '/Galleries/Landscapes/West' }] },
    portraits: { gridSections: [{ galleryPath: '/Galleries/Unrelated/Portraits' }] },
  } }) });
  assert.deepEqual((await get('src/pages/landscapes/index.astro', '/landscapes')).map(source => source.file), [
    'src/pages/landscapes/index.astro', 'src/data/Galleries/Landscapes/West.mjs',
  ]);
});
