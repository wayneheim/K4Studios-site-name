import assert from 'node:assert/strict';
import {
  isCommerceAnalyticsEvent,
  isCoordinatedProxyCrawlRequest,
  shouldPersistAnalyticsEvent,
} from '../src/shared/analytics-write-gate.js';

const request = (country, continent, asn = 64512, ip = '', headers = {}, verifiedBot = false) => ({
  url: 'https://www.k4studios.com/Galleries/Fine-Art-Photography/Portraits/Black-White/i-example',
  cf: { country, continent, asn, botManagement: { verifiedBot } },
  headers: new Headers({ ...(ip ? { 'CF-Connecting-IP': ip } : {}), ...headers }),
});

const crawlHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Referer: 'https://www.k4studios.com/',
};
const crawlContext = {
  pagePath: '/Galleries/Fine-Art-Photography/Portraits/Black-White/i-example',
  entryReferrer: 'https://www.k4studios.com/',
};

assert.equal(shouldPersistAnalyticsEvent(request('US', 'NA', 64512, '184.56.48.57'), 'page_view'), false);
assert.equal(shouldPersistAnalyticsEvent(request('US', 'NA', 64512, '184.56.48.57'), 'order_submitted'), false);
assert.equal(shouldPersistAnalyticsEvent(request('US', 'NA', 214483), 'page_view'), false);
assert.equal(shouldPersistAnalyticsEvent(request('US', 'NA', 62610), 'order_submitted'), false);
assert.equal(shouldPersistAnalyticsEvent(request('US', 'NA'), 'page_view'), true);
assert.equal(shouldPersistAnalyticsEvent(request('CA', 'NA'), 'chapter_view'), true);
assert.equal(shouldPersistAnalyticsEvent(request('DE', 'EU'), 'page_view'), true);
assert.equal(shouldPersistAnalyticsEvent(request('GB', ''), 'page_view'), true);
assert.equal(shouldPersistAnalyticsEvent(request('AU', 'OC'), 'page_view'), true);
assert.equal(shouldPersistAnalyticsEvent(request('PK', 'AS'), 'page_view'), false);
assert.equal(shouldPersistAnalyticsEvent(request('PK', 'AS'), 'order_submitted'), true);
assert.equal(shouldPersistAnalyticsEvent({}, 'page_view'), true);
assert.equal(isCoordinatedProxyCrawlRequest(request('AL', 'EU', 21183, '', crawlHeaders), crawlContext), true);
assert.equal(shouldPersistAnalyticsEvent(request('UA', 'EU', 42530, '', crawlHeaders), 'page_view', crawlContext), false);
assert.equal(shouldPersistAnalyticsEvent(request('UA', 'EU', 42530, '', crawlHeaders), 'order_submitted', crawlContext), true);
assert.equal(shouldPersistAnalyticsEvent(request('GB', 'EU', 64512, '', crawlHeaders), 'page_view', crawlContext), true);
assert.equal(shouldPersistAnalyticsEvent(request('AL', 'EU', 21183, '', crawlHeaders, true), 'page_view', crawlContext), true);
assert.equal(shouldPersistAnalyticsEvent(request('AL', 'EU', 21183, '', {
  ...crawlHeaders,
  Cookie: 'k4_activity_ok=1',
}), 'page_view', crawlContext), true);
assert.equal(shouldPersistAnalyticsEvent(request('AL', 'EU', 21183, '', {
  ...crawlHeaders,
  'User-Agent': crawlHeaders['User-Agent'].replace('Chrome/120.', 'Chrome/157.'),
}), 'page_view', crawlContext), true);
assert.equal(shouldPersistAnalyticsEvent(request('AL', 'EU', 21183, '', crawlHeaders), 'page_view', {
  ...crawlContext,
  entryReferrer: 'https://www.google.com/',
}), true);
assert.equal(shouldPersistAnalyticsEvent(request('AL', 'EU', 21183, '', crawlHeaders), 'page_view', {
  ...crawlContext,
  utmSource: 'newsletter',
}), true);
assert.equal(isCommerceAnalyticsEvent('native_order_complete'), true);
assert.equal(isCommerceAnalyticsEvent('gallery_view'), false);

console.log('analytics write gate: all assertions passed');

