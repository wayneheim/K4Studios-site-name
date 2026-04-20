const ATTRIBUTION_PATTERNS = [
  /\s*[|\-\u2013\u2014]?\s*photography by wayne heim\.?$/i,
  /\s*[|\-\u2013\u2014]?\s*by wayne heim\.?$/i,
  /\s*[|\-\u2013\u2014]?\s*wayne heim\s*[\u2013\-]\s*fine art photography\.?$/i,
  /\s*[|\-\u2013\u2014]?\s*fine art image by wayne heim\.?$/i,
  /\s*[|\-\u2013\u2014]?\s*photographic artwork\.?$/i,
  /\s*\u00a9\s*wayne heim\.?$/i,
  /\s*copyright\s*wayne heim\.?$/i,
];

const PROMOTIONAL_PATTERNS = [
  /\bdiscover\b/i,
  /\bdelve\b/i,
  /\bexplor(?:e|ing)\b/i,
  /\bperfect for\b/i,
  /\bcollectors?\b/i,
  /\bpowerful statement\b/i,
  /\bthis work\b/i,
  /\bhighlights\b/i,
  /\bcomes alive\b/i,
  /\bembodies\b/i,
  /\bcompelling\b/i,
  /\benhance their collection\b/i,
];

const GENERIC_CANDIDATE_PATTERNS = [
  /^image$/i,
  /^photo(?:graphy)?$/i,
  /^fine art(?: photography)?$/i,
  /^photographic artwork$/i,
  /^wayne heim$/i,
  /^wayne heim fine art photography$/i,
  /^portrait$/i,
  /^gallery$/i,
  /^artwork$/i,
];

const GENERIC_COMPOSITION_TOKENS = new Set([
  'fine',
  'art',
  'painterly',
  'portrait',
  'portraits',
  'photography',
  'photo',
  'image',
  'traditional',
  'narrative',
  'thematic',
  'western',
  'historical',
  'historic',
  'black',
  'white',
  'and',
  'color',
  'monochrome',
  'classic',
]);

const GENERIC_PERSON_SUBJECT_PATTERNS = [
  /^woman$/i,
  /^young subject$/i,
  /^young lady$/i,
  /^sleeping figure$/i,
  /^family portrait$/i,
  /^senior portrait$/i,
  /^historical reenactor$/i,
  /^western reenactor$/i,
  /^western figure$/i,
  /^bride$/i,
  /^1880s-era woman$/i,
  /^portrait$/i,
];

const DEFINING_TRAIT_LABELS: Record<string, string> = {
  reflection: 'Reflective',
  authority: 'Authoritative',
  consequence: 'Consequence-Marked',
  aftermath: 'Aftermath-Marked',
  endurance: 'Enduring',
  restraint: 'Restrained',
  resolve: 'Resolute',
  vigilance: 'Vigilant',
};

const GENERIC_TITLE_TERMS = /\b(?:fine art|photograph(?:y)?|photo|image|artwork|gallery|wall art|decor|collection|collector|portrait|print|art)\b/i;
const FRAGMENT_END_PATTERNS = /\b(?:a|an|the|in|on|at|by|for|of|with|from|to|into|onto|toward|towards|inside|outside|holding|carrying|standing|peering|looking|watching|saying|raised|braced|wearing|during|through|near|beyond|across|under|over)\b$/i;

const CONTEXT_LABELS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\/Facing-History\/Western-Cowboy-Portraits\/Black-White/i, label: 'Black and White Cowboy Portrait' },
  { pattern: /\/Facing-History\/Western-Cowboy-Portraits\/Color/i, label: 'Cowboy Portrait' },
  { pattern: /\/Facing-History\/Wild-West\/Native-Americans\//i, label: 'Native American Portrait' },
  { pattern: /\/Facing-History\/Wild-West\/Western-Narratives\//i, label: 'Western Narrative Scene' },
  { pattern: /\/Facing-History\/Civil-War-Portraits\//i, label: 'Civil War Portrait' },
  { pattern: /\/Facing-History\/WWII\/Portraits\//i, label: 'WWII Portrait' },
  { pattern: /\/Facing-History\/WWII\/War\//i, label: 'WWII Battle Scene' },
  { pattern: /\/Facing-History\/WWII\/Machines\//i, label: 'WWII Military Vehicle' },
  { pattern: /\/Facing-History\/Roaring-20s-Portraits\//i, label: 'Roaring Twenties Portrait' },
  { pattern: /\/Portraits\/Black-White/i, label: 'Black and White Portrait' },
  { pattern: /\/Portraits\/Color/i, label: 'Color Portrait' },
  { pattern: /\/Portraits\/Reenactors/i, label: 'Reenactor Portrait' },
  { pattern: /\/Transportation\/Trains/i, label: 'Train Photograph' },
  { pattern: /\/Transportation\/Cars/i, label: 'Classic Car Photograph' },
  { pattern: /\/Transportation\/Planes/i, label: 'Aircraft Photograph' },
  { pattern: /\/Transportation\/Military/i, label: 'Military Vehicle Photograph' },
  { pattern: /\/Transportation\/Boats/i, label: 'Boat Photograph' },
  { pattern: /\/Landscapes\/By-Theme\/Water/i, label: 'Water Landscape Photograph' },
  { pattern: /\/Landscapes\/By-Theme\/Sunsets/i, label: 'Sunset Landscape Photograph' },
  { pattern: /\/Landscapes\/By-Theme\/Mountains/i, label: 'Mountain Landscape Photograph' },
  { pattern: /\/Landscapes\/By-Theme\/Black-White/i, label: 'Black and White Landscape Photograph' },
  { pattern: /\/Landscapes\/By-Theme\/Color/i, label: 'Landscape Photograph' },
  { pattern: /\/Architecture\//i, label: 'Architectural Photograph' },
  { pattern: /\/Miscellaneous\/Pets/i, label: 'Pet Photograph' },
  { pattern: /\/Miscellaneous\/Wildlife/i, label: 'Wildlife Photograph' },
  { pattern: /\/Miscellaneous\/Reenactments/i, label: 'Historical Reenactment Photograph' },
  { pattern: /\/Miscellaneous\/Portraits/i, label: 'Fine Art Portrait' },
  { pattern: /\/Engrained/i, label: 'Engrained Fine Art Photograph' },
  { pattern: /\/Archive/i, label: 'Fine Art Photograph' },
];

function normalizeWhitespace(value = ''): string {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripAttribution(value = ''): string {
  let cleaned = normalizeWhitespace(value).replace(/\u00a9/g, '');
  for (const pattern of ATTRIBUTION_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }
  return normalizeWhitespace(cleaned);
}

function trimPunctuation(value = ''): string {
  return String(value || '').replace(/^[\s,.:;!\-]+|[\s,.:;!\-]+$/g, '').trim();
}

function stripLeadingArticle(value = ''): string {
  return String(value || '').replace(/^(?:a|an|the)\s+/i, '').trim();
}

function capitalizeFirst(value = ''): string {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function truncateWords(value = '', maxWords = 8): string {
  const words = String(value || '').trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(' ');
  return words.slice(0, maxWords).join(' ');
}

function countWords(value = ''): number {
  return String(value || '').trim().split(/\s+/).filter(Boolean).length;
}

function looksLikeSentenceFragment(value = ''): boolean {
  const cleaned = normalizeWhitespace(value);
  const wordCount = countWords(cleaned);

  if (!cleaned || wordCount < 4) return false;
  if (wordCount >= 6 && /[,;:]/.test(cleaned)) return true;
  return FRAGMENT_END_PATTERNS.test(cleaned);
}

function extractStructuredSubject(value = ''): string {
  const cleaned = stripAttribution(value);
  const patterns = [
    /\b(?:portrait|photograph|photo|image) of (?:an?\s+)?(.+?)(?:,\s+defined by|,\s+where|,|\.|$)/i,
    /^(?:an?\s+)?(.+?)\s+(?:stands|sits|kneels|rides|waits|holds|peers|looks|gazes|leans|walks|works|prepares|braces)\b/i,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (!match?.[1]) continue;
    const subject = augmentGenericSubjectWithTrait(match[1], cleaned)
      .replace(/^Color\s+/i, '')
      .replace(/^Black and White\s+/i, '');
    if (subject && !isWeakCandidate(subject) && !looksLikeSentenceFragment(subject)) {
      return subject;
    }
  }

  return '';
}

function extractNamedWorkTitle(value = ''): string {
  const cleaned = stripAttribution(value);
  if (!cleaned) return '';

  const candidates = cleaned
    .split('|')
    .flatMap((part) => part.split(/\s+[\-:]\s+/))
    .map((part) => trimPunctuation(part))
    .filter(Boolean);

  for (const candidate of candidates) {
    const normalized = normalizeWhitespace(candidate);
    const wordCount = countWords(normalized);
    if (wordCount < 2 || wordCount > 6) continue;
    if (PROMOTIONAL_PATTERNS.some((pattern) => pattern.test(normalized))) continue;
    if (GENERIC_TITLE_TERMS.test(normalized)) continue;

    const subject = cleanSubject(normalized);
    if (subject && !isWeakCandidate(subject) && !looksLikeSentenceFragment(subject)) {
      return subject;
    }
  }

  return '';
}

function normalizeCandidate(value = ''): string {
  let cleaned = stripAttribution(value)
    .replace(/^[-|:]+/, '')
    .replace(/\s+[|:-]\s+/g, ' | ')
    .trim();

  if (cleaned.includes('|')) {
    const parts = cleaned.split('|').map((part) => trimPunctuation(part)).filter(Boolean);
    cleaned = parts[0] || cleaned;
  }

  if (cleaned.includes(':')) {
    const parts = cleaned.split(':').map((part) => trimPunctuation(part)).filter(Boolean);
    const firstPart = parts[0] || '';
    const secondPart = parts[1] || '';
    if (/\b(?:wwii|civil war|cowboy|reenactor|native american|landscape|train|car|portrait)\b/i.test(firstPart)) {
      cleaned = firstPart;
    } else if (secondPart) {
      cleaned = secondPart;
    }
  }

  cleaned = cleaned
    .replace(/\b(?:fine art|photograph(?:y)?|photo|image|artwork)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return trimPunctuation(cleaned);
}

function tokenizeCandidate(value = ''): string[] {
  return normalizeCandidate(value).toLowerCase().match(/[a-z0-9]+/g) || [];
}

function isGenericTokenComposition(value = ''): boolean {
  const tokens = tokenizeCandidate(value);
  if (!tokens.length) return false;
  return tokens.every((token) => GENERIC_COMPOSITION_TOKENS.has(token));
}

function hasSameNormalizedCandidate(first = '', second = ''): boolean {
  const normalizedFirst = normalizeCandidate(first).toLowerCase();
  const normalizedSecond = normalizeCandidate(second).toLowerCase();
  return Boolean(normalizedFirst && normalizedSecond && normalizedFirst === normalizedSecond);
}

function isWeakCandidate(value = ''): boolean {
  const cleaned = normalizeCandidate(value);
  if (!cleaned) return true;
  if (cleaned.length < 3) return true;
  if (GENERIC_CANDIDATE_PATTERNS.some((pattern) => pattern.test(cleaned))) return true;
  if (isGenericTokenComposition(cleaned)) return true;
  return false;
}

function extractDefiningTrait(description = ''): string {
  const cleaned = stripAttribution(description);
  const match = cleaned.match(/\bdefined by ([^.,;]+?)(?: rather than [^.,;]+)?(?:[.,;]|$)/i);
  return trimPunctuation(match?.[1] || '').toLowerCase();
}

function augmentGenericSubjectWithTrait(subject = '', description = ''): string {
  const cleanedSubject = cleanSubject(subject);
  if (!cleanedSubject) return '';
  if (!GENERIC_PERSON_SUBJECT_PATTERNS.some((pattern) => pattern.test(cleanedSubject))) {
    return cleanedSubject;
  }

  const trait = extractDefiningTrait(description);
  if (!trait) return cleanedSubject;

  const traitLabel = DEFINING_TRAIT_LABELS[trait] || capitalizeFirst(trait);
  return `${traitLabel} ${cleanedSubject}`;
}

function cleanSubject(value = ''): string {
  let subject = stripAttribution(value)
    .replace(/^(?:this|that)\s+/i, '')
    .replace(/\b(?:defined by|where|using|through|highlighting|captured by|perfect for|great for)\b.*$/i, '')
    .replace(/\s+at\s+[A-Z][\w'\-]*(?:\s+[A-Z][\w'\-]*)+$/g, '')
    .replace(/\s*[-|:]\s*$/g, '')
    .trim();

  subject = stripLeadingArticle(subject);
  subject = trimPunctuation(subject);
  subject = truncateWords(subject, 9);

  return capitalizeFirst(subject);
}

function extractStrongDescriptionSubject(description = ''): string {
  const structuredSubject = extractStructuredSubject(description);
  if (structuredSubject) return structuredSubject;

  const cleaned = stripAttribution(description);
  const patterns = [
    /\bphotograph of (?:an?\s+)?(.+?)(?:,\s+defined by|,\s+where|\.|$)/i,
    /\bphoto of (?:an?\s+)?(.+?)(?:,\s+defined by|,\s+where|\.|$)/i,
    /^portrait of (.+?)(?:\.|,|$)/i,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (!match?.[1]) continue;
    const subject = augmentGenericSubjectWithTrait(match[1], cleaned);
    if (subject && !isWeakCandidate(subject) && !looksLikeSentenceFragment(subject)) {
      return subject;
    }
  }

  const firstSentence = trimPunctuation((cleaned.split(/[.!?]/)[0] || '').trim());
  if (!firstSentence) return '';
  if (PROMOTIONAL_PATTERNS.some((pattern) => pattern.test(firstSentence))) return '';

  const subject = augmentGenericSubjectWithTrait(firstSentence, cleaned);
  return isWeakCandidate(subject) || looksLikeSentenceFragment(subject) ? '' : subject;
}

function extractAltOrTitleSubject(value = ''): string {
  const structuredSubject = extractStructuredSubject(value);
  if (structuredSubject) return structuredSubject;

  const candidate = normalizeCandidate(value);
  if (isWeakCandidate(candidate)) return '';
  const subject = cleanSubject(candidate);
  return looksLikeSentenceFragment(subject) ? '' : subject;
}

function inferContextLabel(galleryPath = '', galleryTitle = ''): string {
  const normalizedPath = String(galleryPath || '');
  for (const entry of CONTEXT_LABELS) {
    if (entry.pattern.test(normalizedPath)) {
      return entry.label;
    }
  }

  const title = trimPunctuation(stripAttribution(galleryTitle));
  if (title) return title;

  const segments = normalizedPath
    .split('/')
    .filter(Boolean)
    .filter((segment) => !['Galleries', 'Gallery', 'Other'].includes(segment))
    .slice(-2)
    .map((segment) => segment.replace(/-/g, ' '));

  return segments.join(' ') || 'Fine Art Photograph';
}

function composeTitle(
  subject: string,
  contextLabel: string,
  source: 'alt' | 'description' | 'named-title' | 'title' | 'story' = 'description'
): string {
  const cleanedSubject = cleanSubject(subject);
  const cleanedContext = trimPunctuation(contextLabel);

  if (!cleanedSubject) return cleanedContext || 'Fine Art Photograph';

  const wordCount = cleanedSubject.split(/\s+/).filter(Boolean).length;
  const subjectLower = cleanedSubject.toLowerCase();
  const contextLower = cleanedContext.toLowerCase();

  if (wordCount <= 2) {
    if (contextLower.includes('black and white')) {
      return `${cleanedSubject} in Black and White`;
    }
    if (contextLower.includes('portrait') && !subjectLower.includes('portrait')) {
      return `${cleanedSubject} Portrait`;
    }
    if (cleanedContext && !subjectLower.includes(contextLower)) {
      return `${cleanedSubject} | ${cleanedContext}`;
    }
  }

  if ((source === 'named-title' || source === 'title') && cleanedContext && !subjectLower.includes(contextLower)) {
    return `${cleanedSubject} | ${cleanedContext}`;
  }

  return cleanedSubject;
}

export function buildImageSeoTitle(
  image: { title?: string; alt?: string; description?: string; story?: string } | null | undefined,
  options: { galleryPath?: string; galleryTitle?: string } = {}
): string {
  const contextLabel = inferContextLabel(options.galleryPath, options.galleryTitle);

  if (!image) return contextLabel;

  const altValue = image.alt || '';
  const titleValue = image.title || '';
  const descriptionValue = image.description || '';
  const storyValue = image.story || '';

  const altSubject = extractAltOrTitleSubject(altValue);
  const descriptionSubject = extractStrongDescriptionSubject(descriptionValue);
  const altMatchesTitle = hasSameNormalizedCandidate(altValue, titleValue);
  const namedTitle = extractNamedWorkTitle(titleValue);

  if (altSubject && !altMatchesTitle) {
    return composeTitle(altSubject, contextLabel, 'alt');
  }

  if (altMatchesTitle && (namedTitle || altSubject)) {
    return composeTitle(namedTitle || altSubject, contextLabel, 'named-title');
  }

  if (descriptionSubject) {
    return composeTitle(descriptionSubject, contextLabel, 'description');
  }

  if (namedTitle) {
    return composeTitle(namedTitle, contextLabel, 'named-title');
  }

  const titleSubject = extractAltOrTitleSubject(titleValue);
  if (titleSubject) {
    return composeTitle(titleSubject, contextLabel, 'title');
  }

  const storySubject = extractStrongDescriptionSubject(storyValue);
  return composeTitle(storySubject, contextLabel, 'story');
}