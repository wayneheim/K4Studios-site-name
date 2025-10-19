#!/usr/bin/env node
// Simple script to purge Cloudflare cache. Intentionally small and dependency-free.
const https = require('https');

function coerceBoolean(value, defaultValue = false) {
  if (value === undefined) return defaultValue;
  if (typeof value === 'boolean') return value;
  const s = String(value).toLowerCase();
  return s === 'true' || s === '1' || s === 'yes';
}

function cloudflarePurge(zoneId, apiToken, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: 'api.cloudflare.com',
      path: `/client/v4/zones/${zoneId}/purge_cache`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        Authorization: `Bearer ${apiToken}`,
      },
    };

    const req = https.request(options, (res) => {
      let out = '';
      res.on('data', (chunk) => (out += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(out || '{}');
          if (res.statusCode >= 200 && res.statusCode < 300 && parsed.success) {
            resolve(parsed);
          } else {
            const err = new Error('Cloudflare API returned an error');
            err.statusCode = res.statusCode;
            err.response = parsed;
            reject(err);
          }
        } catch (err) {
          reject(new Error('Invalid JSON response from Cloudflare: ' + err.message + ' - raw: ' + out));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(data);
    req.end();
  });
}

async function main() {
  const zoneId = process.env.CF_ZONE_ID || process.env.CLOUDFLARE_ZONE_ID;
  const apiToken = process.env.CF_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_KEY;
  const purgeEverything = coerceBoolean(process.env.CF_PURGE_EVERYTHING, true);
  const failOnError = coerceBoolean(process.env.CF_PURGE_FAIL_ON_ERROR, false);

  if (!zoneId || !apiToken) {
    console.error('Missing CF_ZONE_ID or CF_API_TOKEN environment variables. Aborting.');
    process.exit(1);
  }

  const body = purgeEverything ? { purge_everything: true } : (() => {
    const files = (process.env.CF_PURGE_FILES || '').split(',').map(s => s.trim()).filter(Boolean);
    return { files };
  })();

  try {
    const res = await cloudflarePurge(zoneId, apiToken, body);
    console.log('Cloudflare purge successful:', res);
    process.exit(0);
  } catch (err) {
    console.error('Cloudflare purge failed:', err && err.response ? err.response : err);
    if (failOnError) process.exit(1);
    process.exit(0);
  }
}

main();
