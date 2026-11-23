import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { PAPER_EDITION_LIMITS, getEditionSummary, getArtistProofs, getSizeEditionLimit, validateEditionCounts, validateArtistProof, buildArtistProofProduct, assertNoAddedEditionSizes } from '../src/data/editionPolicy.js';
import { CHRONICLE_PRINT_PRODUCTS, LEGEND_PRINT_PRODUCTS, getCatalogProductsForSeries } from '../src/data/commerce/catalog.js';
import { reserveEditionInventory, commitEditionReservations, releaseEditionReservations } from '../cloudflare-commerce/src/editionInventory.js';

test('size limits, prices, aggregate disclosures and one AP per offered size agree', () => {
  const products = [...CHRONICLE_PRINT_PRODUCTS, ...LEGEND_PRINT_PRODUCTS];
  assert.deepEqual(products.map(product => product.editionLimit), [30, 20, 15, 5]);
  assert.deepEqual(products.map(product => product.unitPrice), [1100, 1500, 3800, 5000]);
  for (const product of products) {
    assert.equal(getSizeEditionLimit(product.seriesKey, product.size.replaceAll('"', '').replace('x', '×')), product.editionLimit);
    assert.throws(() => validateEditionCounts(product.seriesKey, { [product.size]: product.editionLimit + 1 }));
  }
  assert.equal(getEditionSummary('chronicle').shorthand, '30 + 20 + 2 AP');
  assert.equal(getEditionSummary('legend').shorthand, '15 + 5 + 2 AP');
  assert.equal(getEditionSummary('legend', ['40x60']).shorthand, '5 + 1 AP');
  assert.equal(getEditionSummary('chronicle', ['16x20']).total, 30);
  assert.equal(getEditionSummary('legend', ['30x40', '30x40']).ap, 1);
  assert.match(getEditionSummary('legend', ['40x60']).disclosure, /single individually numbered edition at 40×60/);
  assert.equal(Object.keys(getArtistProofs('legend', { legend: ['30" x 40"'] })).length, 1);
});

test('APs require explicit release and a price, and do not change the numbered edition', () => {
  const base = LEGEND_PRINT_PRODUCTS[1];
  assert.equal(buildArtistProofProduct(base), null);
  assert.equal(buildArtistProofProduct(base, { price: 6000 }), null);
  assert.throws(() => validateArtistProof({ availableForSale: true }));
  assert.throws(() => validateArtistProof({ printed: 0, sold: 1 }));
  const proof = validateArtistProof({ printed: 1, sold: 0, price: 6000, availableForSale: true });
  const product = buildArtistProofProduct(base, proof);
  assert.equal(product.editionLimit, 1);
  assert.equal(product.unitPrice, 6000);
  assert.equal(product.shippingRateKey, base.productKey);
  assert.equal(base.editionLimit, 5);
  assert.equal(buildArtistProofProduct(base, { ...proof, sold: 1 }), null);
  assert.equal(getCatalogProductsForSeries('legend').length, 2);
  assert.equal(getCatalogProductsForSeries('legend', [], { [base.size]: proof }).length, 3);
});

test('sold pieces cannot gain another size through registry changes', () => {
  const previous = { tiers: ['legend'], excludeSizes: { legend: ['40" x 60"'] }, editionData: { legend: { soldBySize: { '30" x 40"': 1 } } } };
  assert.throws(() => assertNoAddedEditionSizes(previous, { ...previous, excludeSizes: {} }), /Cannot add/);
  assert.doesNotThrow(() => assertNoAddedEditionSizes(previous, previous));
  const proofSale = { ...previous, editionData: { legend: { artistProofsBySize: { '30" x 40"': { sold: 1 } } } } };
  assert.throws(() => assertNoAddedEditionSizes(proofSale, { ...proofSale, excludeSizes: {} }), /Cannot add/);
});

test('direct artwork payload preserves excluded sizes before the browser registry loads', async () => {
  const { outputFiles } = await build({ entryPoints: ['src/utils/buildDirectImagePayload.js'], bundle: true, write: false, platform: 'node', format: 'esm' });
  const { buildDirectImagePayload } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`);
  const payload = buildDirectImagePayload({ allImages: [{ id: 'i-Gqw3s5s', title: 'Test artwork', visibility: 'show' }], initialImageId: 'i-Gqw3s5s', galleryPath: '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White' });
  assert.deepEqual(payload.currentImage._excludeSizes.legend, ['40" x 60"']);
  assert.equal(payload.currentImage.title, 'Test artwork');
  assert.equal(getEditionSummary('legend', Object.keys(PAPER_EDITION_LIMITS.legend).filter(size => !payload.currentImage._excludeSizes.legend.includes(size))).total, 15);
});

function database() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('CREATE TABLE orders (id TEXT PRIMARY KEY)');
  sqlite.exec(fs.readFileSync(new URL('../cloudflare-commerce/migrations/0003_edition_inventory.sql', import.meta.url), 'utf8'));
  return {
    sqlite,
    prepare(sql) { return { values: [], bind(...values) { this.values = values; return this; }, async first() { return sqlite.prepare(sql).get(...this.values) || null; }, async all() { return { results: sqlite.prepare(sql).all(...this.values) }; }, async run() { return sqlite.prepare(sql).run(...this.values); } }; },
    async batch(statements) { sqlite.exec('BEGIN'); try { const results = []; for (const statement of statements) results.push(await statement.run()); sqlite.exec('COMMIT'); return results; } catch (error) { sqlite.exec('ROLLBACK'); throw error; } },
  };
}

async function reserve(db, id, items) {
  db.sqlite.prepare('INSERT OR IGNORE INTO orders (id) VALUES (?)').run(id);
  return reserveEditionInventory(db, id, items);
}

test('all four size pools enforce their caps independently and keep AP separate', async () => {
  const db = database();
  try {
    const products = [...CHRONICLE_PRINT_PRODUCTS, ...LEGEND_PRINT_PRODUCTS];
    const item = product => ({ ...product, imageId: 'i-test', inventoryKey: `series:s-test:${product.seriesKey}:${product.productKey}`, editionBaselineSold: product.editionLimit - 1, quantity: 1 });
    await reserve(db, 'one', products.map(item));
    await reserve(db, 'one', products.map(item)); // capture retry is idempotent
    assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM edition_allocations').get().n, 4);
    await commitEditionReservations(db, 'one');
    await commitEditionReservations(db, 'one');
    for (const product of products) await assert.rejects(reserve(db, `over-${product.productKey}`, [item(product)]), /sold out|reserved/);
    const ap = { ...item(products[3]), inventoryKey: `${item(products[3]).inventoryKey}-ap`, editionLimit: 1, editionBaselineSold: 0 };
    await reserve(db, 'proof', [ap]);
    await assert.rejects(reserve(db, 'second-proof', [ap]), /sold out|reserved/);
    await releaseEditionReservations(db, 'proof');
    await reserve(db, 'released-proof', [ap]);
    const pools = db.sqlite.prepare('SELECT * FROM edition_inventory').all();
    assert.equal(pools.length, 5);
    assert.deepEqual(pools.filter(row => row.checkout_sold).map(row => row.edition_limit), [30, 20, 15, 5]);
  } finally { db.sqlite.close(); }
});

test('legacy shared sales block an unsafe switch to new size keys', async () => {
  const db = database();
  try {
    const legacy = { imageId: 'i-test', seriesKey: 'legend', inventoryKey: 'series:s-test:legend', editionLimit: 25, editionBaselineSold: 0, quantity: 1 };
    await reserve(db, 'legacy', [legacy]);
    await commitEditionReservations(db, 'legacy');
    await assert.rejects(reserve(db, 'new', [{ ...legacy, inventoryKey: 'series:s-test:legend:legend-40x60-cotton-rag', editionLimit: 5 }]), /reconciled by size/);
  } finally { db.sqlite.close(); }
});

async function verifier({ proofs = {}, excluded = [], sold = {} } = {}) {
  const registry = { images: { 'i-test': 's-test' }, series: { 's-test': { tiers: ['chronicle', 'legend'], excludeSizes: { legend: excluded }, editionData: { legend: { soldBySize: sold, artistProofsBySize: proofs } } } } };
  const { outputFiles } = await build({ entryPoints: ['src/lib/commerce/server/verifyCart.js'], bundle: true, write: false, platform: 'node', format: 'esm', plugins: [{ name: 'fixture-registry', setup(build) {
    build.onLoad({ filter: /seriesRegistry\.json$/ }, () => ({ contents: JSON.stringify(registry), loader: 'json' }));
    build.onLoad({ filter: /engrainedData\.json$/ }, () => ({ contents: JSON.stringify({ items: [{ id: 'i-wood', linkedImageId: 'i-test', visibility: 'show', price: '$900', imageSize: '20x24', editionSize: 5, inventory: {}, artistProof: proofs.engrained }] }), loader: 'json' }));
  } }] });
  return (await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`)).verifyCartItems;
}

test('server verifies independent size keys, sold baselines and disabled APs', async () => {
  const verify = await verifier({ sold: { '30" x 40"': 15, '40" x 60"': 0 } });
  assert.throws(() => verify([{ imageId: 'i-test', productKey: 'legend-30x40-cotton-rag', quantity: 1 }]), /remaining/);
  const [large] = verify([{ imageId: 'i-test', productKey: 'legend-40x60-cotton-rag', quantity: 1 }]);
  assert.equal(large.remaining, 5);
  assert.equal(large.editionBaselineSold, 0);
  assert.match(large.inventoryKey, /legend-40x60-cotton-rag$/);
  assert.throws(() => verify([{ imageId: 'i-test', productKey: 'legend-40x60-cotton-rag-ap', quantity: 1, price: 1, availableForSale: true }]), /unavailable|invalid/);
  assert.throws(() => verify([{ imageId: 'i-test', productKey: 'engrained-i-wood-ap', quantity: 1 }]), /unavailable|invalid/);
  const both = verify(CHRONICLE_PRINT_PRODUCTS.map(product => ({ imageId: 'i-test', productKey: product.productKey, quantity: 1 })));
  assert.notEqual(both[0].inventoryKey, both[1].inventoryKey);
});

test('released paper and Engrained APs use one-slot keys and authoritative prices', async () => {
  const proof = { printed: 1, sold: 0, availableForSale: true, price: 6000 };
  const verify = await verifier({ proofs: { '40" x 60"': proof, engrained: { ...proof, price: 1200 } } });
  const [ap] = verify([{ imageId: 'i-test', productKey: 'legend-40x60-cotton-rag-ap', quantity: 1, unitPrice: 1 }]);
  assert.equal(ap.unitPriceCents, 600000);
  assert.equal(ap.editionType, 'ap');
  assert.equal(ap.editionLimit, 1);
  assert.match(ap.inventoryKey, /-ap$/);
  assert.throws(() => verify([{ imageId: 'i-test', productKey: 'legend-40x60-cotton-rag-ap', quantity: 2 }]), /remaining/);
  const [wood] = verify([{ imageId: 'i-test', productKey: 'engrained-i-wood-ap', quantity: 1 }]);
  assert.equal(wood.inventoryKey, 'engrained:i-wood:ap');
  assert.equal(wood.unitPriceCents, 120000);
  const excluded = await verifier({ proofs: { '40" x 60"': proof }, excluded: ['40" x 60"'] });
  assert.throws(() => excluded([{ imageId: 'i-test', productKey: 'legend-40x60-cotton-rag-ap', quantity: 1 }]), /not available/);
});

test('seeded AP records are reserved once and unavailable for sale', () => {
  const registry = JSON.parse(fs.readFileSync(new URL('../src/data/seriesRegistry.json', import.meta.url), 'utf8'));
  for (const series of Object.values(registry.series)) for (const tier of series.tiers || []) if (PAPER_EDITION_LIMITS[tier]) {
    const proofs = getArtistProofs(tier, series.excludeSizes, series.editionData[tier]?.artistProofsBySize);
    for (const proof of Object.values(proofs)) { assert.equal(proof.reserved, 1); assert.equal(proof.availableForSale, false); }
  }
});

test('AP admin controls default off, validate release and save the explicit AP state', async () => {
  const { outputFiles } = await build({ stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import Controls from './src/components/ArtistProofControls.jsx'; createRoot(document.getElementById('app')).render(<Controls imageId="i-test" seriesKey="legend" size={'40" x 60"'} />);`, resolveDir: process.cwd(), loader: 'jsx' }, bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic' });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 900, height: 650 } });
    const requests = [];
    await page.route('https://edition.test/', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><main id="app"></main>' }));
    await page.route('**/.netlify/functions/seriesRegistry', route => { requests.push(route.request().postDataJSON()); return route.fulfill({ json: { ok: true } }); });
    await page.goto('https://edition.test/');
    await page.addScriptTag({ content: outputFiles[0].text });
    const release = page.getByRole('checkbox', { name: 'Available for sale' });
    await release.waitFor();
    assert.equal(await release.isChecked(), false);
    await release.check();
    await page.getByRole('button', { name: 'Save AP', exact: true }).click();
    await page.getByRole('alert').waitFor();
    assert.equal(requests.length, 0);
    await page.getByRole('spinbutton', { name: 'AP price' }).fill('6500');
    await page.getByRole('checkbox', { name: 'Printed', exact: true }).check();
    await page.getByRole('button', { name: 'Save AP', exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('button'));
    assert.equal(requests.length, 1);
    assert.equal(requests[0].action, 'setArtistProof');
    assert.equal(requests[0].data.proof.reserved, 1);
    assert.equal(requests[0].data.proof.availableForSale, true);
    assert.equal(requests[0].data.proof.price, 6500);
    assert.equal(requests[0].data.proof.printed, 1);
    await page.getByRole('checkbox', { name: 'Sold', exact: true }).check();
    assert.equal(await release.isChecked(), false);
    assert.equal(await release.isDisabled(), true);
  } finally { await browser.close(); }
});

test('inventory tracker falls back to deployed data and identifies numbered stock and APs', async () => {
  const { outputFiles } = await build({ stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import Tracker from './src/components/InventoryTrackerApp.jsx'; createRoot(document.getElementById('app')).render(<Tracker />);`, resolveDir: process.cwd(), loader: 'jsx' }, bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic' });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const registry = { series: { 's-test': { primaryImageId: 'i-test', title: 'Paper artwork', tiers: ['legend'], excludeSizes: { legend: ['40" x 60"'] }, editionData: { legend: { printedBySize: { '30" x 40"': 1 }, soldBySize: {}, artistProofsBySize: { '30" x 40"': { printed: 1, sold: 0 } } } } } } };
    const wood = { items: [{ id: 'i-wood', title: 'Wood artwork', imageSize: '20x24', inventory: { printed: 1, sold: 0 }, artistProof: { printed: 1, sold: 0 } }] };
    await page.route('https://inventory.test/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><main id="app"></main>' });
      if (path === '/data/seriesRegistry.json') return route.fulfill({ json: registry });
      if (path === '/data/engrainedData.json') return route.fulfill({ json: wood });
      return route.fulfill({ json: { state: { _meta: {} }, series: {}, items: [] } });
    });
    await page.goto('https://inventory.test/');
    await page.addScriptTag({ content: outputFiles[0].text });
    await page.getByRole('heading', { name: 'Paper artwork', exact: true }).waitFor();
    assert.equal(await page.getByText('Edition of 15 + 1 AP', { exact: true }).count(), 1);
    await page.getByRole('button', { name: /In Stock/ }).click();
    assert.equal(await page.getByText('Artist’s Proof · 1 of 1', { exact: true }).count(), 2);
    assert.equal(await page.getByRole('heading', { name: 'Wood artwork', exact: true }).count(), 2);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
