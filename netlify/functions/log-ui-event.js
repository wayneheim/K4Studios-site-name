import fetch from 'node-fetch';

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

  if (!AIRTABLE_API_TOKEN || !AIRTABLE_BASE_ID) {
    console.error('Missing Airtable credentials');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server configuration error' }),
    };
  }

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

  // Prepare Airtable payload
  let airtablePayload;
  
  if (eventType === 'gallery_session') {
    // For session summaries, extract individual fields from details
    const sessionData = details || {};
    airtablePayload = {
      fields: {
        eventType,
        details: sessionData.details || 0, // total event count
        start: sessionData.start || '',
        end: sessionData.end || '',
        duration_min: sessionData.duration_min || 0,
        avg_time_per_event: sessionData.avg_time_per_event || null,
        device: sessionData.device || 'unknown',
        timestamp: eventTime,
        ip,
        ua,
        referer,
      },
    };
  } else {
    // For individual events, keep as before
    airtablePayload = {
      fields: {
        eventType,
        details: JSON.stringify(details || {}),
        timestamp: eventTime,
        ip,
        ua,
        referer,
      },
    };
  }

  try {
    // Airtable Logging
    const airtableRes = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/UIEvents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(airtablePayload),
    });

    if (!airtableRes.ok) {
      const airtableResponseText = await airtableRes.text();
      console.error('Airtable error:', airtableResponseText);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Airtable logging failed' }),
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
