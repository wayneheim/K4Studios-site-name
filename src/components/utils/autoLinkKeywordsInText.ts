import { semantic } from "../../data/semantic/K4-Sem.ts";

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .trim();
}

function buildLinkMap(): Record<string, string> {
  const map: Record<string, string> = {};

  // Convert override phrases to hrefs using slug
  if (Array.isArray(semantic.linkOverrides)) {
    for (const phrase of semantic.linkOverrides) {
      const slug = slugify(phrase);
      map[phrase.toLowerCase()] = `/linked/${slug}`;
    }
  }

  // Add main keywords if not already in map
  if (Array.isArray(semantic.mainKeywords)) {
    for (const term of semantic.mainKeywords) {
      const slug = slugify(term);
      const lc = term.toLowerCase();
      if (!map[lc]) {
        map[lc] = `/linked/${slug}`;
      }
    }
  }

  // Add synonyms
  if (semantic.synonymMap) {
    for (const canonical in semantic.synonymMap) {
      const canonicalSlug = slugify(canonical);
      const synonyms = semantic.synonymMap[canonical] || [];
      for (const syn of synonyms) {
        const lc = syn.toLowerCase();
        if (!map[lc]) {
          map[lc] = `/linked/${canonicalSlug}`;
        }
      }
    }
  }

  return map;
}

export function autoLinkKeywordsInText(html: string): string {
  if (!html || typeof html !== "string") return html;

  let result = html;
  const linkMap = buildLinkMap();

  // Sort phrases longest to shortest
  const phrases = Object.keys(linkMap).sort((a, b) => b.length - a.length);

  const alreadyLinked = new Set<string>();

  for (const phrase of phrases) {
    if (alreadyLinked.has(phrase)) continue;

    const regex = new RegExp(`(?<!["'>])\\b(${escapeRegex(phrase)})\\b`, "gi");

    result = result.replace(regex, (match) => {
      if (alreadyLinked.has(match.toLowerCase())) return match; // prevent relinking
      alreadyLinked.add(match.toLowerCase());

      const href = linkMap[phrase.toLowerCase()];
      return `<a href="${href}" class="kwlink">${match}</a>`;
    });
  }

  return result;
}
