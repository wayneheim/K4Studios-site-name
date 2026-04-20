const path = require('path');
const scaryUa = 'GPTBot/1.0 (+https://openai.com/gptbot)';
async function loadIds() {
  const filePath = path.resolve('src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Black-White.mjs').replace(/\\/g, '/');
  const href = new URL('file://' + (filePath.startsWith('/') ? filePath : '/' + filePath)).href;
  const mod = await import(href);
  return (mod.galleryData || []).filter((img) => img && img.id && img.id !== 'i-k4studios' && img.visibility !== 'ghost').slice(0, 50).map((img) => img.id);
}
(async () => {
  const ids = await loadIds();
  const rows = [];
  for (const id of ids) {
    const res = await fetch(`https://www.k4studios.com/img/${id}/l.jpg`, {
      headers: { 'user-agent': scaryUa, 'accept': 'image/avif,image/webp,*/*', 'cache-control': 'no-cache' },
      redirect: 'manual'
    });
    rows.push({ id, status: res.status, retryAfter: res.headers.get('retry-after') || '' });
    try { await res.body?.cancel(); } catch {}
  }
  const summary = rows.reduce((acc, row) => {
    const key = `${row.status}${row.retryAfter ? ' retry=' + row.retryAfter : ''}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  console.log(JSON.stringify({ summary, last15: rows.slice(-15) }, null, 2));
})();
