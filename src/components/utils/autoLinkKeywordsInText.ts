import { siteNav } from "../../data/siteNav.ts";
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

function scoreImageMatch(img, phrase: string): number {
  const p = phrase.toLowerCase();
  let score = 0;

  if (img.title?.toLowerCase().includes(p)) score += 2;
  if (img.alt?.toLowerCase().includes(p)) score += 1;
  if (img.description?.toLowerCase().includes(p)) score += 1;
  if (img.story?.toLowerCase().includes(p)) score += 1;

  if (Array.isArray(img.keywords)) {
    for (const kw of img.keywords) {
      if (kw?.toLowerCase().includes(p)) score += 1;
    }
  }

  const rating = img.rating ?? 0;
  if (rating === 5) score += 3;
  else if (rating === 4) score += 2;
  else if (rating === 3) score += 1;

  return score;
}

function getGalleryPathsForSection(currentPath: string): string[] {
  const result: string[] = [];

  function walk(node) {
    if (node.href === currentPath && node.children) {
      for (const child of node.children) {
        result.push(child.href);
      }
    } else if (node.children) {
      for (const child of node.children) {
        walk(child);
      }
    }
  }

  for (const top of siteNav) {
    walk(top);
  }

  return result;
}

export function autoLinkKeywordsInText(
  html: string,
  galleryDatas: any[][],
  featheredImages: any[],
  galleryPaths: string[],
  currentPath: string
): string {
  if (!html || typeof html !== "string") return html;

  const GHOST_IMAGE_ID = "i-k4studios";
  const featheredIds = new Set(featheredImages.map(img => img.id));
  const usedImageIds = new Set<string>();
  const allGalleryImages = [].concat(...galleryDatas);
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
  matches.reverse();

  const resolvedGalleryPaths = getGalleryPathsForSection(currentPath);

  let output = html;
  const alreadyLinkedCanonicals = new Set<string>();

  for (const { index, keyword } of matches) {
    const kwLower = keyword.toLowerCase();
    const canonical = canonicalMap[kwLower];
    if (!canonical || alreadyLinkedCanonicals.has(canonical)) continue;

    let bestMatch = null;
    let bestScore = 0;
    let bestPath = galleryPaths[0] || "";

    for (let i = 0; i < galleryDatas.length; i++) {
      const images = galleryDatas[i];
      for (const img of images) {
        if (!img.id || img.id === GHOST_IMAGE_ID) continue;
        if (featheredIds.has(img.id)) continue;
        if (usedImageIds.has(img.id)) continue;

        const score = scoreImageMatch(img, canonical);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = img;
          bestPath = galleryPaths[i];
        }
      }
    }

    if (!bestMatch) {
      const flatImages = allGalleryImages.filter(
        img => img.id && img.id !== GHOST_IMAGE_ID && !featheredIds.has(img.id) && !usedImageIds.has(img.id)
      );

      const fallback =
        flatImages.find(img => img.rating === 5) ||
        flatImages.find(img => img.rating === 4) ||
        flatImages.find(img => img.rating === 3) ||
        flatImages.find(img => img.id);

      if (fallback) {
        bestMatch = fallback;
        for (let i = 0; i < galleryDatas.length; i++) {
          if (galleryDatas[i].some(e => e.id === fallback.id)) {
            bestPath = galleryPaths[i];
            break;
          }
        }
      }
    }

    let href = "";

    if (bestMatch) {
      const cleanId = bestMatch.id.startsWith("i-") ? bestMatch.id : `i-${bestMatch.id}`;
      href = `${bestPath}/${cleanId}`;
      usedImageIds.add(bestMatch.id);
    } else {
      // Force fallback to current section (not /linked/slug)
      href = `${galleryPaths[0]}/i-placeholder`;
    }

    output =
      output.slice(0, index) +
      `<a href="${href}" class="kw-link">${keyword}</a>` +
      output.slice(index + keyword.length);

    alreadyLinkedCanonicals.add(canonical);
  }

  return output;
}
