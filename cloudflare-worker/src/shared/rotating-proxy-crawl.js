// Confirmed rotating IPv6 crawl observed on November 6 and 17, 2026.
// The Paris pool shares the Washington burst timing and frozen fingerprints.
// Require both the observed address pools and their frozen browser versions;
// neither a US location nor an old browser alone is sufficient to block.
export function isRotatingProxyCrawler({ ip, ip_hash, ua, userAgent } = {}) {
  const address = String(ip || ip_hash || '').trim().toLowerCase();
  if (!/^(?:2a10:(?:4a0[0-7]|7b0[0-7])|2a13:0?f4[0-7]):/.test(address)) return false;
  const browser = String(ua || userAgent || '');
  return /\bChrome\/(?:118|119|120)\.0\.0\.0\b/.test(browser)
    || /\bFirefox\/(?:120|121)\.0\b/.test(browser);
}

export function isRotatingProxyCrawlRequest(request) {
  if (request?.cf?.botManagement?.verifiedBot) return false;
  return isRotatingProxyCrawler({
    ip: request?.headers?.get?.('CF-Connecting-IP'),
    ua: request?.headers?.get?.('User-Agent'),
  });
}
