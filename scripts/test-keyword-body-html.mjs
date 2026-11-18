import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { build } from 'esbuild';

const root = process.cwd();
const output = path.join(root, 'tmp', 'keyword-body-tests.mjs');
fs.mkdirSync(path.dirname(output), { recursive: true });
await build({
  stdin: {
    contents: `export { linkKeywordBodyHtml } from './src/components/utils/linkKeywordBodyHtml.ts';
export { restoreProtectedFragments } from './src/components/utils/restoreProtectedFragments.ts';`,
    resolveDir: root,
    loader: 'ts',
  },
  alias: { '@': path.join(root, 'src'), '@data': path.join(root, 'src/data') },
  platform: 'node',
  format: 'esm',
  bundle: true,
  outfile: output,
  logLevel: 'silent',
});
const { linkKeywordBodyHtml, restoreProtectedFragments } = await import(pathToFileURL(output).href);
const markers = /[\uE000-\uE2FF]\d+[\uE000-\uE2FF]/;

test('grid card titles survive protection inside existing artwork links', () => {
  const card = '<a href="/piece" class="ssr-card-link"><h3>Land of Promise and Threat</h3><p>Western fine art photography stays as authored.</p></a>';
  assert.equal(linkKeywordBodyHtml(card, '/Western-Wall-Art'), card);
});

test('authored interlinks preserve nested artwork headings and still link body copy', () => {
  const card = '<a href="/piece"><h3>Contemporary Western art</h3><span>Original caption</span></a>';
  const result = linkKeywordBodyHtml(`${card}<p>Explore contemporary Western art.</p>`, '/Contemporary-Western-Art');
  assert(result.includes(card));
  assert(result.includes('class="editorial-link authored-interlink">contemporary Western art</a>'));
  assert(!markers.test(result));
});

test('automatic body links preserve headings, existing links, scripts and footer', () => {
  const protectedMarkup = '<h2>Western fine art photography</h2><a href="/authored"><h3>Painterly photography</h3></a><script type="application/ld+json">{"name":"Western fine art photography"}</script><footer><a href="/bio">Wayne Heim</a></footer>';
  const result = linkKeywordBodyHtml(`${protectedMarkup}<p>Explore western fine art photography.</p>`, '/Western-Wall-Art');
  assert(result.startsWith(protectedMarkup));
  assert(result.includes('class="kw-link"'));
  assert(!markers.test(result));
});

for (const start of [0xe000, 0xe100, 0xe200]) {
  test(`nested protection restores all fragments for marker family ${start.toString(16)}`, () => {
    const open = String.fromCharCode(start);
    const close = String.fromCharCode(start + 1);
    const token = index => `${open}${index}${close}`;
    const heading = '<h3>Land of Promise and Threat</h3>';
    const fragments = [heading, `<a href="/piece">${token(0)}</a>`, `<header>${token(1)}</header>`];
    const result = restoreProtectedFragments(`${token(2)}${token(1)}`, fragments, new RegExp(`${open}(\\d+)${close}`, 'g'));
    assert.equal(result, `<header><a href="/piece">${heading}</a></header><a href="/piece">${heading}</a>`);
    assert(!markers.test(result));
  });
}
