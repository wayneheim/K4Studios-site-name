import { siteNav } from "../../data/siteNav.ts";
import { semantic } from "../../data/semantic/K4-Sem.ts";

const allGalleryData = import.meta.glob('../../data/Galleries/**/*.mjs', { eager: true });

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").trim();
}

function getGallerySources(currentPath: string): { href: string, data: any[] }[] {
  const result: { href: string, data: any[] }[] = [];

  function walk(node) {
    if (node.href === currentPath && node.children) {
      for (const child of node.children) {
        const filePath = '../../data' + child.href + '.mjs';
        const mod = allGalleryData[filePath];
        const galleryData = mod?.galleryData || mod?.default || [];
        result.push({ href: child.href, data: galleryData });
      }
    } else if (node.children) {
      for (const child of node.children) walk(child);
    }
  }

  for (const top of siteNav) walk(top);
  return result;
}

export function autoLinkKeywordsInText(
  html: string,
  featheredImages: any[],
  currentPath: string
): string {
  if (!html || typeof html !== "string") return html;

  const GHOST_IMAGE_ID = "i-k4studios";
  const featheredIds = new Set(featheredImages.map(img => img.id));
  const usedImageIds = new Set<string>();

  const sources = getGallerySources(currentPath);
  const galleryDatas = sources.map(s => s.data);
  const galleryPaths = sources.map(s => s.href);

  const allGalleryImages = sources.flatMap(s =>
    s.data.filter(
      img => img.id && img.id !== GHOST_IMAGE_ID && !featheredIds.has(img.id)
    )
  );

  const canonicalMap: Record<string, string> = {};
  for (const phrase of semantic.phrases || []) {
    const norm = phrase.trim().toLowerCase();
    canonicalMap[norm] = norm;
  }
  for (const [canonical, synonyms] of Object.entries(semantic.synonymMap || {})) {
    const key = canonical.trim().toLowerCase();
    canonicalMap[key] = key;
    for (const syn of synonyms || []) {
      const synNorm = syn.trim().toLowerCase();
      if (!canonicalMap[synNorm]) canonicalMap[synNorm] = key;
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
  matches.reverse();

  let output = html;
  const alreadyLinkedCanonicals = new Set<string>();

  for (const { index, keyword } of matches) {
    const kwLower = keyword.toLowerCase();
    const canonical = canonicalMap[kwLower];
    if (!canonical || alreadyLinkedCanonicals.has(canonical)) continue;

    const fallback = allGalleryImages.find(img => !usedImageIds.has(img.id));
    let href = fallback
      ? `${galleryPaths[0]}/${fallback.id.startsWith("i-") ? fallback.id : `i-${fallback.id}`}`
      : `${galleryPaths[0]}/i-missing`;

    if (fallback) usedImageIds.add(fallback.id);

    output =
      output.slice(0, index) +
      `<a href="${href}" class="kw-link">${keyword}</a>` +
      output.slice(index + keyword.length);

    alreadyLinkedCanonicals.add(canonical);
  }

  return output;
}
