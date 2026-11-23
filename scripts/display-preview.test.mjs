import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { DISPLAY_PREVIEWS, getDisplayPreview } from '../src/data/pricing/displayPreviews.js';

test('size matching accepts inch marks, multiplication signs, and landscape dimensions; incomplete previews stay hidden', () => {
  const original = DISPLAY_PREVIEWS['5x7'];
  try {
    DISPLAY_PREVIEWS['5x7'] = { image: null, caption: original.caption };
    assert.equal(getDisplayPreview('5 x 7'), null);
    DISPLAY_PREVIEWS['5x7'] = { image: '/images/sample.webp', caption: original.caption };
    for (const size of ['5" x 7"', '5 × 7', '7 x 5']) {
      assert.equal(getDisplayPreview(size).size, '5 x 7');
    }
    assert.equal(getDisplayPreview('12 x 18'), null);
    assert.equal(getDisplayPreview('unknown'), null);
    DISPLAY_PREVIEWS['5x7'] = { image: '/images/sample.webp', caption: null };
    assert.equal(getDisplayPreview('5 x 7'), null);
  } finally {
    DISPLAY_PREVIEWS['5x7'] = original;
  }
});

test('sample opens above its parent, traps focus, closes independently, and fits mobile', async () => {
  const { outputFiles } = await build({
    stdin: {
      contents: `
        import React from 'react';
        import { createRoot } from 'react-dom/client';
        import ImagePricingSummary from './src/components/ImagePricingSummary.jsx';
        import DisplayPreviewButton from './src/components/DisplayPreviewButton.jsx';
        import CollectionOrderModal from './src/components/commerce/CollectionOrderModal.jsx';
        import { DISPLAY_PREVIEWS } from './src/data/pricing/displayPreviews.js';
        DISPLAY_PREVIEWS['5x7'].image = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="gray"/></svg>');
        window.orders = 0;
        window.parentKeys = 0;
        window.addEventListener('keydown', () => window.parentKeys++);
        const root = createRoot(document.getElementById('app'));
        window.showFullSummary = (showLimited = true) => root.render(<ImagePricingSummary commerce={{ mode: 'standard', imageTitle: 'Limited edition test', tiers: [{ key: 'chronicle', pricing: [{ size: '16" x 20"', price: 1100 }, { size: '20" x 24"', price: 1500 }] }, { key: 'legend', pricing: [{ size: '30" x 40"', price: 3800 }, { size: '40" x 60"', price: 5000 }] }] }} showLimited={showLimited} onOrder={() => window.orders++} />);
        window.showOrder = () => root.render(<CollectionOrderModal isOpen image={{ id: 'i-test', title: 'Test artwork' }} displaySeries={['sketch', 'foundation', 'chronicle', 'legend']} onClose={() => window.parentClosed = true} trackEvent={() => window.orders++} />);
        root.render(<>
          <ImagePricingSummary commerce={{ mode: 'standard', imageTitle: 'Test artwork', tiers: [{ key: 'sketch', pricing: [{ size: '5" x 7"', price: 25 }] }] }} onOrder={() => window.orders++} />
          <DisplayPreviewButton size="12 x 18" />
        </>);
      `,
      resolveDir: process.cwd(), loader: 'jsx',
    },
    bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic',
    loader: { '.css': 'empty' }, tsconfigRaw: { compilerOptions: {} }, logLevel: 'silent',
  });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 850 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://preview.test/images/16x20sample1.webp', route => route.fulfill({ contentType: 'image/webp', body: fs.readFileSync('public/images/16x20sample1.webp') }));
    await page.route('https://preview.test/', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><div id="app"></div>' }));
    await page.goto('https://preview.test/');
    await page.addStyleTag({ content: fs.readFileSync('src/components/DisplayPreviewButton.css', 'utf8') });
    await page.addScriptTag({ content: outputFiles[0].text });
    const button = page.getByRole('button', { name: 'See on Wall for 5 x 7 prints', exact: true });
    await button.waitFor();
    assert.equal(await page.getByRole('button', { name: /See on Wall/ }).count(), 1);
    await button.click();
    const dialog = page.getByRole('dialog', { name: 'Display Preview' });
    await dialog.waitFor();
    await page.waitForFunction(() => {
      const image = document.querySelector('.display-preview-image');
      return image?.complete && image.naturalWidth > 0;
    });
    assert.equal(await dialog.getByText('5 x 7 prints display nicely in 8x10 mats and frames.').count(), 1);
    const close = page.getByRole('button', { name: 'Close display preview' });
    await close.focus();
    await page.keyboard.press('Tab');
    assert.equal(await close.evaluate(element => element === document.activeElement), true);
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => window.parentKeys), 0);
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached' });
    assert.equal(await button.evaluate(element => element === document.activeElement), true);
    assert.equal(await page.evaluate(() => window.orders), 0);
    await button.click();
    await close.click();
    await dialog.waitFor({ state: 'detached' });
    await page.setViewportSize({ width: 390, height: 844 });
    await button.click();
    const bounds = await dialog.boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 390);
    assert.ok(bounds.height <= 844);
    await page.mouse.click(2, 2);
    await dialog.waitFor({ state: 'detached' });
    assert.equal(await page.evaluate(() => window.orders), 0);
    await page.evaluate(() => window.showOrder());
    const ordering = page.locator('[data-k4-native-collection-cart]');
    await ordering.waitFor();
    assert.equal(await ordering.getByRole('button', { name: /See on Wall/ }).count(), 7);
    await ordering.getByRole('button', { name: 'See on Wall for 16 x 20 prints', exact: true }).click();
    await dialog.waitFor();
    assert.equal(await dialog.getByText('Display idea for a 16 x 20 print.').count(), 1);
    await page.waitForFunction(() => document.querySelector('.display-preview-image')?.naturalWidth > 0);
    await close.click();
    await dialog.waitFor({ state: 'detached' });
    assert.equal(await ordering.isVisible(), true);
    assert.equal(await page.evaluate(() => Boolean(window.parentClosed)), false);
    assert.equal(await page.evaluate(() => window.orders), 0);
    assert.equal(await ordering.getByRole('button', { name: 'View cart with 0 items' }).count(), 1);
    await page.evaluate(() => window.showFullSummary());
    const summary = page.locator('.image-pricing-summary');
    await summary.waitFor();
    assert.deepEqual(await summary.locator('[data-pricing-series]').evaluateAll(groups => groups.map(group => group.getAttribute('data-pricing-series'))), ['chronicle', 'legend']);
    assert.equal(await summary.getByRole('heading', { name: 'Chronicle Series', exact: true }).count(), 1);
    assert.equal(await summary.getByRole('heading', { name: 'Legend Series', exact: true }).count(), 1);
    assert.equal(await summary.getByText('Editions defined by size', { exact: true }).count(), 2);
    for (const limit of [30, 20, 15, 5]) assert.equal(await summary.getByText(`Edition of ${limit} + 1 AP`, { exact: true }).count(), 1);
    assert.equal(await summary.locator('[data-pricing-series="legend"]').evaluate(group => getComputedStyle(group).borderTopStyle), 'dashed');
    assert.deepEqual(await summary.locator('[data-pricing-size]').evaluateAll(rows => rows.map(row => row.getAttribute('data-pricing-size'))), ['16" x 20"', '20" x 24"', '30" x 40"', '40" x 60"']);
    for (const price of ['$1,100', '$1,500', '$3,800', '$5,000']) assert.equal(await summary.getByText(price, { exact: true }).count(), 1);
    assert.equal(await summary.getByRole('button', { name: /See on Wall/ }).count(), 4);
    assert.equal(await summary.getByText(/Sizes from|from \$/).count(), 0);
    await summary.getByRole('button', { name: 'Place Order', exact: true }).click();
    assert.equal(await page.evaluate(() => window.orders), 1);
    await page.evaluate(() => window.showFullSummary(false));
    await summary.waitFor({ state: 'detached' });
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

test('See on Wall tracks size and Z/P/O origin once per open and never on close', async () => {
  const { outputFiles } = await build({
    stdin: { contents: `
      import React from 'react';
      import { createRoot } from 'react-dom/client';
      import DisplayPreviewButton from './src/components/DisplayPreviewButton.jsx';
      import ImagePricingSummary from './src/components/ImagePricingSummary.jsx';
      window.tracked = [];
      window.fetch = async (_url, options) => { window.tracked.push(JSON.parse(options.body)); return new Response(null, { status: 204 }); };
      createRoot(document.getElementById('app')).render(<>
        <ImagePricingSummary previewSource="zoom" commerce={{ mode: 'standard', imageId: 'i-target', tiers: [{ key: 'sketch', pricing: [{ size: '5" x 7"', price: 25 }] }] }} />
        <ImagePricingSummary commerce={{ mode: 'standard', imageId: 'i-target', tiers: [{ key: 'foundation', pricing: [{ size: '16" x 20"', price: 250 }] }] }} />
        <DisplayPreviewButton size={'30" x 40"'} imageId="i-target" source="order" />
        <DisplayPreviewButton size={'40" x 60"'} imageId="i-target" />
      </>);
    `, resolveDir: process.cwd(), loader: 'jsx' },
    bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic',
    loader: { '.css': 'empty' }, tsconfigRaw: { compilerOptions: {} }, logLevel: 'silent',
  });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
    await page.route('https://www.k4studios.com/**', route => route.fulfill({
      contentType: 'text/html', body: '<!doctype html><div id="app"></div>',
    }));
    await page.goto('https://www.k4studios.com/Galleries/Test/i-url');
    await page.addScriptTag({ content: outputFiles[0].text });
    await page.getByRole('button', { name: 'See on Wall for 5 x 7 prints', exact: true }).click();
    const first = (await page.evaluate(() => window.tracked))[0];
    assert.equal(first.event, 'wall_preview_open');
    assert.equal(first.image_id, 'i-target');
    assert.equal(first.source_layer, 'wall_preview_size_5x7_zoom_v2');
    assert.equal(first.trigger, 'see_on_wall_5x7_zoom');
    assert.ok(first.session_id && first.visitor_id);
    await page.getByRole('button', { name: 'Close display preview' }).click();
    assert.equal(await page.evaluate(() => window.tracked.length), 1);
    await page.getByRole('button', { name: 'See on Wall for 16 x 20 prints', exact: true }).click();
    const second = (await page.evaluate(() => window.tracked))[1];
    assert.equal(second.source_layer, 'wall_preview_size_16x20_pricing_v2');
    assert.equal(second.trigger, 'see_on_wall_16x20_pricing');
    await page.getByRole('button', { name: 'Close display preview' }).click();
    await page.getByRole('button', { name: 'See on Wall for 30 x 40 prints', exact: true }).click();
    const third = (await page.evaluate(() => window.tracked))[2];
    assert.equal(third.source_layer, 'wall_preview_size_30x40_order_v2');
    assert.equal(third.trigger, 'see_on_wall_30x40_order');
    await page.getByRole('button', { name: 'Close display preview' }).click();
    await page.getByRole('button', { name: 'See on Wall for 40 x 60 prints', exact: true }).click();
    assert.equal((await page.evaluate(() => window.tracked))[3].source_layer, 'wall_preview_size_40x60_v1');
    await page.getByRole('button', { name: 'Close display preview' }).click();
    await page.waitForTimeout(2600);
    await page.getByRole('button', { name: 'See on Wall for 5 x 7 prints', exact: true }).click();
    assert.equal(await page.evaluate(() => window.tracked.length), 5);
  } finally { await browser.close(); }
});
