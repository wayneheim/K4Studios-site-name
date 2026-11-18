import assert from 'node:assert/strict';
import worker from '../k4-image-proxy.js';
import { isRotatingProxyCrawler, isRotatingProxyCrawlRequest } from '../src/shared/rotating-proxy-crawl.js';
import { shouldPersistAnalyticsEvent } from '../src/shared/analytics-write-gate.js';
import { buildV3RollupBatch } from '../src/analytics/v3/model.js';

const ua = 'Mozilla/5.0 Chrome/119.0.0.0 Safari/537.36';
const ip = '2a10:4a03:97ca:223b:90b:58ad:f77b:413d';
const request = (path, address = ip, browser = ua, verifiedBot = false) => {
  const req = new Request(`https://www.k4studios.com${path}`, {
    headers: { 'CF-Connecting-IP': address, 'User-Agent': browser, Cookie: 'k4_activity_ok=1' },
  });
  Object.defineProperty(req, 'cf', { value: { country: 'US', continent: 'NA', botManagement: { verifiedBot } } });
  return req;
};
assert.equal(isRotatingProxyCrawler({ ip: ip.toUpperCase(), ua }), true);
assert.equal(isRotatingProxyCrawler({ ip_hash: '2a10:7b07::1', ua: 'Firefox/120.0' }), true);
assert.equal(isRotatingProxyCrawler({ ip: '2a13:f43:f04b:8b2e:4350:f1d1:6b3a:409f', ua: 'Firefox/120.0' }), true);
assert.equal(isRotatingProxyCrawler({ ip: '2A13:0F47::1', ua }), true);
for (const address of ['2a10:4a08::1', '2a10:7b08::1', '2a10:4aff::1', '2a13:f48::1', '2a13:f3f::1', '86.241.225.92', '198.51.100.10']) {
  assert.equal(isRotatingProxyCrawlRequest(request('/', address)), false);
  assert.equal(shouldPersistAnalyticsEvent(request('/', address), 'page_view'), true);
}
assert.equal(isRotatingProxyCrawlRequest(request('/', ip, ua.replace('119.', '157.'))), false);
assert.equal(isRotatingProxyCrawlRequest(request('/', '2a13:f43::1', ua.replace('119.', '157.'))), false);
assert.equal(isRotatingProxyCrawlRequest(request('/', '2a13:f43::1', ua, true)), false);
assert.equal(isRotatingProxyCrawlRequest(request('/', ip, ua, true)), false);
for (const event of ['page_view', 'chapter_view', 'native_order_complete', 'image_proxy_fetch']) {
  assert.equal(shouldPersistAnalyticsEvent(request('/'), event), false);
}
const row = { id: 1, ts: '2026-11-17 10:12:25', ip, ua, source: 'js',
  session_id: 'crawl-session', visitor_id: 'crawl-visitor', page: '/Blog/test', event_type: 'page_view' };
const batch = buildV3RollupBatch([row, { ...row, id: 2, event_type: 'chapter_view', target_id: 'i-test' },
  { ...row, id: 3, event_type: 'page_engagement' }]);
assert.equal(batch.lastRawEventId, 3, 'Excluded events must still advance the cursor');
for (const field of ['daily', 'dimensions', 'sessions', 'visitors', 'images', 'imageGeography']) {
  assert.equal(batch[field].length, 0, `Crawler must not create ${field}`);
}
const franceBatch = buildV3RollupBatch([
  { ...row, ip: '2a13:f43::1', ua: 'Firefox/120.0' },
  { ...row, id: 2, ip: '86.241.225.92', ua: 'Firefox/160.0', visitor_id: 'other-france-visitor', session_id: 'other-france-session' },
]);
assert.deepEqual(franceBatch.visitors.map(r => r.visitorId), ['other-france-visitor']);
const originalFetch = globalThis.fetch;
let originFetches = 0;
globalThis.fetch = async () => { originFetches++; return new Response('origin'); };
try {
  for (const path of ['/', '/Galleries/Fine-Art-Photography/Portraits/Black-White/i-test', '/img/i-test/l', '/__k4e']) {
    const response = await worker.fetch(request(path), {}, { waitUntil() {} });
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('X-K4-Block'), 'rotating-proxy-crawl');
    assert.match(response.headers.get('Cache-Control'), /no-store/);
  }
  assert.equal(originFetches, 0, 'Blocked requests must never reach the origin');
  const paris = await worker.fetch(request('/Blog/off-the-paper', '2a13:f43::1', 'Firefox/120.0'), {}, { waitUntil() {} });
  assert.equal(paris.status, 403);
} finally { globalThis.fetch = originalFetch; }
console.log('rotating proxy crawl: access, ingestion, rollup, and scope checks passed');
