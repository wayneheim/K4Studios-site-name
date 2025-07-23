import { siteNav } from "../../data/siteNav.ts";
import { semantic } from "../../data/semantic/K4-Sem.ts";
const allGalleryData = import.meta.glob('../../data/Galleries/**/*.mjs', { eager: true });

const GHOST_IMAGE_ID = "i-k4studios";

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").trim();
}

function getGallerySources(currentPath: string): { href: string, images: any[] }[] {
  const results: { href: string, images: any[] }[] = [];

  function walk(node) {
    if (node.href === currentPath && node.children) {
      for (const child of node.children) {
        const path = '../../data' + child.href + '.mjs';
        const mod = allGalleryData[path];
        const images = mod?.galleryData || mod?.default || [];
        results.push({ href: child.href, images });
      }
    } else if (node.children) {
      for (const child of node.children) walk(child);
    }
  }

  for (const n of siteNav) walk(n);
  return results;
}

export function autoLinkKeywordsInText(
  html: string,
  featheredImages: any[],
  currentPath: string
): string {
  if (!html || typeof html !== "string") return html;

  const featheredIds = new Set(featheredImages.map(img => img.id));
  const usedImageIds = new Set<string>();

  const sources = getGallerySources(currentPath);
  const allGalleryImages = sources.flatMap(source =>
    source.images
      .filter(img => img.id && img.id !== GHOST_IMAGE_ID && !featheredIds.has(img.id))
      .map(img => ({ ...img, href: `${source.href}/${img.id.startsWith("i-") ? img.id : `i-${img.id}`}` }))
  );

  const canonicalMap: Record<string, string> = {};
  for (const phrase of semantic.phrases || []) {
    canonicalMap[phrase.trim().toLowerCase()] = phrase.trim().toLowerCase();
  }
  for (const [canonical, synonyms] of Object.entries(semantic.synonymMap || {})) {
    const base = canonical.trim().toLowerCase();
    canonicalMap[base] = base;
    for (const syn of synonyms) {
      const s = syn.trim().toLowerCase();
      if (!canonicalMap[s]) canonicalMap[s] = base;
    }
  }

  const allMatchable = Object.keys(canonicalMap).sort((a, b) => b.length - a.length);
  const regex = new RegExp(`\\b(${allMatchable.map(escapeRegex).join("|")})\\b`, "gi");

  const matches = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    matches.push({ index: match.index, keyword: match[1] });
  }
  matches.reverse();

  let output = html;
  const alreadyLinkedCanonicals = new Set<string>();

  for (const { index, keyword } of matches) {
    const lower = keyword.toLowerCase();
    const canonical = canonicalMap[lower];
    if (!canonical || alreadyLinkedCanonicals.has(canonical)) continue;

    const pick = allGalleryImages.find(img => !usedImageIds.has(img.id));
    const href = pick ? pick.href : `${currentPath}/i-missing`;
    if (pick) usedImageIds.add(pick.id);

    output = output.slice(0, index) + `<a href="${href}" class="kw-link">${keyword}</a>` + output.slice(index + keyword.length);
    alreadyLinkedCanonicals.add(canonical);
  }

  return output;
}