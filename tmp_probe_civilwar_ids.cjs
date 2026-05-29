const fs = require('fs');
const text = fs.readFileSync('src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Color.mjs', 'utf8');
const ids = [...new Set([...text.matchAll(/"id":\s*"(i-[A-Za-z0-9]+)"/g)].map((m) => m[1]))].filter((id) => id !== 'i-k4studios');

(async () => {
  const bad = [];
  for (const id of ids) {
    const u = `https://www.k4studios.com/img/${id}/m.jpg`;
    try {
      const r = await fetch(u, { method: 'HEAD', redirect: 'manual' });
      if (r.status !== 200) bad.push({ id, status: r.status, loc: r.headers.get('location') || '' });
    } catch (e) {
      bad.push({ id, status: 'ERR', loc: String(e.message || e) });
    }
  }
  console.log('TOTAL', ids.length);
  console.log('BAD', bad.length);
  for (const b of bad) console.log(b.id, b.status, b.loc);
})();
