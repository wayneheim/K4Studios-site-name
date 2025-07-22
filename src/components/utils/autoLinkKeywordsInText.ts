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

  const defaultHrefBase = "/linked";
  const phrases = new Set<string>();

  // mainKeywords
  (semantic.mainKeywords || []).forEach(p => phrases.add(p.toLowerCase()));

  // linkOverrides
  (semantic.linkOverrides || []).forEach(p => phrases.add(p.toLowerCase()));

  // longTails
  (semantic.longTails || []).forEach(p => phrases.add(p.toLowerCase()));

  // synonymMap: both keys and values
  if (semantic.synonymMap) {
    for (const canonical in semantic.synonymMap) {
      phrases.add(canonical.toLowerCase());
      for (const syn of semantic.synonymMap[canonical] || []) {
        phrases.add(syn.toLowerCase());
      }
    }
  }

  // Sort longest to shortest for greedy match
  const sorted = Array.from(phrases).sort((a, b) => b.length - a.length);
  if (sorted.length === 0) return html;

  const keywordRegex = new RegExp(`\\b(${sorted.map(escapeRegex).join("|")})\\b`, "gi");

  let match;
  const matches = [];
  while ((match = keywordRegex.exec(html)) !== null) {
    matches.push({ index: match.index, keyword: match[1] });
  }
  matches.reverse();

  let output = html;
  const alreadyLinked = new Set<string>();

  for (const { index, keyword } of matches) {
    const kwLower = keyword.toLowerCase();
    if (alreadyLinked.has(kwLower)) continue;

    const slug = slugify(keyword);
    const href = `${defaultHrefBase}/${slug}`;

    output = output.slice(0, index) +
      `<a href="${href}" class="kw-link">${keyword}</a>` +
      output.slice(index + keyword.length);

    alreadyLinked.add(kwLower);
  }

  return output;
}
