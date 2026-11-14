// Keep routine analytics useful without letting low-value or automated traffic
// consume the D1 write allowance. This gate must run before every analytics
// write; it does not block the underlying site or image response.

export const ANALYTICS_DENIED_ASNS = Object.freeze([
  214483, // FiberPower / anonymizer and proxy infrastructure
  62610,  // Zenlayer hosting/proxy infrastructure
]);

const DENIED_ASNS = new Set(ANALYTICS_DENIED_ASNS);
const DENIED_IPS = new Set([
  '184.56.48.57', // Owner traffic
]);
const DIRECT_MARKET_COUNTRIES = new Set(['US', 'CA', 'GB', 'AU', 'NZ']);

// Coordinated proxy crawls observed in November 2026 used fresh identities from
// many countries, claimed the home page as their referrer, entered one deep
// content page, and rotated a small set of frozen browser fingerprints. Keep
// this deliberately narrow: geography alone must never suppress a visitor.
const COORDINATED_CRAWL_CHROME_MAJORS = new Set([118, 119, 120]);
const COORDINATED_CRAWL_FIREFOX_MAJORS = new Set([121]);
const DEEP_CONTENT_PATH = /^\/(?:Galleries|Other)\//i;

// These are analytics events only. The commerce service remains authoritative
// for carts, checkout, payment, and orders.
const COMMERCE_EVENT_TYPES = new Set([
  'order_clicked',
  'order_submitted',
  'order_smugmug_clicked',
  'order_email_clicked',
  'pricing_open',
  'native_cart_add',
  'native_cart_view',
  'native_checkout_start',
  'native_checkout_quote',
  'native_payment_start',
  'native_order_complete',
]);

export function isCommerceAnalyticsEvent(eventType) {
  return COMMERCE_EVENT_TYPES.has(String(eventType || '').trim().toLowerCase());
}

function headerValue(request, name) {
  return String(request?.headers?.get?.(name) || '').trim();
}

function isHomePageReferrer(value) {
  if (!value) return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return (host === 'k4studios.com' || host === 'www.k4studios.com')
      && (url.pathname === '/' || url.pathname === '')
      && !url.search;
  } catch (_) {
    return false;
  }
}

function hasObservedFrozenBrowserFingerprint(userAgent) {
  const ua = String(userAgent || '');
  const chromeMajor = Number(ua.match(/\bChrome\/(\d+)\./i)?.[1] || 0);
  const firefoxMajor = Number(ua.match(/\bFirefox\/(\d+)\./i)?.[1] || 0);
  return COORDINATED_CRAWL_CHROME_MAJORS.has(chromeMajor)
    || COORDINATED_CRAWL_FIREFOX_MAJORS.has(firefoxMajor);
}

export function isCoordinatedProxyCrawlRequest(request, context = {}) {
  if (request?.cf?.botManagement?.verifiedBot) return false;
  if (headerValue(request, 'Cookie').split(';').some((part) => part.trim() === 'k4_activity_ok=1')) {
    return false;
  }

  const country = String(request?.cf?.country || '').toUpperCase();
  if (!country || DIRECT_MARKET_COUNTRIES.has(country)) return false;

  const userAgent = context.userAgent || headerValue(request, 'User-Agent');
  if (!hasObservedFrozenBrowserFingerprint(userAgent)) return false;

  const entryReferrer = context.entryReferrer
    || context.referrer
    || headerValue(request, 'Referer');
  if (!isHomePageReferrer(entryReferrer)) return false;

  let pagePath = String(context.pagePath || '').trim();
  if (!pagePath && request?.url) {
    try {
      pagePath = new URL(request.url).pathname;
    } catch (_) {
      pagePath = '';
    }
  }

  const isDeepContent = DEEP_CONTENT_PATH.test(pagePath)
    || pagePath === '/women-of-the-wild-west';
  if (!isDeepContent) return false;

  // Paid/social campaign parameters are evidence against this observed crawl.
  if (context.utmSource || context.utmMedium || context.utmCampaign) return false;

  return true;
}

export function shouldPersistAnalyticsEvent(request, eventType = null, context = {}) {
  const sourceIp = String(request?.headers?.get?.('CF-Connecting-IP') || '').trim();
  if (sourceIp && DENIED_IPS.has(sourceIp)) return false;

  const asn = Number(request?.cf?.asn || 0);
  if (asn && DENIED_ASNS.has(asn)) return false;

  // Preserve high-intent commerce telemetry worldwide, while still refusing
  // confirmed abusive proxy networks above.
  if (isCommerceAnalyticsEvent(eventType)) return true;

  if (isCoordinatedProxyCrawlRequest(request, context)) return false;

  const country = String(request?.cf?.country || '').toUpperCase();
  const continent = String(request?.cf?.continent || '').toUpperCase();

  // Local development and non-Cloudflare unit tests have no request.cf geo.
  if (!country && !continent) return true;

  return continent === 'EU' || DIRECT_MARKET_COUNTRIES.has(country);
}

