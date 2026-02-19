// Geo parsing functions extracted from k4-image-proxy.js
// Phase 1 Step 1 - Placeholder for future geo utilities

// Currently geo data comes from request.cf (Cloudflare-provided)
// This module will hold any geo parsing/normalization logic

export function getGeoFromRequest(request) {
  return {
    country: request.cf?.country || null,
    region: request.cf?.region || null,
    city: request.cf?.city || null,
    asn: request.cf?.asn || null,
  };
}
