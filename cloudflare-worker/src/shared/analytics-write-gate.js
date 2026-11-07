// Keep routine analytics useful without letting low-value or automated traffic
// consume the D1 write allowance. This gate must run before every analytics
// write; it does not block the underlying site or image response.

export const ANALYTICS_DENIED_ASNS = Object.freeze([
  214483, // FiberPower / anonymizer and proxy infrastructure
  62610,  // Zenlayer hosting/proxy infrastructure
]);

const DENIED_ASNS = new Set(ANALYTICS_DENIED_ASNS);
const DIRECT_MARKET_COUNTRIES = new Set(['US', 'CA', 'GB', 'AU', 'NZ']);

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

export function shouldPersistAnalyticsEvent(request, eventType = null) {
  const asn = Number(request?.cf?.asn || 0);
  if (asn && DENIED_ASNS.has(asn)) return false;

  // Preserve high-intent commerce telemetry worldwide, while still refusing
  // confirmed abusive proxy networks above.
  if (isCommerceAnalyticsEvent(eventType)) return true;

  const country = String(request?.cf?.country || '').toUpperCase();
  const continent = String(request?.cf?.continent || '').toUpperCase();

  // Local development and non-Cloudflare unit tests have no request.cf geo.
  if (!country && !continent) return true;

  return continent === 'EU' || DIRECT_MARKET_COUNTRIES.has(country);
}

