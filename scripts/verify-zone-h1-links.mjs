import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { transform } from '@astrojs/compiler';
import { experimental_AstroContainer } from 'astro/container';
import { parseFragment } from 'parse5';
import { chromium } from 'playwright';
import ts from 'typescript';
import { zoneH1Entries, getZoneH1Parts, semantic, ZONE_H1_CLICK_EVENT } from '../src/data/semantic/K4-Sem.ts';
import { V3_CORE_EVENT_TYPES, getV3ActionLabel } from '../cloudflare-worker/src/analytics/v3/model.js';

// Component-only SSR and browser checks. Does not run Astro build, start a server,
// or touch dist/. Safe to use while the user's localhost preview is running.
const walk = node => [node, ...(node.childNodes || []).flatMap(walk)];
const attr = (node, key) => node.attrs?.find(item => item.name === key)?.value;
const text = node => node.nodeName === '#text' ? node.value : (node.childNodes || []).map(text).join('');
const componentPath = path.resolve('src/components/ZoneH1Text.astro');
const source = fs.readFileSync(componentPath, 'utf8');
const compiled = await transform(source, { filename: componentPath });
// Node doesn't load Vite's CSS/metadata imports; remove only those from this
// temporary component module. Render the actual compiled template unchanged.
const moduleCode = compiled.code
  .replace(/\s*createMetadata as \$\$createMetadata\n/, '\n')
  .replace(/import "[^"\n]+\?astro&type=style[^"\n]*";\n/g, '')
  .replace(/import \* as \$\$module\d+ from [^\n]+;\n/g, '')
  .replace(/export const \$\$metadata =[\s\S]*?(?=const \$\$Astro)/, '')
  .replace("'@/data/semantic/K4-Sem'", JSON.stringify(pathToFileURL(path.resolve('src/data/semantic/K4-Sem.ts')).href));
const tempModule = path.resolve('tmp/zone-h1-component-check.mjs');
fs.mkdirSync(path.dirname(tempModule), { recursive: true });
fs.writeFileSync(tempModule, moduleCode);
const { default: Component } = await import(pathToFileURL(tempModule));
const container = await experimental_AstroContainer.create();
assert.equal(zoneH1Entries.length, 15);
const rendered = [];
for (const row of zoneH1Entries) {
  const pageFile = 'src/pages' + row.path + '.astro';
  const pageSource = fs.readFileSync(pageFile, 'utf8');
  await transform(pageSource, { filename: pageFile });
  assert.equal([...pageSource.matchAll(/<h1\b/g)].length, 1, row.path + ': single H1');
  assert.match(pageSource, /<h1[^>]*><ZoneH1Text title=\{landingWestern.title\} \/><\/h1>/);
  const original = row.path.endsWith('/Landscapes') ? 'Painterly Landscape Photography by Wayne Heim' : row.path === '/Galleries/Painterly-Fine-Art-Photography' ? 'Painterly Fine Art Photography' : 'original heading';
  const expected = row.replacementH1 ?? original;
  const html = await container.renderToString(Component, { props: { title: original }, request: new Request('http://localhost' + row.path) });
  const tree = parseFragment(html);
  const anchors = walk(tree).filter(node => node.tagName === 'a');
  assert.equal(anchors.length, 1, row.path + ': exactly one link');
  assert.equal(attr(anchors[0], 'href'), row.target, row.path + ': target');
  assert.equal(text(anchors[0]), row.span, row.path + ': exact anchor span');
  assert.equal(text(tree).trim(), expected, row.path + ': approved H1');
  assert.equal(getZoneH1Parts(row.path + '/', original).title, expected);
  assert.ok(fs.existsSync('src/pages' + row.target + '.astro') || fs.existsSync('src/pages' + row.target + '/index.astro'), row.path + ': target exists');
  rendered.push({ row, html, expected });
}
for (const route of ['/Galleries/Fine-Art-Photography', '/Galleries/Fine-Art-Photography/Architecture', '/Galleries/Fine-Art-Photography/Landscapes', '/Galleries/Fine-Art-Photography/Landscapes/By-Location', '/Galleries/Fine-Art-Photography/Landscapes/By-Location/International', '/Galleries/Fine-Art-Photography/Landscapes/By-Theme', '/Galleries/Fine-Art-Photography/Miscellaneous', '/Galleries/Fine-Art-Photography/Portraits', '/Galleries/Fine-Art-Photography/Portraits/Portraits', '/Galleries/Fine-Art-Photography/Transportation', '/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location', '/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme']) {
  const parts = getZoneH1Parts(route, 'unchanged heading');
  assert.equal(parts.title, 'unchanged heading');
  assert.equal(parts.target, null);
  const pageSource = fs.readFileSync('src/pages' + route + '.astro', 'utf8');
  assert.ok(!pageSource.includes('ZoneH1Text'), route + ': excluded page untouched');
}
const blackWhiteHub = Object.values(semantic).find(section => section.path === '/Western-Black-and-White-Photography');
assert.equal(blackWhiteHub.landingPhrases.find(entry => entry.phrase === 'Black and White Western Photography')?.rating, 10);
assert.ok(V3_CORE_EVENT_TYPES.includes(ZONE_H1_CLICK_EVENT));
assert.equal(getV3ActionLabel(ZONE_H1_CLICK_EVENT), 'Zone H1 clicked');
for (const file of ['cloudflare-worker/src/analytics/storage.js', 'cloudflare-worker/src/analytics/worker.js']) {
  const workerSource = fs.readFileSync(file, 'utf8');
  assert.match(workerSource, /CANONICAL_TRACKED_EVENTS[^[]*\[\s*['"]zone_h1_click['"]/);
}
const client = compiled.scripts[0].code.replace(/^\s*import [^\n]+;\s*$/gm, '');
const clientJS = ts.transpileModule(client, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  for (const item of [rendered[0], rendered.find(item => item.row.path.endsWith('/WWII'))]) {
    await page.setContent('<style>h1{font:700 32px/1.3 Georgia;letter-spacing:1px;color:rgb(50,40,30)}' + compiled.css.map(item => item.code ?? item).join('\n') + '</style><h1>' + item.html + '</h1>');
    await page.evaluate(({ eventName }) => { window.ZONE_H1_CLICK_EVENT = eventName; window.clicks = []; window.trackEvent = event => window.clicks.push(event); }, { eventName: ZONE_H1_CLICK_EVENT });
    await page.addScriptTag({ content: clientJS });
    const styles = () => page.evaluate(() => {
      const heading = getComputedStyle(document.querySelector('h1'));
      const link = getComputedStyle(document.querySelector('h1 a'));
      return { heading: [heading.color, heading.font, heading.letterSpacing], link: [link.color, link.font, link.letterSpacing], decoration: link.textDecorationLine, cursor: link.cursor };
    });
    const normal = await styles();
    assert.deepEqual(normal.heading, normal.link);
    assert.equal(normal.decoration, 'none');
    assert.equal(normal.cursor, 'pointer');
    await page.locator('h1 a').hover();
    assert.deepEqual(await styles(), normal, 'hover appearance remains silent');
    await page.evaluate(() => {
      document.addEventListener('click', event => event.preventDefault());
      document.querySelector('h1 a').click();
    });
    assert.deepEqual(await page.evaluate(() => window.clicks), [ZONE_H1_CLICK_EVENT], 'one aggregate event per click');
    await page.evaluate(() => document.querySelector('h1 a').style.setProperty('--zone-h1-cursor', 'default'));
    assert.equal((await styles()).cursor, 'default', 'pointer flag can suppress pointer without changing the link');
  }
  await page.close();
} finally { await browser.close(); }
console.log('PASS: 15 SSR H1s, exact spans/targets, 12 excluded zones, rating 10, silent normal/hover styles, pointer toggle, and aggregate click tracking. No build or server restart.');
