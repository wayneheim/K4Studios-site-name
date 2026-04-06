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
 * BAD ALT DETECTION: Identifies and rewrites problematic alt text:
 *   - Too short (< 15 chars)
 *   - Generic placeholders ("Photo", "Image", "Untitled", etc.)
 *   - Filename patterns ("IMG_1234", "DSC_0001", etc.)
 *   - Empty or whitespace-only
 * 
 * TIERS:
 *   - Tier A (hero/carousel): Concise base alt, no suffix if semantically sufficient
 *   - Tier B (navigation/tombstones): Functional alt only, never enriched
 *   - Tier C (samples/featured): Rich base alt, enriched only if insufficient
 * 
 * ROLLBACK: To disable bad alt rewriting, set DISABLE_ALT_REWRITE = true below.
 * 
 * Usage:
 *   const alt = buildContextualAlt(image.alt, pageContext, { index: 0, tier: 'A' });
 *   // With fallback title for bad alt rewriting:
 *   const alt = buildContextualAlt(image.alt, pageContext, { index: 0, tier: 'A', fallbackTitle: image.title });
 */

// ⚠️ ROLLBACK SWITCH: Set to true to disable bad alt rewriting
const DISABLE_ALT_REWRITE = false;

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
  /** Fallback title to use if alt is bad (from img.title) */
  fallbackTitle?: string;
  /** Fallback description to use if alt and title are bad */
  fallbackDescription?: string;
}

/**
 * Patterns that indicate a bad/placeholder alt text
 */
const BAD_ALT_PATTERNS = [
  /^image$/i,
  /^photo$/i,
  /^picture$/i,
  /^untitled$/i,
  /^no\s*title$/i,
  /^img[_\-]?\d+/i,           // IMG_1234, img-001
  /^dsc[_\-]?\d+/i,           // DSC_0001
  /^_?[A-Z]{2,4}\d{4,}/i,     // _WHZ1234, ABC12345
  /^\d+$/,                     // Just numbers
  /^\.+$/,                     // Just dots
  /^-+$/,                      // Just dashes
  /^n\/?a$/i,                  // n/a, N/A
  /^none$/i,
  /^null$/i,
  /^undefined$/i,
  /^placeholder$/i,
  /^test$/i,
  /^sample$/i,
  /^edit\s*me$/i,
  /^add\s*alt$/i,
  /^alt\s*text$/i,
  /^description$/i,
];

/**
 * Checks if alt text is "bad" and needs rewriting
 */
function isBadAlt(alt: string | undefined): boolean {
  if (DISABLE_ALT_REWRITE) return false;
  
  if (!alt) return true;
  
  const trimmed = alt.trim();
  
  // Too short to be meaningful
  if (trimmed.length < 15) return true;
  
  // Matches a known bad pattern
  if (BAD_ALT_PATTERNS.some(pattern => pattern.test(trimmed))) return true;
  
  // All caps (likely a filename or code)
  if (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && /\d/.test(trimmed)) return true;
  
  return false;
}

/**
 * Gets the best available alt text, rewriting bad alts from fallbacks
 */
function getBestAlt(
  originalAlt: string | undefined,
  fallbackTitle: string | undefined,
  fallbackDescription: string | undefined
): { alt: string; wasRewritten: boolean } {
  // If original is good, use it
  if (!isBadAlt(originalAlt)) {
    return { alt: originalAlt!.trim(), wasRewritten: false };
  }
  
  // Try fallback title
  if (fallbackTitle && !isBadAlt(fallbackTitle)) {
    return { alt: fallbackTitle.trim(), wasRewritten: true };
  }
  
  // Try fallback description (first 150 chars if long)
  if (fallbackDescription && !isBadAlt(fallbackDescription)) {
    const desc = fallbackDescription.trim();
    const truncated = desc.length > 150 ? desc.slice(0, 147) + '...' : desc;
    return { alt: truncated, wasRewritten: true };
  }
  
  // Ultimate fallback
  return { alt: 'Fine art photograph', wasRewritten: true };
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
 * Builds contextual alt text with semantic sufficiency checking and bad alt rewriting.
 * 
 * @param originalAlt - The original alt text from the image database
 * @param pageContext - Page-level context with topic, keyword pool, and semantic signals
 * @param options - Alt tier, index for rotation, decorative duplicate flag, and fallbacks
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
 * // Bad alt rewritten from fallback
 * buildContextualAlt("IMG_1234", westernContext, { tier: 'A', fallbackTitle: "Cowboy at Dawn" })
 * // Returns: "Cowboy at Dawn" (or with suffix if insufficient)
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
  
  const { 
    index = 0, 
    tier = 'C', 
    isDecorativeDuplicate = false,
    fallbackTitle,
    fallbackDescription,
  } = opts;
  
  // Decorative duplicates (e.g., infinite scroll copies) get empty alt
  if (isDecorativeDuplicate) {
    return '';
  }
  
  // Get the best available alt text (rewrites bad alts from fallbacks)
  const { alt } = getBestAlt(originalAlt, fallbackTitle, fallbackDescription);
  
  // If no page context, return the (possibly rewritten) alt unchanged
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
  '/Galleries/Painterly-Fine-Art-Photography': {
    topic: 'Painterly Fine Art Photography',
    keywordPool: [
      'painterly fine art photography',
      'painterly photography',
      'painterly style photography',
      'fine art photography',
      'cinematic photography',
    ],
    semanticSignals: [
      'painterly',
      'fine art',
      'photography',
      'narrative',
      'atmosphere',
      'tonal',
      'pictorialist',
      'cinematic',
    ],
  },
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
  '/Western-Photography-Art': {
    topic: 'Western Photography Art',
    keywordPool: [
      'Western photography art',
      'Western art photography',
      'American West photography art',
      'frontier photography art',
      'painterly Western photography',
    ],
    semanticSignals: [
      'western',
      'art',
      'photography',
      'american west',
      'frontier',
      'cowboy',
      'narrative',
      'painterly',
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
  '/Western-Frontier-Art': {
    topic: 'Western Frontier Art',
    keywordPool: [
      'Western frontier art',
      'American frontier art',
      'art of the American frontier',
      'frontier art',
      'old west frontier art',
    ],
    semanticSignals: [
      'frontier',
      'western',
      'american west',
      'cowboy',
      'indigenous',
      'settlement',
      'history',
      'nineteenth century',
    ],
  },
  '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits': {
    topic: 'Western Cowboy Portraits',
    keywordPool: [
      'Western cowboy portraits',
      'Western portrait photography',
      'cowboy portraits',
      'painterly cowboy portraits',
      'frontier character portraits',
    ],
    semanticSignals: [
      'cowboy',
      'portrait',
      'western',
      'frontier',
      'american west',
      'ranch',
      'outlaw',
      'historical',
    ],
  },
  '/Western-Black-and-White-Photography': {
    topic: 'Western Black and White Photography',
    keywordPool: [
      'Western black and white photography',
      'black and white Western photography',
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
  '/Contemporary-Western-Art': {
    topic: 'Contemporary Western Art',
    keywordPool: [
      'contemporary Western art',
      'contemporary Western photography',
      'modern Western art',
      'contemporary art of the American West',
      'present-tense Western art',
    ],
    semanticSignals: [
      'contemporary',
      'modern',
      'western',
      'american west',
      'frontier',
      'cowboy',
      'painterly',
      'present-tense',
    ],
  },
  '/Historical-Western-Art': {
    topic: 'Historical Western Art',
    keywordPool: [
      'historical Western art',
      'historical Western photography',
      'historically themed Western photography',
      'frontier art photography',
      '19th-century Western art',
    ],
    semanticSignals: [
      'historical',
      'frontier',
      'american west',
      'cowboy',
      'indigenous',
      '19th-century',
      'painterly',
      'western',
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
  // ✅ COWBOY AUTHORITY HUB – "Cowboy" as PRIMARY subject entity
  '/Cowboy-Fine-Art-Photography': {
    topic: 'Cowboy Fine Art Photography',
    keywordPool: [
      'cowboy fine art photography',
      'cowboy photography',
      'black and white cowboy photography',
      'cowboy portrait photography',
      'authentic cowboy photography',
    ],
    semanticSignals: [
      'cowboy',
      'ranch',
      'rodeo',
      'wrangler',
      'horseman',
      'vaquero',
      'frontier',
      'western',
      'black and white',
    ],
  },
  // ✅ WAYNE HEIM AUTHORITY PAGE – Entity classifier with section-specific pools
  '/wayne-heim-western-fine-art-photography': {
    topic: 'Wayne Heim Western Fine Art Photography',
    keywordPool: [
      'Western fine art photography by Wayne Heim',
      'Wayne Heim cowboy photography',
      'Wayne Heim Western photography',
      'fine art Western photography',
      'painterly Western photography',
    ],
    semanticSignals: [
      'wayne heim',
      'western',
      'cowboy',
      'frontier',
      'american west',
      'native american',
      'indigenous',
      'painterly',
      'fine art',
    ],
  },
};

/**
 * Helper to get page context by path (for client-side use)
 */
export function getPageContext(pathname: string): PageContext | undefined {
  return hubPageContexts[pathname];
}
