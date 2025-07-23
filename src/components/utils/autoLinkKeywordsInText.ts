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

// Classic round-robin gallery image picker (like feathered images)
function getAlternatingGalleryImages(sectionPath, featheredIds = new Set()) {
  const galleryChildren = getGalleryChildren(sectionPath);
  // For each gallery, load & shuffle images (excluding ghost & feathered)
  const galleriesWithImages = galleryChildren.map(child => {
    const filePath = '../../data' + child.href + '.mjs';
    const mod = allGalleryData[filePath];
    const allImages = (mod?.galleryData || mod?.default || []).filter(
      img => img.id && img.id !== GHOST_IMAGE_ID && !featheredIds.has(img.id)
    );
    return { images: [...allImages], child };
  });

  // Round-robin pluck (Color, BW, Color, BW, etc)
  const alternated = [];
  let idx = 0;
  let exhausted = false;
  while (!exhausted) {
    exhausted = true;
    for (const gallery of galleriesWithImages) {
      if (gallery.images[idx]) {
        const img = gallery.images[idx];
        alternated.push({
          ...img,
          href: `${gallery.child.href}/${img.id.startsWith("i-") ? img.id : `i-${img.id}`}`,
        });
        exhausted = false;
      }
    }
    idx++;
  }
  return alternated;
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
  const alternatedImages = getAlternatingGalleryImages(sectionPath, featheredIds);
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
  let imageIdx = 0;

  for (const { index, keyword } of matches) {
    // Pull next available image that hasn't been used yet
    let pick = null;
    while (imageIdx < alternatedImages.length) {
      const candidate = alternatedImages[imageIdx++];
      if (!usedImageIds.has(candidate.id)) {
        pick = candidate;
        usedImageIds.add(candidate.id);
        break;
      }
    }
    if (!pick) continue; // out of images

    const href = pick.href;
    output = output.slice(0, index) +
      `<a href="${href}" class="kw-link">${keyword}</a>` +
      output.slice(index + keyword.length);
  }
  return output;
}
