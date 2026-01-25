/**
 * Ensures meta descriptions meet minimum length requirements for SEO.
 * Bing recommends 150-160 characters for optimal display.
 * 
 * If description is too short, appends gallery context or returns fallback.
 */

const MIN_DESCRIPTION_LENGTH = 120;

export function ensureMetaDescription(
  description: string | undefined | null,
  galleryContext: string,
  fallback: string
): string {
  // Clean and check the description
  const cleanDesc = (description || '').trim();
  
  // If no description or very short, use fallback
  if (!cleanDesc || cleanDesc.length < 30) {
    return fallback;
  }
  
  // If description meets minimum, use it
  if (cleanDesc.length >= MIN_DESCRIPTION_LENGTH) {
    return cleanDesc;
  }
  
  // Description exists but is too short - enrich with gallery context
  const enriched = `${cleanDesc} — ${galleryContext}`;
  
  // If enriched is still too short, append more context
  if (enriched.length >= MIN_DESCRIPTION_LENGTH) {
    return enriched;
  }
  
  // Final fallback: use the gallery's base description
  return fallback;
}
