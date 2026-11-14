import assert from 'node:assert/strict';
import worker from '../k4-image-proxy.js';

const staleUa = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const currentUa = staleUa.replace('Chrome/120.', 'Chrome/157.');
const galleryUrl = 'https://www.k4studios.com/Galleries/Fine-Art-Photography/Portraits/Black-White/i-example';

function request(url, {
  country = 'AL',
  continent = 'EU',
  userAgent = staleUa,
  referer = 'https://www.k4studios.com/',
  cookie = '',
  verifiedBot = false,
} = {}) {
  const headers = new Headers({
    Accept: 'text/html',
    'User-Agent': userAgent,
    Referer: referer,
  });
  if (cookie) headers.set('Cookie', cookie);
  const req = new Request(url, { headers });
  Object.defineProperty(req, 'cf', {
    value: { country, continent, asn: 21183, botManagement: { verifiedBot } },
  });
  return req;
}

const originalFetch = globalThis.fetch;
let originFetches = 0;
globalThis.fetch = async () => {
  originFetches += 1;
  return new Response('origin', { status: 200 });
};

try {
  const challenge = await worker.fetch(request(galleryUrl), {}, { waitUntil() {} });
  assert.equal(challenge.status, 403);
  assert.equal(challenge.headers.get('X-K4-Friction'), 'coordinated-proxy-crawl');
  assert.match(challenge.headers.get('Set-Cookie') || '', /k4_activity_pending=1/);
  assert.match(await challenge.text(), /Continue to K4 Studios/);
  assert.equal(originFetches, 0);

  const verified = await worker.fetch(request(`${galleryUrl}?__k4_verify=1`, {
    referer: galleryUrl,
    cookie: 'k4_activity_pending=1',
  }), {}, { waitUntil() {} });
  assert.equal(verified.status, 303);
  assert.equal(verified.headers.get('Location'), new URL(galleryUrl).pathname);
  assert.match(verified.headers.get('Set-Cookie') || '', /k4_activity_ok=1/);
  assert.equal(originFetches, 0);

  const proofCookie = await worker.fetch(request('https://www.k4studios.com/women-of-the-wild-west', {
    cookie: 'k4_activity_ok=1',
  }), {}, { waitUntil() {} });
  assert.equal(proofCookie.status, 200);

  const currentBrowser = await worker.fetch(request('https://www.k4studios.com/women-of-the-wild-west', {
    userAgent: currentUa,
  }), {}, { waitUntil() {} });
  assert.equal(currentBrowser.status, 200);

  const directMarket = await worker.fetch(request('https://www.k4studios.com/women-of-the-wild-west', {
    country: 'GB',
  }), {}, { waitUntil() {} });
  assert.equal(directMarket.status, 200);

  const verifiedCrawler = await worker.fetch(request('https://www.k4studios.com/women-of-the-wild-west', {
    verifiedBot: true,
  }), {}, { waitUntil() {} });
  assert.equal(verifiedCrawler.status, 200);
  assert.equal(originFetches, 4);
} finally {
  globalThis.fetch = originalFetch;
}

console.log('coordinated crawl friction: all assertions passed');
