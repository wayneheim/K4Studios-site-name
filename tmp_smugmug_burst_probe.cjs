const urls = [
  'https://photos.smugmug.com/Other/Photo-Shoots/Miscellaneous-Collections/Historic-Reenactments/D-Day-Conneaut-2019/i-LkpNVPS/1/KGmgQKhjcS2WRWR4sRmDDCjgbn8McLJTXv3Pg3z8p/L/_OLY3636-Edit-L.jpg',
  'https://photos.smugmug.com/Other/Photo-Shoots/Pennsylvania/Old-Bedford-Historical-Village/OBV-Wild-West-Weekend-2025/i-r9xCmwz/0/LjRXJS4CsfxPq4gWjCmfQsxrR9NGJV62ThJqhcrv8/L/_O2H2856-855-2-L.jpg'
];
const bingUa = 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)';
(async () => {
  for (const url of urls) {
    const requests = Array.from({ length: 20 }, () => fetch(url, { headers: { 'user-agent': bingUa, 'accept': 'image/avif,image/webp,*/*', 'cache-control': 'no-cache' }, redirect: 'manual' }));
    const responses = await Promise.all(requests);
    const summary = {};
    for (const res of responses) {
      const key = `${res.status}${res.headers.get('retry-after') ? ' retry=' + res.headers.get('retry-after') : ''}`;
      summary[key] = (summary[key] || 0) + 1;
      try { await res.body?.cancel(); } catch {}
    }
    console.log(JSON.stringify({ url, summary }, null, 2));
  }
})();
