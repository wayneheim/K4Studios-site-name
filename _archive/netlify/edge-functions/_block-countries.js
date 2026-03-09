// Archived from netlify/edge-functions/_block-countries.js on 2026-03-08.
// Kept out of the active Netlify edge-functions directory to avoid being auto-loaded by Netlify Dev.

export default async (request, context) => {
  const url = new URL(request.url);
  const isSitemapLikePath =
    url.pathname === '/robots.txt' ||
    url.pathname === '/sitemap.xml' ||
    url.pathname === '/sitemap-index.xml' ||
    url.pathname === '/blog-sitemap.xml' ||
    /^\/image-sitemap(?:-[a-z0-9-]+)?\.xml$/i.test(url.pathname) ||
    /^\/sitemap(?:[-_a-z0-9]*)?\.xml$/i.test(url.pathname);

  // 🔒 Block /admin/* paths unless running in Netlify dev context
  if (url.pathname.startsWith('/admin')) {
    // Netlify sets CONTEXT env var: 'production', 'deploy-preview', 'branch-deploy', or 'dev'
    // In local dev, it may be undefined or 'dev'
    const netlifyContext = Deno.env.get('CONTEXT');

    // Allow if context is 'dev' OR undefined (local dev without full Netlify CLI)
    const isDev = !netlifyContext || netlifyContext === 'dev';

    if (!isDev) {
      console.log('Blocked admin access:', netlifyContext, url.pathname);
      return new Response(null, { status: 404 });
    }
  }

  // ✅ Always allow robots, all sitemap endpoints, IndexNow key, and preflight/HEAD requests.
  // These should stay fetchable regardless of geo policy.
  const alwaysAllowedPaths = [
    '/e05ffc8ff8004372b01c0e153ba16b44.txt', // IndexNow key
  ];
  if (
    isSitemapLikePath ||
    alwaysAllowedPaths.includes(url.pathname) ||
    request.method === 'HEAD' ||
    request.method === 'OPTIONS'
  ) {
    return context.next();
  }

  // 🌍 Geo blocking.
  // Apply this BEFORE bot allowlisting so search engines and humans receive the same
  // country-based treatment for normal HTML pages. That avoids crawler-only bypasses.
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

  // 🤖 User-agent filtering
  const ua = request.headers.get('user-agent') || '';

  // ✅ Allow verified crawlers, audit tools, social unfurlers, uptime monitors, and Google service bots
  const allowedBots =
    /(googlebot|google-inspectiontool|adsbot-google|googleother|apis-google|bingbot|duckduckbot|yandex|baiduspider|slurp|petalbot|ahrefsbot|ahrefssiteaudit|semrushbot(?!-bai)|screaming\s+frog|sitebulb|applebot|facebookexternalhit|facebot|linkedinbot|twitterbot|pinterestbot|slackbot|discordbot|telegrambot|uptimerobot|uptime[- ]?kuma)/i;
  if (allowedBots.test(ua)) return context.next(); // bots allowed globally

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
