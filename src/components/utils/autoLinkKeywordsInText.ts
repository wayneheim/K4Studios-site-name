import { siteNav } from "../../data/siteNav.ts";
import { semantic } from "../../data/semantic/K4-Sem.ts";
const allGalleryData = import.meta.glob('../../data/Galleries/**/*.mjs', { eager: true });

const GHOST_IMAGE_ID = "i-k4studios";

// Util to walk siteNav for all direct child galleries of current section
function getGalleryChildren(sectionPath) {
  function findNode(tree) {
    for (const node of tree) {
      if (node.href === sectionPath) return node;
      if (node.children) {
        const found = findNode(node.children, sectionPath);
        if (found) return found;
      }
    }
    return null;
  }
  const node = findNode(siteNav);
  return node?.children || [];
}

// Collect all images, feathered-excluded, grouped by gallery
function getAllGalleryImages(sectionPath, featheredIds = new Set()) {
  const galleryChildren = getGalleryChildren(sectionPath);
  const results = [];
  for (const child of galleryChildren) {
    const filePath = '../../data' + child.href + '.mjs';
    const mod = allGalleryData[filePath];
    const images = (mod?.galleryData || mod?.default || []).filter(
      img => img.id && img.id !== GHOST_IMAGE_ID && !featheredIds.has(img.id)
    );
    for (const img of images) {
      results.push({
        ...img,
        href: `${child.href}/${img.id.startsWith("i-") ? img.id : `i-${img.id}`}`
      });
    }
  }
  return results;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function autoLinkKeywordsInText(
  html,
  featheredImages,
  sectionPath
) {
  if (!html || typeof html !== "string") return html;

  const featheredIds = new Set(featheredImages.map(img => img.id));
  const allGalleryImages = getAllGalleryImages(sectionPath, featheredIds);
  const usedImageIds = new Set();

  // Canonicalize all keywords/phrases + synonyms
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

    // Pull next available image that hasn't been used yet
    const availableImages = allGalleryImages.filter(img => !usedImageIds.has(img.id));
    const pick = availableImages[0];

    if (!pick) continue; // no image left

    usedImageIds.add(pick.id);
    const href = pick.href;

    output = output.slice(0, index) +
      `<a href="${href}" class="kw-link">${keyword}</a>` +
      output.slice(index + keyword.length);
    alreadyLinkedCanonicals.add(canonical);
  }
  return output;
}
