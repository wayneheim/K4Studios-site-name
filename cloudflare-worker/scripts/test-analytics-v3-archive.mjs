import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildV3RollupBatch, getV3DeviceLabel, isV3CoreEvent, summarizeV3Rollup } from '../src/analytics/v3/model.js';
import { renderDashboardV3 } from '../src/analytics/v3/renderer.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const archiveDir = path.resolve(here, '../d1-backups/purge-candidates-20260624-retention45-r2/raw_events');
const requestedDays = Math.max(1, Math.min(Number(process.argv.find((arg) => arg.startsWith('--days='))?.split('=')[1] || 7), 49));
const files = (await readdir(archiveDir)).filter((name) => name.endsWith('.json')).sort().slice(-requestedDays);
const rows = [];

for (const file of files) {
  const payload = JSON.parse(await readFile(path.join(archiveDir, file), 'utf8'));
  for (const result of payload) rows.push(...(result?.results || []));
}

const browserRow = rows.find((row) => isV3CoreEvent(row));
assert.ok(browserRow, 'archive must contain a confirmed browser row for order-action fixtures');
const hostRoyaleAutomationRow = {
  ...browserRow,
  cf_asn: 207990,
  ip: '119.12.207.126',
  ip_hash: '119.12.207.126'
};
const paloAltoCrawlerRow = {
  ...browserRow,
  cf_asn: 3356,
  ip: '205.169.39.57',
  ip_hash: '205.169.39.57'
};
const ordinaryLevel3Row = {
  ...browserRow,
  cf_asn: 3356,
  ip: '4.1.2.3',
  ip_hash: '4.1.2.3'
};
assert.equal(isV3CoreEvent(hostRoyaleAutomationRow), false, 'HostRoyale AS207990 automation must stay out of core metrics');
assert.equal(isV3CoreEvent(paloAltoCrawlerRow), false, 'Palo Alto 205.169.39.0/24 crawler traffic must stay out of core metrics');
assert.equal(isV3CoreEvent(ordinaryLevel3Row), true, 'the rest of AS3356 must remain eligible for core metrics');
for (const datacenterAsn of [9009, 18779, 30058, 44486, 396362]) {
  assert.equal(
    isV3CoreEvent({ ...browserRow, cf_asn: datacenterAsn }),
    false,
    `confirmed hosting ASN ${datacenterAsn} must stay out of core metrics`
  );
}
const fixtureImageId = 'i-orderTrackingTest';
const fixturePage = `/Galleries/Test/${fixtureImageId}`;
const expeditionPage = '/Other/Expeditions/echoes-of-the-west-2026';
const nextId = Math.max(...rows.map((row) => Number(row?.id || 0))) + 1;
rows.push(
  { ...browserRow, id: nextId, event_type: 'order_smugmug_clicked', target_id: fixtureImageId, page: fixturePage },
  { ...browserRow, id: nextId + 1, event_type: 'order_email_clicked', target_id: fixtureImageId, page: fixturePage },
  { ...browserRow, id: nextId + 2, event_type: 'grid_image_click', target_id: 'i-expeditionTest', page: expeditionPage },
  { ...browserRow, id: nextId + 3, event_type: 'nav_next', target_id: 'i-expeditionTest2', page: expeditionPage },
  { ...browserRow, id: nextId + 4, event_type: 'slideshow_start', target_id: 'i-expeditionTest2', page: expeditionPage },
  { ...browserRow, id: nextId + 5, event_type: 'slideshow_nav_next', target_id: 'i-expeditionTest3', page: expeditionPage },
  { ...browserRow, id: nextId + 6, event_type: 'order_smugmug_clicked', target_id: 'i-expeditionTest3', page: expeditionPage },
  { ...browserRow, id: nextId + 7, event_type: 'grid_show_more', target_id: null, page: expeditionPage }
);

const imageOnlyVisitorId = 'visitor-image-only-geo-fallback';
const imageOnlyRow = {
  ...browserRow,
  id: nextId + 8,
  event_type: 'chapter_view',
  target_id: 'i-imageOnlyGeoTest',
  page: '/Galleries/Test/i-imageOnlyGeoTest',
  session_id: 'session-image-only-geo-fallback',
  visitor_id: imageOnlyVisitorId,
  city: 'Kent',
  region: 'Ohio',
  country: 'US'
};
rows.push(imageOnlyRow);
rows.push(
  { ...browserRow, id: nextId + 9, event_type: 'native_cart_add' },
  { ...browserRow, id: nextId + 10, event_type: 'native_cart_view', page: '/cart' },
  { ...browserRow, id: nextId + 11, event_type: 'native_checkout_start', page: '/cart' },
  { ...browserRow, id: nextId + 12, event_type: 'native_checkout_quote', page: '/cart' },
  { ...browserRow, id: nextId + 13, event_type: 'native_payment_start', page: '/cart' },
  { ...browserRow, id: nextId + 14, event_type: 'native_order_complete', page: '/cart' }
);
rows.push(
  { ...browserRow, id: nextId + 15, event_type: 'cowboy_jump', target_id: 'Cowboy_Jump_Home', page: '/' },
  { ...browserRow, id: nextId + 16, event_type: 'picture_shows_jump', target_id: 'Picture_Shows_Widget_Home', page: '/' }
);

const rollup = buildV3RollupBatch(rows);
const summary = summarizeV3Rollup(rollup, `${files.length}-day archived sample`);
const imageOnlySummary = summarizeV3Rollup(buildV3RollupBatch([imageOnlyRow]), 'Image-only fallback');
const latePageRow = {
  ...imageOnlyRow,
  id: imageOnlyRow.id + 1,
  event_type: 'page_view',
  page: '/',
  entry_referrer: 'https://www.google.com/',
  referer: 'https://www.google.com/'
};
const latePageRollup = buildV3RollupBatch([imageOnlyRow, latePageRow]);
const latePageSession = latePageRollup.sessions[0];
const html = renderDashboardV3({ summary });
const groupedGeoHtml = renderDashboardV3({ summary: {
  ...summary,
  topImages: [
    { imageId: 'i-ukraineFirstFromQuery', pagePath: '/art/i-ukraineFirstFromQuery', count: 1, dominantGeo: 'Cherkasy, Cherkasy, UA', dominantGeoViews: 1 },
    { imageId: 'i-usMustRenderFirst', pagePath: '/art/i-usMustRenderFirst', count: 1, dominantGeo: 'Kent, Ohio, US', dominantGeoViews: 1 }
  ],
  visitorGeography: [
    { label: 'Toronto, Ontario, CA', count: 3 },
    { label: 'Austin, Texas, US', count: 4 },
    { label: 'Columbus, Ohio', count: 7 },
    { label: 'Cleveland, Ohio, US', count: 2 }
  ],
  imageGeography: [
    { label: 'Berlin, Berlin, DE', count: 2, imageViews: 8 },
    { label: 'Austin, Texas, US', count: 3, imageViews: 9 }
  ]
} });
let incrementalRollupWrites = 2; // acquire and release the update lock
for (let index = 0; index < rows.length; index += 250) {
  const batch = buildV3RollupBatch(rows.slice(index, index + 250));
  incrementalRollupWrites += batch.daily.length + batch.dimensions.length
    + batch.sessions.length + batch.images.length + batch.imageGeography.length + 1; // cursor
}
incrementalRollupWrites += rollup.visitors.length;

assert.ok(rows.length > 0, 'archive must contain rows');
assert.ok(rollup.accepted > 0, 'archive must contain confirmed core events');
assert.ok(rollup.accepted < rollup.scanned, 'diagnostic and pixel rows must stay out of the core population');
assert.ok(summary.counts.sessions > 0, 'archive should produce confirmed sessions');
assert.ok(summary.counts.page_views > 0, 'archive should produce page views');
assert.ok(summary.entryPages.length > 0, 'archive should produce entry pages');
assert.ok(summary.visitorGeography.length > 0, 'archive should produce visitor geography');
assert.ok(summary.siteDevices.length > 0, 'archive should produce site visitor devices');
assert.ok(summary.imageDevices.length > 0, 'archive should produce image viewer devices');
assert.equal(getV3DeviceLabel('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)'), 'Apple mobile');
assert.equal(getV3DeviceLabel('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/17 Mobile/15E148 Safari/604.1'), 'Apple mobile');
assert.equal(getV3DeviceLabel('Mozilla/5.0 (Linux; Android 14)'), 'Android');
assert.equal(getV3DeviceLabel('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'), 'Windows');
assert.equal(getV3DeviceLabel('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'), 'Mac');
assert.ok(imageOnlySummary.visitorGeography.some((row) => row.label === 'Kent, Ohio, US'), 'image-only sessions should fall back into visitor geography');
assert.ok(imageOnlySummary.entryPages.some((row) => row.label === '/Galleries/Test/i-imageOnlyGeoTest'), 'image-only sessions should fall back into entry pages');
assert.ok(imageOnlySummary.acquisition.some((row) => row.label === 'Direct / internal'), 'image-only sessions should retain fallback acquisition');
assert.equal(imageOnlySummary.counts.page_views, 1, 'an image-only entry should contribute one provisional page load');
assert.equal(latePageSession.entryIsImageFallback, 0, 'a later real page view should replace provisional entry facts');
assert.equal(latePageSession.pageViewCount, 1, 'a later real page view should be counted exactly once');
assert.equal(latePageSession.landingPage, '/', 'a later real page view should replace the provisional landing page');
assert.equal(latePageSession.entrySource, 'Google', 'a later real page view should replace provisional acquisition');
assert.ok(summary.imageGeography.length > 0, 'archive should produce image-viewer geography');
assert.ok(summary.imageGeography.some((row) => row.imageViews > 0), 'image geography should include view totals');
assert.ok(summary.topImages.some((row) => row.pagePath), 'image rows should retain clickable page paths');
assert.ok(summary.topImages.some((row) => row.dominantGeo && row.dominantGeoViews > 0), 'image rows should retain their dominant viewer geography');
assert.ok(html.includes('pricing-opened'), 'priced images should restore the green V2 highlight');
assert.ok(html.includes('image-geo-us') && html.includes('Top area:'), 'US-dominant image rows should use the matching geography accent');
assert.ok(html.includes('class="image-geo-bar"') && html.includes('Top viewer city:'), 'the wider geography bar should expose its dominant city on hover');
assert.equal(summary.counts.smugmug_clicks, 2, 'SmugMug order clicks should roll up separately');
assert.equal(summary.counts.email_clicks, 1, 'email order clicks should roll up separately');
assert.ok(!summary.actions.some((row) => row.label === 'Order clicked — SmugMug'), 'retired SmugMug clicks should not appear in Actions');
assert.ok(!summary.actions.some((row) => row.label === 'Order clicked — email'), 'retired email clicks should not appear in Actions');
assert.ok(!html.includes('SmugMug: 1') && !html.includes('Email: 1'), 'image rows should hide retired order-destination badges');
assert.ok(summary.actions.some((row) => row.label === 'Slideshow image advance' && row.count === 1), 'slideshow advances should appear in Actions');
assert.ok(summary.expeditionActions.some((row) => row.label === 'Echoes of the West 2026 | Photograph opened' && row.count === 1), 'Expedition photo opens should be reported by gallery');
assert.ok(summary.expeditionActions.some((row) => row.label === 'Echoes of the West 2026 | Order Prints clicked' && row.count === 1), 'Expedition order clicks should be reported by gallery');
assert.ok(summary.expeditionActions.some((row) => row.label === 'Echoes of the West 2026 | Slideshow auto-advance' && row.count === 1), 'Expedition slideshow advances should be reported by gallery');
assert.ok(html.includes('Expedition activity'), 'dashboard should render the Expedition activity panel');
assert.ok(html.includes('Site visitor devices') && html.includes('Image viewer devices'), 'dashboard should render both device panels');
assert.ok(html.includes('<th>Share</th>') && html.includes('device-icon'), 'device panels should show compact icons and percentages');
assert.ok(html.indexOf('Site visitor devices') < html.indexOf('Top 25 entry pages'), 'device panels should render at the top of the report grid');
assert.ok(html.includes('Top 10 Entry Navigation'), 'dashboard should render entry navigation progression');
assert.ok(html.includes('Shopping cart funnel'), 'dashboard should render the native shopping cart funnel');
assert.ok(!html.includes('SmugMug order clicks'), 'dashboard should not render the retired SmugMug order metric');
assert.ok(!html.includes('Email order clicks'), 'dashboard should not render the retired email-order metric');
assert.ok(html.includes('card pricing-opened'), 'pricing opens card should use the same green highlight as priced image rows');
assert.ok(summary.counts.cowboy_widget_clicks >= 1, 'cowboy widget clicks should roll up independently');
assert.ok(summary.counts.picture_shows_widget_clicks >= 1, 'Picture Shows widget clicks should roll up independently');
assert.ok(html.includes('Homepage widget clicks') && html.includes('Cowboy widget clicks') && html.includes('Picture Show widget clicks'), 'dashboard should render both click counts in one homepage-widget panel');
assert.ok(html.indexOf('Homepage widget clicks') < html.indexOf('Expedition activity'), 'homepage widget clicks should render above Expedition activity');
assert.deepEqual(summary.cartFunnel.map((row) => row.count), [1, 1, 1, 1, 1, 1], 'native cart funnel steps should roll up in order');
assert.ok(html.includes('entry-site-stack') && html.indexOf('Top 10 Entry Navigation') < html.indexOf('Top 10 site pages'), 'entry navigation should stack above site pages in the right column');
assert.ok(html.includes('accent-entry') && html.includes('accent-site'), 'entry and site panels should use distinct header accents');
assert.ok(summary.entryNavigation.length > 0 && summary.entryNavigation.length <= 10, 'entry navigation should contain at most ten entry pages');
assert.ok(html.includes('continued-col') && html.includes('chapter-col'), 'entry navigation should reserve fixed space for percentage columns');
assert.ok(html.includes('title="/Galleries/Painterly-Fine-Art-Photography/Facing-History/'), 'truncated entry navigation labels should retain their full path tooltip');
assert.ok(html.includes('class="device-section"') && html.includes('device-windows') && html.includes('device-android'), 'device panels should be grouped and color coded');
assert.ok(html.includes('">/Facing-History/'), 'Facing History page labels should omit the common gallery prefix');
assert.ok(html.includes('">/Fine-Art/'), 'standard gallery page labels should use a compact prefix');
assert.ok(html.includes('class="page-link" href="https://www.k4studios.com/" target="_blank" rel="noopener noreferrer"'), 'entry and site page rows should link to K4 in a new tab');
assert.ok(html.includes("font:15px/1.45 'Glegoo',serif"), 'dashboard should use the K4 Glegoo typeface');
assert.ok(!html.includes('harvester_friction'), 'diagnostic data must not be embedded in the initial report');
assert.ok(html.includes('Load diagnostics'), 'manual diagnostic gate must be present');
assert.ok(html.includes('Update with new rows'), 'cursor update control must be present');
assert.ok(groupedGeoHtml.indexOf('United States') < groupedGeoHtml.indexOf('Canada'), 'US geography should render before other countries');
assert.ok(groupedGeoHtml.indexOf('>Ohio <span class="geo-group-total">') < groupedGeoHtml.indexOf('>Texas <span class="geo-group-total">'), 'US states should be grouped and ordered by visitor total');
assert.ok(groupedGeoHtml.includes('geo-us') && groupedGeoHtml.includes('--state-color:'), 'US state rows should receive deterministic color accents');
assert.ok(groupedGeoHtml.includes('geo-international'), 'non-US rows should use the neutral international style');
assert.ok(groupedGeoHtml.indexOf('i-usMustRenderFirst') < groupedGeoHtml.indexOf('i-ukraineFirstFromQuery'), 'US image rows should render before international image rows');
assert.ok(groupedGeoHtml.includes('United States <span class="geo-group-total">3 viewers · 9 images</span>'), 'country totals should be clearly labeled outside the additive numeric columns');

console.log(JSON.stringify({ files, rollupRows: {
  daily: rollup.daily.length, sessions: rollup.sessions.length,
  visitors: rollup.visitors.length, dimensions: rollup.dimensions.length, images: rollup.images.length,
  imageGeography: rollup.imageGeography.length,
  estimatedIncrementalWrites: incrementalRollupWrites,
  writesPerScannedRawRow: Number((incrementalRollupWrites / rollup.scanned).toFixed(3))
}, ...summary }, null, 2));
