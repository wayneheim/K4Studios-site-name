const path = require('path');
async function loadUrls(relPath, count) {
  const filePath = path.resolve(relPath).replace(/\\/g, '/');
  const href = new URL('file://' + (filePath.startsWith('/') ? filePath : '/' + filePath)).href;
  const mod = await import(href);
  return (mod.galleryData || [])
    .filter((img) => img && img.srcL && img.id && img.id !== 'i-k4studios' && img.visibility !== 'ghost')
    .slice(0, count)
    .map((img) => ({ id: img.id, url: img.srcL }));
}
(async () => {
  const urls = [
    ...(await loadUrls('src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Black-White.mjs', 30)),
    ...(await loadUrls('src/data/Other/Archive/Archive.mjs', 30))
  ];
  const ua = 'K4-Image-Proxy-Worker/1.0';
  const rows = [];
  for (const item of urls) {
    const res = await fetch(item.url, {
      headers: { 'user-agent': ua, 'accept': 'image/*', 'cache-control': 'no-cache' },
      redirect: 'manual'
    });
    rows.push({ id: item.id, status: res.status, location: res.headers.get('location') || '', url: item.url });
    try { await res.body?.cancel(); } catch {}
  }
  console.log(JSON.stringify(rows.filter((row) => row.status !== 200).slice(0, 20), null, 2));
})();
