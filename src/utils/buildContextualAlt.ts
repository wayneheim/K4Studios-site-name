/**
 * buildContextualAlt.ts
 * 
 * Injects page-specific context into image alt text at render time.
 * Does NOT mutate source data — pure function, deterministic output.
 * 
 * Usage:
 *   const alt = buildContextualAlt(image.alt, pageContext, imageIndex);
 * 
 * Pattern: "{originalAlt} — {rotated keyword}."
 */

export interface PageContext {
  /** The primary topic of the page (for fallback) */
  topic: string;
  /** Pool of keyword phrases to rotate through */
  keywordPool: string[];
}

/**
 * Builds contextual alt text by appending a rotated keyword phrase.
 * 
 * @param originalAlt - The original alt text from the image database
 * @param pageContext - Page-level context with topic and keyword pool
 * @param index - Image index for deterministic keyword rotation
 * @returns Contextual alt text in natural language format
 * 
 * @example
 * buildContextualAlt("Cowboy on Horseback", {
 *   topic: "Western Fine Art Photography",
 *   keywordPool: ["Western fine art photography", "painterly Western photography"]
 * }, 0)
 * // Returns: "Cowboy on Horseback — Western fine art photography."
 */
export function buildContextualAlt(
  originalAlt: string | undefined,
  pageContext: PageContext | undefined,
  index: number = 0
): string {
  // Fallback if no original alt
  const alt = originalAlt?.trim() || 'Fine art photograph';
  
  // If no page context, return original alt unchanged
  if (!pageContext || !pageContext.keywordPool?.length) {
    return alt;
  }
  
  // Rotate through keyword pool deterministically based on index
  const keyword = pageContext.keywordPool[index % pageContext.keywordPool.length];
  
  // Use natural suffix format per Quill's guidance
  // Pattern: "{originalAlt} — {keyword}."
  return `${alt} — ${keyword}.`;
}

/**
 * Pre-configured page contexts for hub pages.
 * Import and use directly, or define inline on each page.
 */
export const hubPageContexts: Record<string, PageContext> = {
  '/Western-Fine-Art-Photography': {
    topic: 'Western Fine Art Photography',
    keywordPool: [
      'Western fine art photography',
      'painterly Western photography',
      'Western art photography',
      'fine art Western photography',
      'cinematic Western photography',
    ],
  },
  '/Western-Cowboy-Photography': {
    topic: 'Western Cowboy Photography',
    keywordPool: [
      'Western cowboy photography',
      'cowboy portrait photography',
      'Western cowboy portraits',
      'fine art cowboy photography',
      'authentic Western photography',
    ],
  },
  '/Western-Black-and-White-Photography': {
    topic: 'Western Black and White Photography',
    keywordPool: [
      'Western black and white photography',
      'black and white cowboy photography',
      'monochrome Western art',
      'fine art black and white Western',
      'dramatic Western photography',
    ],
  },
  '/Painterly-Western-Photography': {
    topic: 'Painterly Western Photography',
    keywordPool: [
      'painterly Western fine art photography',
      'painterly Western photography',
      'Western fine art photography',
      'cinematic Western photography',
      'artistic Western photography',
    ],
  },
  '/Western-Wall-Art': {
    topic: 'Western Wall Art',
    keywordPool: [
      'Western wall art',
      'Western fine art prints',
      'cowboy wall art',
      'Western home decor art',
      'fine art Western prints',
    ],
  },
};

/**
 * Helper to get page context by path (for client-side use)
 */
export function getPageContext(pathname: string): PageContext | undefined {
  return hubPageContexts[pathname];
}
