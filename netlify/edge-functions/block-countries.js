export default async (request, context) => {
  const url = new URL(request.url);

  // ✅ Always allow access to sitemap and robots.txt (for SEO crawlers)
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

  // 🤖 User-agent blocking (lightweight bot filter)
  const ua = request.headers.get('user-agent') || '';

  // ✅ Allow major crawlers (Google, Bing, DuckDuckGo, etc.)
  const allowedBots = /(googlebot|bingbot|duckduckbot|yandex|baiduspider|slurp|petalbot)/i;
  if (allowedBots.test(ua)) {
    return context.next();
  }

  // ❌ Block suspicious or scraping user agents
  const blockedBots = /(python|curl|scrapy|spider|bot|httpclient|axios|wget|postman)/i;
  if (blockedBots.test(ua)) {
    return new Response('Blocked bot', { status: 403 });
  }

  // ✅ Default pass-through
  return context.next();
};
