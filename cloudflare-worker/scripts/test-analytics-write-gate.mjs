import assert from 'node:assert/strict';
import {
  isCommerceAnalyticsEvent,
  shouldPersistAnalyticsEvent,
} from '../src/shared/analytics-write-gate.js';

const request = (country, continent, asn = 64512) => ({
  cf: { country, continent, asn },
});

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
assert.equal(isCommerceAnalyticsEvent('native_order_complete'), true);
assert.equal(isCommerceAnalyticsEvent('gallery_view'), false);

console.log('analytics write gate: all assertions passed');

