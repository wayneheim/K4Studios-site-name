const EDGE_EVENT_ENDPOINT = 'https://edge.k4studios.com/edge-event';

const DOWNLOADS = {
  'nv-article': {
    eventType: 'nv_pdf_download_article',
    target: '/data/narrative_vacuum_essay_WH.pdf'
  },
  'nv-samples': {
    eventType: 'nv_pdf_download_samples',
    target: '/data/Heim%20Samples-annotated.pdf'
  }
};

function firstHeader(headers, key) {
  if (!headers) return '';
  return headers[key] || headers[key.toLowerCase()] || '';
}

function firstIp(headers) {
  const direct = firstHeader(headers, 'x-nf-client-connection-ip');
  if (direct) return String(direct).trim();

  const xff = firstHeader(headers, 'x-forwarded-for');
  if (!xff) return '';
  return String(xff).split(',')[0].trim();
}

function resolveDoc(event, url) {
  const fromQuery = url.searchParams.get('doc');
  if (fromQuery && DOWNLOADS[fromQuery]) return fromQuery;

  const path = (event.path || url.pathname || '').replace(/\/+$/g, '');
  const slug = path.split('/').pop() || '';
  if (DOWNLOADS[slug]) return slug;

  return '';
}

async function postDownloadEvent(event, url, docKey) {
  const spec = DOWNLOADS[docKey];
  if (!spec) return;

  const headers = {
    'Content-Type': 'application/json'
  };

  const ua = firstHeader(event.headers, 'user-agent');
  const referer = firstHeader(event.headers, 'referer');
  const cookie = firstHeader(event.headers, 'cookie');
  const ip = firstIp(event.headers);

  if (ua) headers['User-Agent'] = ua;
  if (referer) headers['Referer'] = referer;
  if (cookie) headers['Cookie'] = cookie;
  if (ip) headers['X-Forwarded-For'] = ip;

  const payload = {
    event_type: spec.eventType,
    path: `${url.pathname}${url.search}`,
    image_id: null,
    reason: 'pdf_download_redirect'
  };

  const postOnce = async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1200);
    try {
      const res = await fetch(EDGE_EVENT_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    const ok = await postOnce();
    if (!ok) await postOnce();
  } catch {
    // Never block the download redirect if telemetry fails.
  }
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'HEAD') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store'
      },
      body: 'Method Not Allowed'
    };
  }

  const host = firstHeader(event.headers, 'x-forwarded-host') || firstHeader(event.headers, 'host') || 'www.k4studios.com';
  const proto = firstHeader(event.headers, 'x-forwarded-proto') || 'https';
  const rawUrl = event.rawUrl || `${proto}://${host}${event.path || '/'}`;
  const url = new URL(rawUrl);

  const docKey = resolveDoc(event, url);
  const spec = DOWNLOADS[docKey];
  if (!spec) {
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow'
      },
      body: 'Not Found'
    };
  }

  await postDownloadEvent(event, url, docKey);

  return {
    statusCode: 302,
    headers: {
      Location: spec.target,
      'Cache-Control': 'no-store, max-age=0',
      'X-Robots-Tag': 'noindex, nofollow'
    }
  };
};
