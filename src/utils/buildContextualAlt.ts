/**
 * buildContextualAlt.ts
 * 
 * Injects page-specific context into image alt text at render time.
 * Does NOT mutate source data — pure function, deterministic output.
 * 
 * SEMANTIC SUFFICIENCY: Only enriches alt text when the base alt does not
 * already satisfy the hub's term intent. Prevents keyword over-concentration
 * on hub pages while preserving AI semantic grounding.
 * 
 * TIERS:
 *   - Tier A (hero/carousel): Concise base alt, no suffix if semantically sufficient
 *   - Tier B (navigation/tombstones): Functional alt only, never enriched
 *   - Tier C (samples/featured): Rich base alt, enriched only if insufficient
 * 
 * Usage:
 *   const alt = buildContextualAlt(image.alt, pageContext, { index: 0, tier: 'A' });
 */

export interface PageContext {
  /** The primary topic of the page (for fallback) */
  topic: string;
  /** Pool of keyword phrases to rotate through */
  keywordPool: string[];
  /** Semantic signals that indicate alt already covers the hub topic */
  semanticSignals?: string[];
}

export type AltTier = 'A' | 'B' | 'C';

export interface AltOptions {
  /** Image index for deterministic keyword rotation */
  index?: number;
  /** Alt text tier: A=hero/carousel, B=nav/tombstone, C=samples/featured */
  tier?: AltTier;
  /** If true, this is a duplicated decorative image (returns empty alt) */
  isDecorativeDuplicate?: boolean;
}

/**
 * Checks if the base alt text already has semantic coverage for the hub topic.
 * Returns true if any semantic signal is found in the alt text.
 */
function hasSemanticCoverage(alt: string, signals: string[]): boolean {
  if (!signals || signals.length === 0) return false;
  
  const normalizedAlt = alt.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ');
  
  return signals.some(signal => {
    const normalizedSignal = signal.toLowerCase().trim();
    return normalizedAlt.includes(normalizedSignal);
  });
}

/**
 * Builds contextual alt text with semantic sufficiency checking.
 * 
 * @param originalAlt - The original alt text from the image database
 * @param pageContext - Page-level context with topic, keyword pool, and semantic signals
 * @param options - Alt tier, index for rotation, and decorative duplicate flag
 * @returns Contextual alt text (or empty string for decorative duplicates)
 * 
 * @example
 * // Already sufficient - returns base alt unchanged
 * buildContextualAlt("Western cowboy portrait in morning light", westernContext, { tier: 'A' })
 * // Returns: "Western cowboy portrait in morning light"
 * 
 * @example
 * // Insufficient - adds suffix
 * buildContextualAlt("Man in red shirt and hat", westernContext, { tier: 'C', index: 0 })
 * // Returns: "Man in red shirt and hat — Western fine art photography."
 * 
 * @example
 * // Decorative duplicate - returns empty
 * buildContextualAlt("Any alt", context, { isDecorativeDuplicate: true })
 * // Returns: ""
 */
export function buildContextualAlt(
  originalAlt: string | undefined,
  pageContext: PageContext | undefined,
  options: AltOptions | number = {}
): string {
  // Support legacy signature: buildContextualAlt(alt, context, index)
  const opts: AltOptions = typeof options === 'number' 
    ? { index: options } 
    : options;
  
  const { index = 0, tier = 'C', isDecorativeDuplicate = false } = opts;
  
  // Decorative duplicates (e.g., infinite scroll copies) get empty alt
  if (isDecorativeDuplicate) {
    return '';
  }
  
  // Fallback if no original alt
  const alt = originalAlt?.trim() || 'Fine art photograph';
  
  // If no page context, return original alt unchanged
  if (!pageContext || !pageContext.keywordPool?.length) {
    return alt;
  }
  
  // Tier B (navigation/tombstones): Never enrich, return base alt only
  if (tier === 'B') {
    return alt;
  }
  
  // Check semantic sufficiency - if alt already covers the topic, don't add suffix
  const signals = pageContext.semanticSignals || [];
  if (hasSemanticCoverage(alt, signals)) {
    return alt;
  }
  
  // Alt is insufficient - add contextual suffix
  // Rotate through keyword pool deterministically based on index
  const keyword = pageContext.keywordPool[index % pageContext.keywordPool.length];
  
  // Use natural suffix format: "{originalAlt} — {keyword}."
  return `${alt} — ${keyword}.`;
}

/**
 * Pre-configured page contexts for hub pages.
 * Each includes semantic signals for sufficiency checking.
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
    semanticSignals: [
      'western',
      'cowboy',
      'frontier',
      'american west',
      'indigenous',
      'native american',
      'ranch',
      'rodeo',
      'outlaw',
      'vaquero',
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
    semanticSignals: [
      'cowboy',
      'western',
      'ranch',
      'rodeo',
      'frontier',
      'vaquero',
      'wrangler',
      'horseman',
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
    semanticSignals: [
      'western',
      'cowboy',
      'black and white',
      'monochrome',
      'frontier',
      'american west',
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
    semanticSignals: [
      'painterly',
      'western',
      'cowboy',
      'fine art',
      'artistic',
      'cinematic',
      'frontier',
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
    semanticSignals: [
      'western',
      'cowboy',
      'wall art',
      'print',
      'decor',
      'frontier',
      'american west',
    ],
  },
};

/**
 * Helper to get page context by path (for client-side use)
 */
export function getPageContext(pathname: string): PageContext | undefined {
  return hubPageContexts[pathname];
}
