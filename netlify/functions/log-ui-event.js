import fetch from 'node-fetch';

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const { eventType, details, timestamp } = JSON.parse(event.body || '{}');

  if (!eventType) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing eventType' }),
    };
  }

  // Extract request context: UA, Referer, IP
  const ua = event.headers['user-agent'] || 'unknown';
  const referer = event.headers['referer'] || event.headers['referrer'] || 'none';
  const rawIp =
    event.headers['x-forwarded-for'] ||
    event.headers['client-ip'] ||
    event.headers['x-nf-client-connection-ip'] ||
    event.ip ||
    '';
  const ip = (rawIp || '')
    .toString()
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)[0] || 'unknown';

  const {
    AIRTABLE_API_TOKEN,
    AIRTABLE_BASE_ID,
  } = process.env;

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

  // Airtable Logging
  const airtableRes = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/UIEvents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        eventType,
        details: JSON.stringify(details || {}),
        timestamp: eventTime,
        When: eventTime,
        ip,
        ua,
        referer,
      },
    }),
  });

  const airtableResponseText = await airtableRes.text();
  console.log('Airtable response:', airtableResponseText);

  if (!airtableRes.ok) {
    console.error('Airtable logging error:', airtableResponseText);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Airtable logging failed' }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true }),
  };
}
