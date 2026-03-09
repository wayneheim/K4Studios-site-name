/**
 * ARCHIVED on 2026-03-08.
 *
 * Why archived:
 * - This helper described and enabled an old crawler-vs-human decision pattern.
 * - That pattern is no longer part of the active SEO strategy.
 * - Keeping it in the live source tree risks accidental reuse and confusion during cloaking audits.
 *
 * Current state:
 * - No active usages were found in the workspace.
 * - Smart 404 and image-page policy now aim for UA-agnostic behavior on indexable pages.
 */

/**
 * Detect search engine crawlers by User-Agent.
 * Returns true if the request appears to come from a major search engine bot.
 * 
 * Used to return proper HTTP status codes:
 * - Bots get 410 Gone for deleted/missing content (helps clean index)
 * - Humans get 302 redirect to parent gallery (better UX)
 */
const BOT_UA_PATTERN = /googlebot|bingbot|yandex|baiduspider|duckduckbot|slurp|msnbot|facebookexternalhit|twitterbot|linkedinbot|applebot/i;

export function isBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return BOT_UA_PATTERN.test(userAgent);
}
