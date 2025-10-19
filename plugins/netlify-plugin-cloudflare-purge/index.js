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

/**
 * Netlify Build Plugin - run onSuccess (after deploy published)
 * Reads CF_ZONE_ID and CF_API_TOKEN from environment variables if not provided
 * Plugin inputs are defined in manifest.yml and are optional.
 */
exports.onSuccess = async function ({ inputs = {}, utils = {}, constants = {} }) {
  const zoneId = inputs.zone_id || process.env.CF_ZONE_ID || process.env.CLOUDFLARE_ZONE_ID;
  const apiToken = process.env.CF_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_KEY;
  const purgeEverything = coerceBoolean(inputs.purge_everything, true);
  const failOnError = coerceBoolean(inputs.fail_on_error, false);

  if (!zoneId || !apiToken) {
    const message = 'Cloudflare purge skipped: CF_ZONE_ID or CF_API_TOKEN not set in environment.';
    console.log(message);
    // Make the message visible in the deploy summary
    if (utils.status && typeof utils.status.show === 'function') {
      utils.status.show({ title: 'Cloudflare purge skipped', summary: 'Set CF_ZONE_ID and CF_API_TOKEN in Netlify environment variables to enable automatic purge.' });
    }
    return;
  }

  const payload = purgeEverything ? { purge_everything: true } : (() => {
    const filesEnv = process.env.CF_PURGE_FILES || '';
    const files = filesEnv.split(',').map((s) => s.trim()).filter(Boolean);
    return { files };
  })();

  if (utils.status && typeof utils.status.show === 'function') {
    utils.status.show({ title: 'Cloudflare purge', summary: purgeEverything ? 'Purging entire zone' : `Purging ${payload.files.length} files` });
  }

  try {
    const res = await cloudflarePurge(zoneId, apiToken, payload);
    console.log('Cloudflare purge successful:', res);
    if (utils.status && typeof utils.status.show === 'function') {
      utils.status.show({ title: 'Cloudflare cache purged', summary: purgeEverything ? 'Zone cache purged' : `Purged ${payload.files.length} files` });
    }
  } catch (err) {
    console.error('Cloudflare purge failed:', err && err.response ? err.response : err);
    // By default don't fail the build; respect the fail_on_error input
    if (failOnError) {
      if (utils.build && typeof utils.build.failBuild === 'function') {
        utils.build.failBuild('Cloudflare cache purge failed', { error: err });
      } else {
        throw err;
      }
    } else {
      if (utils.build && typeof utils.build.failPlugin === 'function') {
        utils.build.failPlugin('Cloudflare cache purge failed', { error: err });
      } else {
        // best-effort fallback
        console.warn('Cloudflare purge failed (plugin error):', err);
      }
    }
  }
};
