import fetch from 'node-fetch';

export async function handler(event) {
  console.log('🔥 Function called with method:', event.httpMethod);
  console.log('📨 Raw body:', event.body);

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  let bodyData;
  try {
    bodyData = JSON.parse(event.body || '{}');
    console.log('📦 Parsed body:', bodyData);
  } catch (parseError) {
    console.error('❌ JSON parse error:', parseError);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON in request body' }),
    };
  }

  const { eventType, details, timestamp } = bodyData;

  if (!eventType) {
    console.error('❌ Missing eventType');
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

  console.log('🌐 Context - IP:', ip, 'UA:', ua, 'Referer:', referer);

  const {
    AIRTABLE_API_TOKEN,
    AIRTABLE_BASE_ID,
  } = process.env;

  console.log('🔑 Env vars present - Token:', !!AIRTABLE_API_TOKEN, 'Base ID:', !!AIRTABLE_BASE_ID);

  if (!AIRTABLE_API_TOKEN || !AIRTABLE_BASE_ID) {
    console.error('❌ Missing Airtable credentials');
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

  console.log('📅 Event time:', eventTime);

  // Prepare Airtable payload
  const airtablePayload = {
    fields: {
      eventType,
      details: JSON.stringify(details || {}),
      timestamp: eventTime,
      ip,
      ua,
      referer,
    },
  };

  console.log('📤 Sending to Airtable:', airtablePayload);
  console.log('📤 Full URL:', `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/UIEvents`);

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

    const airtableResponseText = await airtableRes.text();
    console.log('📥 Airtable status:', airtableRes.status);
    console.log('📥 Airtable response:', airtableResponseText);

    if (!airtableRes.ok) {
      console.error('❌ Airtable logging error:', airtableResponseText);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Airtable logging failed',
          airtableStatus: airtableRes.status,
          airtableResponse: airtableResponseText
        }),
      };
    }

    console.log('✅ Success!');
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (fetchError) {
    console.error('💥 Fetch error:', fetchError);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Network error', details: fetchError.message }),
    };
  }
}
