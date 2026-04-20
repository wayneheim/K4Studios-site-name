const path = require('path');
async function loadIds() {
  const filePath = path.resolve('src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Black-White.mjs').replace(/\\/g, '/');
  const href = new URL('file://' + (filePath.startsWith('/') ? filePath : '/' + filePath)).href;
  const mod = await import(href);
  return (mod.galleryData || []).filter((img) => img && img.srcL && img.id && img.id !== 'i-k4studios' && img.visibility !== 'ghost').slice(0, 20).map((img) => img.srcL);
}
(async () => {
  const urls = await loadIds();
  const ua = 'K4-Image-Proxy-Worker/1.0';
  const results = await Promise.all(urls.map((url) => fetch(url, { headers: { 'user-agent': ua, 'accept': 'image/*', 'cache-control': 'no-cache' }, redirect: 'manual' })));
  const summary = {};
  for (const res of results) {
    const key = `${res.status}${res.headers.get('retry-after') ? ' retry=' + res.headers.get('retry-after') : ''}`;
    summary[key] = (summary[key] || 0) + 1;
    try { await res.body?.cancel(); } catch {}
  }
  console.log(JSON.stringify({ total: urls.length, summary }, null, 2));
})();
