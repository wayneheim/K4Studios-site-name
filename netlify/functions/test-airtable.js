import fetch from 'node-fetch';

export async function handler(event) {
  const {
    AIRTABLE_API_TOKEN,
    AIRTABLE_BASE_ID,
  } = process.env;

  const results = {
    hasToken: !!AIRTABLE_API_TOKEN,
    tokenPrefix: AIRTABLE_API_TOKEN ? AIRTABLE_API_TOKEN.substring(0, 10) + '...' : 'MISSING',
    hasBaseId: !!AIRTABLE_BASE_ID,
    baseId: AIRTABLE_BASE_ID || 'MISSING',
  };

  // Try to create a test record
  try {
    const testPayload = {
      fields: {
        eventType: 'test_diagnostic',
        details: JSON.stringify({ test: true, time: new Date().toISOString() }),
        timestamp: new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }),
        ip: 'test',
        ua: 'diagnostic',
        referer: 'test',
      },
    };

    const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/UIEvents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    });

    results.airtableStatus = res.status;
    results.airtableStatusText = res.statusText;
    results.airtableResponse = await res.text();
  } catch (err) {
    results.airtableError = err.message;
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(results, null, 2),
  };
}
