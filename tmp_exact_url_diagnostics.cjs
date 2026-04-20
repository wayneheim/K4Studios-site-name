const urls = [
  'https://www.k4studios.com/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Black-White/i-LkpNVPS',
  'https://www.k4studios.com/Other/Archive/i-r9xCmwz'
];
(async () => {
  for (const url of urls) {
    const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)' } });
    const html = await res.text();
    const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/i) || [])[1] || '';
    const robots = (html.match(/<meta name="robots" content="([^"]+)"/i) || [])[1] || '';
    const title = (html.match(/<title>([^<]*)<\/title>/i) || [])[1] || '';
    const ldJsonBlocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1].trim());
    const parsed = ldJsonBlocks.map((block, index) => {
      try {
        JSON.parse(block);
        return { index, valid: true, length: block.length };
      } catch (error) {
        return { index, valid: false, length: block.length, error: error.message.slice(0, 120), sample: block.slice(0, 180) };
      }
    });
    console.log(JSON.stringify({ url, status: res.status, title, canonical, robots, ldJsonBlocks: parsed }, null, 2));
  }
})();
