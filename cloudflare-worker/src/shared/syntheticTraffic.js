// Synthetic traffic detection extracted from k4-image-proxy.js
// Phase 1 Step 1 - Zero logic changes

import { DATACENTER_CITIES, DATACENTER_ASNS } from './constants.js';

/**
 * Shared ingestion gate: detect synthetic/bot traffic
 * Used by both /track and /log-art-view endpoints
 */
export function isSyntheticTraffic(request) {
  // 1) Datacenter city hard block
  const city = request.cf?.city;
  if (city && DATACENTER_CITIES.includes(city)) {
    return true;
  }
  
  // 2) ASN-based datacenter block
  const asn = request.cf?.asn;
  if (asn && DATACENTER_ASNS.includes(asn)) {
    return true;
  }
  
  // 3) Headless browser / bot UA detection
  const ua = (request.headers.get("User-Agent") || "").toLowerCase();
  if (
    ua.includes('headless') ||
    ua.includes('chrome-lighthouse') ||
    ua.includes('phantomjs') ||
    ua.includes('puppeteer') ||
    ua.includes('selenium') ||
    ua.includes('webdriver') ||
    /\bcurl\b/.test(ua) ||
    /\bbot\b/.test(ua) ||
    /\bspider\b/.test(ua) ||
    /\bcrawler\b/.test(ua) ||
    ua === '' ||
    ua === 'unknown'
  ) {
    return true;
  }
  
  return false;
}

