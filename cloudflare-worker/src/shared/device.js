// Device detection functions extracted from k4-image-proxy.js
// Phase 1 Step 1 - Zero logic changes

/**
 * Detect device/platform from User-Agent string
 * @param {string} ua - User-Agent header value
 * @returns {string} - Device type: ios, android, mac, windows, linux, or unknown
 */
export function detectDevice(ua) {
  if (!ua) return 'unknown';
  const lower = ua.toLowerCase();
  
  if (lower.includes('iphone') || lower.includes('ipad')) {
    return 'ios';
  } else if (lower.includes('android')) {
    return 'android';
  } else if (lower.includes('macintosh') || lower.includes('mac os')) {
    return 'mac';
  } else if (lower.includes('windows')) {
    return 'windows';
  } else if (lower.includes('linux')) {
    return 'linux';
  }
  
  return 'unknown';
}
