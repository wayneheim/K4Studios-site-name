/**
 * Clean Redirect Utility
 * 
 * Returns a header-only HTTP redirect response with NO HTML body.
 * 
 * Why this exists:
 * Astro.redirect() generates an HTML fallback page with "Redirecting to: ..."
 * which Bing indexes as actual page content. This utility returns a pure
 * redirect response that crawlers cannot misinterpret.
 * 
 * @param url - The destination URL to redirect to
 * @param status - HTTP status code (301 for permanent, 302 for temporary)
 * @returns Response object with Location header and no body
 */
export function cleanRedirect(url: string, status: 301 | 302 | 307 | 308 = 301): Response {
  return new Response(null, {
    status,
    headers: {
      'Location': url,
      'Cache-Control': status === 301 || status === 308 
        ? 'public, max-age=31536000'  // 1 year for permanent redirects
        : 'no-cache',                  // No cache for temporary redirects
      'X-Robots-Tag': 'noindex',       // Belt + suspenders for Bing
    }
  });
}
