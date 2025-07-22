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

export function autoLinkKeywordsInText(html: string): string {
  if (!html || typeof html !== "string") return html;

  const canonicalMap: Record<string, string> = {};

  // Add canonical phrases
  for (const phrase of semantic.phrases || []) {
    const norm = phrase.trim().toLowerCase();
    canonicalMap[norm] = norm;
  }

  // Add synonyms and route to their canonical
  for (const [canonical, synonyms] of Object.entries(semantic.synonymMap || {})) {
    const key = canonical.trim().toLowerCase();
    canonicalMap[key] = key;
    for (const syn of synonyms || []) {
      const synNorm = syn.trim().toLowerCase();
      if (!canonicalMap[synNorm]) {
        canonicalMap[synNorm] = key;
      }
    }
  }

  const allMatchablePhrases = Object.keys(canonicalMap);
  const sortedPhrases = allMatchablePhrases.sort((a, b) => b.split(" ").length - a.split(" ").length);
  const regex = new RegExp(`\\b(${sortedPhrases.map(escapeRegex).join("|")})\\b`, "gi");

  let match;
  const matches = [];
  while ((match = regex.exec(html)) !== null) {
    matches.push({ index: match.index, keyword: match[1] });
  }
  matches.reverse(); // process from back to front to avoid index shifts

  let output = html;
  const alreadyLinkedCanonicals = new Set<string>();

  for (const { index, keyword } of matches) {
    const kwLower = keyword.toLowerCase();
    const canonical = canonicalMap[kwLower];
    if (!canonical || alreadyLinkedCanonicals.has(canonical)) continue;

    const slug = slugify(canonical);
    const href = `/linked/${slug}`;

    output =
      output.slice(0, index) +
      `<a href="${href}" class="kw-link">${keyword}</a>` +
      output.slice(index + keyword.length);

    alreadyLinkedCanonicals.add(canonical);
  }

  return output;
}
