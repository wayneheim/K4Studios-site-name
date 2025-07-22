import { semantic } from "../../data/semantic/K4-Sem.ts";

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function autoLinkKeywordsInText(html: string): string {
  if (!html || typeof html !== "string") return html;

  const linkableTerms = Array.isArray(semantic.mainKeywords) ? semantic.mainKeywords : [];

  // Sort longest to shortest to avoid partial collisions
  const sortedTerms = [...linkableTerms].sort((a, b) => b.length - a.length);

  for (const keyword of sortedTerms) {
    const regex = new RegExp(`(?<!["'>])\\b(${escapeRegex(keyword)})\\b`, "gi");

    // Use a dummy link with keyword as slug for now
    const fakeSlug = keyword.toLowerCase().replace(/\s+/g, "-");
    const href = `/test-link/${fakeSlug}`;

    html = html.replace(regex, `<a href="${href}" class="kwlink">$1</a>`);
  }

  return html;
}
