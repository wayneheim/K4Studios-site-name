import { semantic } from "../../data/semantic/K4-Sem.ts";

// Max links per page
const MAX_LINK_IMAGES = 30;

// Helper: Build a master list of all unique keywords/phrases (including synonyms)
function buildAllPhrases(semantic) {
  const phrases = new Set([
    ...(semantic.mainKeywords || []),
    ...(semantic.longTails || []),
    ...(semantic.linkOverrides || []),
  ]);
  if (semantic.synonymMap) {
    Object.entries(semantic.synonymMap).forEach(([key, synonyms]) => {
      phrases.add(key);
      synonyms.forEach(s => phrases.add(s));
    });
  }
  return Array.from(phrases).sort((a, b) => b.length - a.length);
}

// Helper: Escape regex
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Build image pool, alternating galleries, skipping ghost/feathered/dupes
function buildImagePool(galleryDatas, featheredImages, max = MAX_LINK_IMAGES) {
  const featheredIds = new Set(featheredImages.map(img => img.id));
  const imagePool = [];
  const usedIds = new Set();
  const numGalleries = galleryDatas.length;
  let idx = 0, cycles = 0;
  while (imagePool.length < max && cycles < 200) {
    const g = idx % numGalleries;
    const gallery = galleryDatas[g] || [];
    for (let i = 0; i < gallery.length; i++) {
      const img = gallery[i];
      if (
        img &&
        img.id &&
        img.id !== "i-k4studios" &&
        !featheredIds.has(img.id) &&
        !usedIds.has(img.id)
      ) {
        imagePool.push({ ...img, galleryIdx: g });
        usedIds.add(img.id);
        break;
      }
    }
    idx++;
    cycles++;
    if (imagePool.length >= max) break;
    if (idx > numGalleries * max) break; // safety
  }
  return imagePool;
}

export function autoLinkKeywordsInText(
  html,
  galleryDatas,
  featheredImages,
  galleryPaths,
  semantic
) {
  if (!html) return html;

  // 1. Build master keyword/phrase list, include synonyms!
  const phrases = buildAllPhrases(semantic);
  if (phrases.length === 0) return html;

  // 2. Create regex for phrases (longest first)
  const regex = new RegExp(
    `\\b(${phrases.map(escapeRegex).join("|")})\\b`,
    "gi"
  );

  // 3. Build image pool (alternate, unique, skip ghosts/feathered)
  const imagePool = buildImagePool(galleryDatas, featheredImages, MAX_LINK_IMAGES);

  let imgIdx = 0;
  const linkedIds = new Set();

  // 4. Replace keyword matches with links (one per image, no repeats)
  let output = html.replace(regex, (match) => {
    if (imgIdx >= imagePool.length) return match; // Ran out, fallback to plain text

    // Find gallery for this image
    let img = imagePool[imgIdx++];
    // Don't reuse an image on the same page
    while (img && linkedIds.has(img.id) && imgIdx < imagePool.length) {
      img = imagePool[imgIdx++];
    }
    if (!img || linkedIds.has(img.id)) return match; // Out of images

    linkedIds.add(img.id);

    const idPart = img.id.startsWith("i-") ? img.id : `i-${img.id}`;
    const galleryPath = galleryPaths?.[img.galleryIdx] || galleryPaths?.[0] || "";
    const href = `${galleryPath}/${idPart}`;

    return `<a href="${href}" class="kw-link">${match}</a>`;
  });

  return output;
}
