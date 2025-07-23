import { siteNav } from "../../data/siteNav.ts";
const allGalleryData = import.meta.glob('../../data/Galleries/**/*.mjs', { eager: true });

const GHOST_IMAGE_ID = "i-k4studios";

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Walk siteNav and gather all image data for current section's child galleries
function getAllGalleryImages(currentPath, featheredIds = new Set()) {
  const results = [];
  function walk(node) {
    if (node.href === currentPath && node.children) {
      for (const child of node.children) {
        const path = '../../data' + child.href + '.mjs';
        const mod = allGalleryData[path];
        const images = (mod?.galleryData || mod?.default || [])
          .filter(img => img.id && img.id !== GHOST_IMAGE_ID && !featheredIds.has(img.id));
        for (const img of images) {
          results.push({
            ...img,
            href: `${child.href}/${img.id.startsWith("i-") ? img.id : `i-${img.id}`}`,
          });
        }
      }
    } else if (node.children) {
      for (const child of node.children) walk(child);
    }
  }
  for (const n of siteNav) walk(n);
  return results;
}

export function autoLinkKeywordsInText(
  html,
  featheredImages,
  currentPath
) {
  if (!html || typeof html !== "string") return html;

  const featheredIds = new Set(featheredImages.map(img => img.id));
  const allGalleryImages = getAllGalleryImages(currentPath, featheredIds);
  let imgIdx = 0;
  const usedImageIds = new Set();

  // Build keyword list from phrases and synonyms (assuming you import semantic)
  const { semantic } = await import("../../data/semantic/K4-Sem.ts");
  const canonicalMap = {};
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

  let match, matches = [];
  while ((match = regex.exec(html)) !== null) {
    matches.push({ index: match.index, keyword: match[1] });
  }
  matches.reverse();

  let output = html;
  const alreadyLinkedCanonicals = new Set();

  for (const { index, keyword } of matches) {
    const lower = keyword.toLowerCase();
    const canonical = canonicalMap[lower];
    if (!canonical || alreadyLinkedCanonicals.has(canonical)) continue;

    // Pick the next unused image
    let pick;
    while (imgIdx < allGalleryImages.length) {
      if (!usedImageIds.has(allGalleryImages[imgIdx].id)) {
        pick = allGalleryImages[imgIdx];
        usedImageIds.add(pick.id);
        imgIdx++;
        break;
      }
      imgIdx++;
    }
    const href = pick ? pick.href : "";

    output = output.slice(0, index) +
      `<a href="${href}" class="kw-link">${keyword}</a>` +
      output.slice(index + keyword.length);
    alreadyLinkedCanonicals.add(canonical);
  }
  return output;
}
