export default async (request, context) => {
  const url = new URL(request.url);

  // ✅ Always allow sitemap, robots.txt, IndexNow key, and preflight/HEAD requests
  const alwaysAllowedPaths = [
    '/sitemap.xml',
    '/robots.txt',
    '/e05ffc8ff8004372b01c0e153ba16b44.txt', // IndexNow key
  ];
  if (
    alwaysAllowedPaths.includes(url.pathname) ||
    request.method === 'HEAD' ||
    request.method === 'OPTIONS'
  ) {
    return context.next();
  }

  // 🤖 User-agent filtering
  const ua = request.headers.get('user-agent') || '';

  // ✅ Allow verified crawlers, audit tools, social unfurlers, uptime monitors, and Google service bots
  const allowedBots =
    /(googlebot|google-inspectiontool|adsbot-google|googleother|apis-google|bingbot|duckduckbot|yandex|baiduspider|slurp|petalbot|ahrefsbot|ahrefssiteaudit|semrushbot(?!-bai)|screaming\s+frog|sitebulb|applebot|facebookexternalhit|facebot|linkedinbot|twitterbot|pinterestbot|slackbot|discordbot|telegrambot|uptimerobot|uptime[- ]?kuma)/i;
  if (allowedBots.test(ua)) return context.next(); // bots allowed globally

  // 🌍 Geo blocking — Deno.env for Edge Functions
  const blockedEnv = Deno.env.get('BLOCKED_COUNTRIES') || 'CN,RU,IR,KP';
  const blockedCountries = blockedEnv.split(',').map((c) => c.trim().toUpperCase());
  const country = (context.geo?.country?.code || '').toUpperCase();

  if (blockedCountries.includes(country)) {
    return new Response('Access Denied', {
      status: 403,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'x-robots-tag': 'noindex, nofollow',
      },
    });
  }

  // ❌ Block scrapers and developer tools (do NOT move above allowedBots)
  const blockedBots =
    /(python|curl|scrapy|spider(?!.*google)|httpclient|axios|wget|postman|libwww-perl|powershell|java|node|okhttp)/i;
  if (blockedBots.test(ua)) {
    console.log('Blocked UA:', ua);
    return new Response('Blocked bot', {
      status: 403,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'x-robots-tag': 'noindex, nofollow',
      },
    });
  }

  // ✅ Default pass-through for humans and normal browsers
  return context.next();
};
