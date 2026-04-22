import nodemailer from 'nodemailer';
import fetch from 'node-fetch';

const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbzyCEvOy7f4sfePpdnNjRLy3HosBoJEUcPcG0bQiFAx8AtvkKxO8_KUrY-3eNZF300/exec';
const ALLOWED_HOSTS = new Set([
  'www.k4studios.com',
  'k4studios.com',
  'localhost',
  '127.0.0.1',
]);
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const EMAIL_DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;
const recentRequestsByIp = new Map();
const recentEmailNotifications = new Map();

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    body: JSON.stringify(payload),
  };
}

function getHeader(headers, name) {
  if (!headers || typeof headers !== 'object') return '';

  const headerName = name.toLowerCase();

  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === headerName) {
      return Array.isArray(value) ? String(value[0] || '') : String(value || '');
    }
  }

  return '';
}

function sanitizeText(value, maxLength = 160) {
  if (typeof value !== 'string') return '';

  const cleaned = value
    .normalize('NFKC')
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u001F\u007F]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned.slice(0, maxLength);
}

function isAllowedHost(hostname) {
  return ALLOWED_HOSTS.has(String(hostname || '').toLowerCase());
}

function isAllowedProtocol(protocol, hostname) {
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return protocol === 'http:' || protocol === 'https:';
  }

  return protocol === 'https:';
}

function isBlockedPath(pathname) {
  if (!pathname) return false;

  return (
    pathname === '/.netlify' ||
    pathname.startsWith('/.netlify/') ||
    pathname.startsWith('/__k4') ||
    pathname === '/_state' ||
    pathname.startsWith('/_state/') ||
    pathname === '/edge-event' ||
    pathname.startsWith('/edge-event/') ||
    pathname === '/_astro' ||
    pathname.startsWith('/_astro/')
  );
}

function normalizePage(value) {
  if (typeof value !== 'string' || value.length > 2048) {
    return null;
  }

  const raw = value.trim();
  if (!raw) return null;

  try {
    const parsed = raw.startsWith('/')
      ? new URL(raw, 'https://www.k4studios.com')
      : new URL(raw);

    const hostname = parsed.hostname.toLowerCase();

    if (!isAllowedHost(hostname) || !isAllowedProtocol(parsed.protocol, hostname)) {
      return null;
    }

    if (isBlockedPath(parsed.pathname || '/')) {
      return null;
    }

    parsed.hash = '';

    if (hostname === 'k4studios.com') {
      parsed.hostname = 'www.k4studios.com';
      parsed.protocol = 'https:';
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

function hasValidSiteContext(headers) {
  const candidates = [
    getHeader(headers, 'origin'),
    getHeader(headers, 'referer'),
    getHeader(headers, 'referrer'),
  ].filter(Boolean);

  if (!candidates.length) {
    return false;
  }

  return candidates.some((candidate) => normalizePage(candidate));
}

function normalizeImageId(value) {
  const imageId = sanitizeText(value, 40);
  return /^i-[A-Za-z0-9-]+$/.test(imageId) ? imageId : '';
}

function getClientIp(headers) {
  const forwardedFor = getHeader(headers, 'x-forwarded-for');

  return (
    getHeader(headers, 'cf-connecting-ip') ||
    getHeader(headers, 'true-client-ip') ||
    getHeader(headers, 'x-real-ip') ||
    (forwardedFor ? forwardedFor.split(',')[0].trim() : '') ||
    getHeader(headers, 'x-nf-client-connection-ip') ||
    getHeader(headers, 'client-ip') ||
    ''
  );
}

function isRateLimited(ip) {
  if (!ip) return false;

  const now = Date.now();
  const recent = recentRequestsByIp.get(ip) || [];
  const fresh = recent.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);

  if (fresh.length >= RATE_LIMIT_MAX_REQUESTS) {
    recentRequestsByIp.set(ip, fresh);
    return true;
  }

  fresh.push(now);
  recentRequestsByIp.set(ip, fresh);
  return false;
}

function shouldSendEmail(ip, imageId) {
  const key = `${ip || 'unknown'}:${imageId}`;
  const now = Date.now();
  const lastSent = recentEmailNotifications.get(key) || 0;

  if (now - lastSent < EMAIL_DEDUPE_WINDOW_MS) {
    return false;
  }

  recentEmailNotifications.set(key, now);

  for (const [entryKey, timestamp] of recentEmailNotifications.entries()) {
    if (now - timestamp >= EMAIL_DEDUPE_WINDOW_MS) {
      recentEmailNotifications.delete(entryKey);
    }
  }

  return true;
}

function logBlockedRequest(reason, event, body = {}) {
  const headers = event?.headers || {};

  console.warn('Blocked image-like request', {
    reason,
    ip: getClientIp(headers) || 'unknown',
    origin: sanitizeText(getHeader(headers, 'origin'), 200),
    referer: sanitizeText(getHeader(headers, 'referer') || getHeader(headers, 'referrer'), 200),
    imageId: sanitizeText(body.imageId, 80),
    page: sanitizeText(body.page, 200),
  });
}

// Simplify User-Agent to just the OS/device
function simplifyUA(ua) {
  if (!ua || ua === 'unknown') return 'unknown';
  const lower = ua.toLowerCase();
  if (lower.includes('iphone')) return 'iPhone';
  if (lower.includes('ipad')) return 'iPad';
  if (lower.includes('android')) return 'Android';
  if (lower.includes('macintosh') || lower.includes('mac os')) return 'Mac';
  if (lower.includes('windows')) return 'Windows';
  if (lower.includes('linux')) return 'Linux';
  return 'Other';
}

function normalizeAnalyticsId(value, maxLength = 128) {
  if (typeof value !== 'string') return '';

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) {
    return '';
  }

  return /^[A-Za-z0-9._:-]+$/.test(trimmed) ? trimmed : '';
}

function resolveNetlifyContext(context) {
  if (context && typeof context === 'object') {
    return context;
  }

  const netlifyGlobal = typeof globalThis === 'object' ? globalThis.Netlify : null;
  if (netlifyGlobal && typeof netlifyGlobal === 'object' && netlifyGlobal.context && typeof netlifyGlobal.context === 'object') {
    return netlifyGlobal.context;
  }

  return {};
}

function getGeoContext(netlifyContext) {
  const geo = netlifyContext?.geo && typeof netlifyContext.geo === 'object'
    ? netlifyContext.geo
    : {};

  return {
    city: sanitizeText(geo.city, 80),
    regionCode: sanitizeText(geo.subdivision?.code, 16).toUpperCase(),
    regionName: sanitizeText(geo.subdivision?.name, 80),
    countryCode: sanitizeText(geo.country?.code, 8).toUpperCase(),
    countryName: sanitizeText(geo.country?.name, 80),
    timezone: sanitizeText(geo.timezone, 80),
  };
}

function formatLocationSummary(geoContext) {
  if (!geoContext || typeof geoContext !== 'object') {
    return '';
  }

  const region = geoContext.regionCode || geoContext.regionName || '';
  const country = geoContext.countryCode === 'US'
    ? ''
    : (geoContext.countryName || geoContext.countryCode || '');

  return [geoContext.city, region, country].filter(Boolean).join(', ');
}

export async function handler(event, context) {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const netlifyContext = resolveNetlifyContext(context);
  const geoContext = getGeoContext(netlifyContext);
  const requestId = sanitizeText(netlifyContext?.requestId, 80);
  const contextIp = sanitizeText(netlifyContext?.ip, 80);
  const clientIp = contextIp || getClientIp(event.headers || {});

  if (isRateLimited(clientIp)) {
    logBlockedRequest('rate_limited', event);
    return jsonResponse(429, { error: 'Too many requests' });
  }

  let payload;

  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    logBlockedRequest('invalid_json', event);
    return jsonResponse(400, { error: 'Invalid JSON payload' });
  }

  const imageId = normalizeImageId(payload?.imageId);
  const page = normalizePage(payload?.page);
  const title = sanitizeText(payload?.title, 180) || 'Untitled';
  const sessionId = normalizeAnalyticsId(payload?.sessionId || payload?.session_id);
  const visitorId = normalizeAnalyticsId(payload?.visitorId || payload?.visitor_id);

  if (!imageId || !page) {
    logBlockedRequest('invalid_image_or_page', event, payload);
    return jsonResponse(400, { error: 'Invalid imageId or page URL' });
  }

  if (!hasValidSiteContext(event.headers || {})) {
    logBlockedRequest('invalid_origin_or_referer', event, payload);
    return jsonResponse(403, { error: 'Invalid request origin' });
  }

  const {
    NOTIFY_EMAIL,
    NOTIFY_EMAIL_PASS,
    NOTIFY_TO,
    NOTIFY_FROM = 'K4 Like Notification',
  } = process.env;

  const likeTime = new Date().toLocaleString('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  // Request context: UA, Referer, IP
  const rawUA = getHeader(event.headers || {}, 'user-agent') || 'unknown';
  const ua = simplifyUA(rawUA);
  const referer = getHeader(event.headers || {}, 'referer') || getHeader(event.headers || {}, 'referrer') || 'none';
  const cleanReferer = sanitizeText(referer, 200);
  const ip = clientIp || 'unknown';
  const locationSummary = formatLocationSummary(geoContext);
  const shouldEmailThisLike = shouldSendEmail(clientIp, imageId);

  // 📝 Google Sheets Logging - always log all likes for analytics
  try {
    const sheetRes = await fetch(GOOGLE_SHEET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sheet: 'Likes',
        timestamp: likeTime,
        imageID: imageId,
        title,
        page,
        isRepeat: shouldEmailThisLike ? 'No' : 'Yes',
        ip,
        ua,
        referer: cleanReferer,
      }),
    });
    console.log('Google Sheets response:', sheetRes.status);
  } catch (sheetError) {
    console.error('Google Sheets logging error:', sheetError);
  }

  // 📧 Email Notification (optional - only for first-time likes)
  if (!shouldEmailThisLike) {
    console.log('Repeat like - skipping email notification');
    return jsonResponse(200, { success: true, emailSent: false, reason: 'repeat_like' });
  }
  
  if (!NOTIFY_EMAIL || !NOTIFY_EMAIL_PASS) {
    console.warn('Missing NOTIFY_EMAIL or NOTIFY_EMAIL_PASS - skipping email notification');
    return jsonResponse(200, { success: true, emailSent: false });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: NOTIFY_EMAIL,
        pass: NOTIFY_EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"${NOTIFY_FROM}" <${NOTIFY_EMAIL}>`,
      to: NOTIFY_TO || NOTIFY_EMAIL,
  subject: `❤️ K4 Image Liked${locationSummary ? ` – ${locationSummary}` : ''} – "${title}"`,
  text: `${locationSummary ? `Someone from ${locationSummary} just liked an image on K4 Studios.` : 'Someone just liked an image on K4 Studios.'}

Image Title: ${title}
Image ID: ${imageId}
Page: ${page}
Time: ${likeTime}
Device: ${ua}
Referrer: ${cleanReferer}
IP: ${ip}${geoContext.timezone ? `
Timezone: ${geoContext.timezone}` : ''}${sessionId ? `
K4 Session ID: ${sessionId}` : ''}${visitorId ? `
K4 Visitor ID: ${visitorId}` : ''}${requestId ? `
Netlify Request ID: ${requestId}` : ''}`,
    });

    return jsonResponse(200, { success: true, emailSent: true });
  } catch (err) {
    console.error('Mailer error (non-fatal):', err);
    // Still return success since Airtable logged successfully
    return jsonResponse(200, { success: true, emailSent: false, emailError: err.message });
  }
}
