const path = require('path');
const controlUa = 'curl/8.6.0';
const bingUa = 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)';
async function loadIds() {
  const filePath = path.resolve('src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Black-White.mjs').replace(/\\/g, '/');
  const href = new URL('file://' + (filePath.startsWith('/') ? filePath : '/' + filePath)).href;
  const mod = await import(href);
  return (mod.galleryData || []).filter((img) => img && img.id && img.id !== 'i-k4studios' && img.visibility !== 'ghost').slice(0, 50).map((img) => img.id);
}
async function run(label, ua, ids) {
  const out = [];
  for (const id of ids) {
    const res = await fetch(`https://www.k4studios.com/img/${id}/l.jpg`, {
      headers: { 'user-agent': ua, 'accept': 'image/avif,image/webp,*/*', 'cache-control': 'no-cache' },
      redirect: 'manual'
    });
    out.push({ id, status: res.status, retryAfter: res.headers.get('retry-after') || '' });
    try { await res.body?.cancel(); } catch {}
  }
  const summary = out.reduce((acc, row) => {
    const key = `${row.status}${row.retryAfter ? ' retry=' + row.retryAfter : ''}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  return { label, summary, last10: out.slice(-10) };
}
(async () => {
  const ids = await loadIds();
  const bing = await run('bing_sequential_50', bingUa, ids);
  const control = await run('control_sequential_50', controlUa, ids);
  console.log(JSON.stringify([bing, control], null, 2));
})();
