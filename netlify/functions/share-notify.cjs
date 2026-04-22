import nodemailer from 'nodemailer';

const ALLOWED_PLATFORMS = new Map([
  ['copy', 'Copy'],
  ['twitter', 'Twitter'],
  ['facebook', 'Facebook'],
  ['pinterest', 'Pinterest'],
  ['email', 'Email'],
]);

const ALLOWED_HOSTS = new Set([
  'www.k4studios.com',
  'k4studios.com',
  'localhost',
  '127.0.0.1',
]);

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const recentRequestsByIp = new Map();

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

function normalizePlatform(value) {
  const platformKey = sanitizeText(value, 40).toLowerCase();
  return ALLOWED_PLATFORMS.get(platformKey) || '';
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

function normalizePageUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) {
    return null;
  }

  try {
    const parsed = new URL(value.trim());
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

  return candidates.some((candidate) => normalizePageUrl(candidate));
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

function logBlockedRequest(reason, event, body = {}) {
  const headers = event?.headers || {};

  console.warn('Blocked share-notify request', {
    reason,
    ip: getClientIp(headers) || 'unknown',
    origin: sanitizeText(getHeader(headers, 'origin'), 200),
    referer: sanitizeText(getHeader(headers, 'referer') || getHeader(headers, 'referrer'), 200),
    platform: sanitizeText(body.platform, 80),
    page: sanitizeText(body.page, 200),
  });
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const clientIp = getClientIp(event.headers || {});
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

  const platform = normalizePlatform(payload?.platform);
  const page = normalizePageUrl(payload?.page);
  const title = sanitizeText(payload?.title, 180) || 'Untitled';

  if (!hasValidSiteContext(event.headers || {})) {
    logBlockedRequest('invalid_origin_or_referer', event, payload);
    return jsonResponse(403, { error: 'Invalid request origin' });
  }

  if (!platform || !page) {
    logBlockedRequest('invalid_platform_or_page', event, payload);
    return jsonResponse(400, { error: 'Invalid platform or page URL' });
  }

  const {
    NOTIFY_EMAIL,
    NOTIFY_EMAIL_PASS,
    NOTIFY_TO,
    NOTIFY_FROM = 'K4 Share Notification'
  } = process.env;

  if (!NOTIFY_EMAIL || !NOTIFY_EMAIL_PASS) {
    console.error('Missing NOTIFY_EMAIL or NOTIFY_EMAIL_PASS in environment.');
    return jsonResponse(500, { error: 'Missing email credentials' });
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
      subject: `🔔 K4 Share Notification – ${platform}`,
      text: `A share was triggered from K4 Studios!

Platform: ${platform}
Title: ${title}
Page: ${page}`,
    });

    return jsonResponse(200, { success: true });
  } catch (err) {
    console.error('Mailer error:', err);
    return jsonResponse(500, { error: 'Failed to send email' });
  }
}
