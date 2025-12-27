import fetch from 'node-fetch';

const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbzyCEvOy7f4sfePpdnNjRLy3HosBoJEUcPcG0bQiFAx8AtvkKxO8_KUrY-3eNZF300/exec';

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

  const { eventType, details, timestamp } = bodyData;

  if (!eventType) {
    console.error('Missing eventType');
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing eventType' }),
    };
  }

  // Extract request context: UA, Referer, IP
  const ua = event.headers['user-agent'] || 'unknown';
  const referer = event.headers['referer'] || event.headers['referrer'] || 'none';
  // Netlify's x-nf-client-connection-ip is most reliable, then x-forwarded-for
  const rawIp =
    event.headers['x-nf-client-connection-ip'] ||
    event.headers['x-forwarded-for'] ||
    event.headers['client-ip'] ||
    event.requestContext?.identity?.sourceIp ||
    '';
  const ip = (rawIp || '')
    .toString()
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)[0] || 'unknown';

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

  // Ensure details is always a string
  const detailsStr = typeof details === 'string' ? details : JSON.stringify(details || {}, null, 2);

  try {
    // Google Sheets Logging
    const sheetRes = await fetch(GOOGLE_SHEET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sheet: 'UIEvents',
        timestamp: eventTime,
        eventType,
        details: detailsStr,
        ip,
        ua,
        referer,
      }),
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
      body: JSON.stringify({ success: true }),
    };
  } catch (fetchError) {
    console.error('Network error:', fetchError);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Network error' }),
    };
  }
}
