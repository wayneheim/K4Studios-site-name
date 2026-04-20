const path = require('path');
async function loadUrls(relPath, count) {
  const filePath = path.resolve(relPath).replace(/\\/g, '/');
  const href = new URL('file://' + (filePath.startsWith('/') ? filePath : '/' + filePath)).href;
  const mod = await import(href);
  return (mod.galleryData || [])
    .filter((img) => img && img.srcL && img.id && img.id !== 'i-k4studios' && img.visibility !== 'ghost')
    .slice(0, count)
    .map((img) => img.srcL);
}
(async () => {
  const urls = [
    ...(await loadUrls('src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Black-White.mjs', 30)),
    ...(await loadUrls('src/data/Other/Archive/Archive.mjs', 30))
  ];
  const ua = 'K4-Image-Proxy-Worker/1.0';
  const started = Date.now();
  const results = await Promise.all(urls.map((url) => fetch(url, {
    headers: { 'user-agent': ua, 'accept': 'image/*', 'cache-control': 'no-cache' },
    redirect: 'manual'
  })));
  const summary = {};
  for (const res of results) {
    const key = `${res.status}${res.headers.get('retry-after') ? ' retry=' + res.headers.get('retry-after') : ''}`;
    summary[key] = (summary[key] || 0) + 1;
    try { await res.body?.cancel(); } catch {}
  }
  console.log(JSON.stringify({ total: urls.length, durationMs: Date.now() - started, summary }, null, 2));
})();
