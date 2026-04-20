const path = require('path');

const exactPages = [
  'https://www.k4studios.com/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Black-White/i-LkpNVPS',
  'https://www.k4studios.com/Other/Archive/i-r9xCmwz'
];

const bingUa = 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)';
const controlUa = 'curl/8.6.0';

async function loadModule(relPath, exportName = 'galleryData') {
  const filePath = path.resolve(relPath).replace(/\\/g, '/');
  const href = new URL('file://' + (filePath.startsWith('/') ? filePath : '/' + filePath)).href;
  const mod = await import(href);
  return mod[exportName] || [];
}

async function probe(url, ua, accept) {
  const res = await fetch(url, {
    headers: {
      'user-agent': ua,
      'accept': accept,
      'cache-control': 'no-cache'
    },
    redirect: 'manual'
  });

  try {
    await res.body?.cancel();
  } catch {}

  return {
    status: res.status,
    location: res.headers.get('location') || '',
    retryAfter: res.headers.get('retry-after') || '',
    contentType: res.headers.get('content-type') || ''
  };
}

function summarize(results) {
  const buckets = new Map();
  for (const r of results) {
    const key = `${r.status}${r.location ? ' -> ' + r.location : ''}${r.retryAfter ? ' retry=' + r.retryAfter : ''}`;
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }
  return [...buckets.entries()].map(([key, count]) => ({ key, count }));
}

(async () => {
  const wwii = (await loadModule('src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Black-White.mjs'))
    .filter((img) => img && img.id && img.id !== 'i-k4studios' && img.visibility !== 'ghost')
    .slice(0, 25)
    .map((img) => `https://www.k4studios.com/img/${img.id}/l.jpg`);

  const archive = (await loadModule('src/data/Other/Archive/Archive.mjs'))
    .filter((img) => img && img.id && img.id !== 'i-k4studios' && img.visibility !== 'ghost')
    .slice(0, 25)
    .map((img) => `https://www.k4studios.com/img/${img.id}/l.jpg`);

  const uniqueImages = [...wwii, ...archive];
  const repeatedPages = exactPages.flatMap((url) => Array.from({ length: 20 }, () => url));
  const repeatedExactImages = [
    ...Array.from({ length: 20 }, () => 'https://www.k4studios.com/img/i-LkpNVPS/l.jpg'),
    ...Array.from({ length: 20 }, () => 'https://www.k4studios.com/img/i-r9xCmwz/l.jpg')
  ];

  const batches = [
    { name: 'bing_exact_pages', urls: repeatedPages, ua: bingUa, accept: 'text/html' },
    { name: 'bing_exact_images_repeat', urls: repeatedExactImages, ua: bingUa, accept: 'image/avif,image/webp,*/*' },
    { name: 'bing_unique_images_50', urls: uniqueImages, ua: bingUa, accept: 'image/avif,image/webp,*/*' },
    { name: 'control_unique_images_50', urls: uniqueImages, ua: controlUa, accept: 'image/avif,image/webp,*/*' }
  ];

  const output = [];
  for (const batch of batches) {
    const started = Date.now();
    const results = await Promise.all(batch.urls.map((url) => probe(url, batch.ua, batch.accept)));
    output.push({
      batch: batch.name,
      total: results.length,
      durationMs: Date.now() - started,
      summary: summarize(results)
    });
  }

  console.log(JSON.stringify(output, null, 2));
})();
