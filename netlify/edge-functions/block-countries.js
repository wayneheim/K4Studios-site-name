export default async (request, context) => {
  const url = new URL(request.url);

  // ✅ Always allow sitemap and robots.txt (for SEO crawlers)
  if (url.pathname === '/sitemap.xml' || url.pathname === '/robots.txt') {
    return context.next();
  }

  // 🌍 Geo blocking (country-based)
  const country = context.geo?.country?.code || '';
  const blockedCountries = ['CN', 'RU', 'IR', 'KP'];
  if (blockedCountries.includes(country)) {
    return new Response('Access Denied', {
      status: 403,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'x-robots-tag': 'noindex, nofollow'
      }
    });
  }

  // 🤖 User-agent filtering
  const ua = request.headers.get('user-agent') || '';

  // ✅ Allow major verified crawlers (safe for SEO & analytics)
  const allowedBots = /(googlebot|bingbot|duckduckbot|yandex|baiduspider|slurp|petalbot|ahrefsbot|semrushbot|applebot|facebookexternalhit|linkedinbot|twitterbot|pinterestbot)/i;
  if (allowedBots.test(ua)) {
    return context.next();
  }

  // ❌ Block suspicious or scraping user agents
  // (catch-all for generic or bad actors)
  const blockedBots = /(python|curl|scrapy|spider|bot|httpclient|axios|wget|postman|libwww-perl|powershell|java|node|okhttp)/i;
  if (blockedBots.test(ua)) {
    return new Response('Blocked bot', { status: 403 });
  }

  // ✅ Default pass-through for humans and normal browsers
  return context.next();
};
