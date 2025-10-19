export default async (request, context) => {
  const country = context.geo?.country?.code || '';
  const blockedCountries = ['CN', 'RU', 'IR', 'KP'];

  // Block listed countries
  if (blockedCountries.includes(country)) {
    return new Response('Access Denied', {
      status: 403,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'x-robots-tag': 'noindex, nofollow'
      }
    });
  }

  // You can also block certain bots by header
  const ua = request.headers.get('user-agent') || '';
  if (/python|curl|scrapy|spider|bot/i.test(ua)) {
    return new Response('Blocked bot', { status: 403 });
  }

  return context.next();
};