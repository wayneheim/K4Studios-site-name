import fetch from 'node-fetch';

const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbzyCEvOy7f4sfePpdnNjRLy3HosBoJEUcPcG0bQiFAx8AtvkKxO8_KUrY-3eNZF300/exec';

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

// Process a single event and return the formatted row data
function formatEvent(evt, ua, ip, referer) {
  const { eventType, details, timestamp } = evt;
  
  const eventTime = new Date(timestamp || Date.now()).toLocaleString('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const detailsStr = typeof details === 'string' ? details : JSON.stringify(details || {}, null, 2);

  return {
    sheet: 'UIEvents',
    timestamp: eventTime,
    eventType: eventType || 'unknown',
    details: detailsStr,
    ip,
    ua,
    referer,
  };
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  let bodyData;
  try {
    bodyData = JSON.parse(event.body || '{}');
  } catch (parseError) {
    console.error('JSON parse error:', parseError);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON in request body' }),
    };
  }

  // Extract request context: UA, Referer, IP
  const rawUA = event.headers['user-agent'] || 'unknown';
  const ua = simplifyUA(rawUA);
  const referer = event.headers['referer'] || event.headers['referrer'] || 'none';
  const rawIp =
    event.headers['cf-connecting-ip'] ||
    event.headers['true-client-ip'] ||
    event.headers['x-real-ip'] ||
    (event.headers['x-forwarded-for'] || '').split(',')[0]?.trim() ||
    event.headers['x-nf-client-connection-ip'] ||
    event.headers['client-ip'] ||
    event.requestContext?.identity?.sourceIp ||
    '';
  const ip = rawIp || 'unknown';

  // Handle both batched events (new) and single event (legacy/FeaturedCollection)
  const events = bodyData.events || [bodyData];
  
  if (events.length === 0 || !events[0].eventType) {
    console.error('No valid events found');
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'No valid events' }),
    };
  }

  try {
    // Send all events to Google Sheets (as batch for efficiency)
    const rows = events.map(evt => formatEvent(evt, ua, ip, referer));
    
    // Google Sheets - send as batch
    const sheetRes = await fetch(GOOGLE_SHEET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch: rows }),
    });

    if (!sheetRes.ok) {
      const errorText = await sheetRes.text();
      console.error('Google Sheets error:', errorText);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Logging failed' }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, count: events.length }),
    };
  } catch (fetchError) {
    console.error('Network error:', fetchError);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Network error' }),
    };
  }
}
