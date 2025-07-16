import { siteNav } from "../../data/siteNav.ts";
import { semantic } from "../../data/semantic/K4-Sem.ts";

// ---- GATHER ALL DESCENDANT GALLERIES FOR SECTION/LANDING PAGE ----

// Import all .mjs gallery data files (eagerly)
const modules = import.meta.glob('../../data/galleries/**/*.mjs', { eager: true });

const galleryDataMap: Record<string, any[]> = {};
for (const [path, mod] of Object.entries(modules)) {
  const href = path.replace(/^.*[\\\/]galleries/, '/Galleries').replace(/\.mjs$/, '');
  galleryDataMap[href] = mod.galleryData || mod.default || [];
}

function findNavNodeByHref(tree: any[], href: string): any | null {
  for (const node of tree) {
    if (node.href === href) return node;
    if (node.children) {
      const found = findNavNodeByHref(node.children, href);
      if (found) return found;
    }
  }
  return null;
}

function collectGalleryHrefs(node: any): string[] {
  let hrefs: string[] = [];
  if (node.type === 'gallery-source' && node.href) hrefs.push(node.href);
  if (node.children) node.children.forEach(child => hrefs.push(...collectGalleryHrefs(child)));
  return hrefs;
}

/**
 * Get all gallery paths and image arrays for a parent/section page (landing).
 * Use this on any page that isn't a one-up/gallery (which can use simple data).
 */
function getAllDescendantGalleryData(sectionPath: string) {
  const navRoot = findNavNodeByHref(siteNav, sectionPath);
  if (!navRoot) return { galleryPaths: [], galleryDatas: [] };
  const galleryPaths = collectGalleryHrefs(navRoot);
  const galleryDatas = galleryPaths.map(href => galleryDataMap[href] || []);
  return { galleryPaths, galleryDatas };
}

// ---- AUTO-LINKER FUNCTION ----

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function flattenNav(nav, map = {}) {
  for (const entry of nav) {
    if (entry.label && entry.href) {
      map[entry.label.trim().toLowerCase()] = entry.href;
    }
    if (entry.children) flattenNav(entry.children, map);
  }
  return map;
}

function pickRandomImage(images) {
  if (!images || images.length === 0) return null;
  // Prioritize 3-5 star, else all
  const high = images.filter(img => (img.rating ?? 0) >= 3);
  const pool = high.length > 0 ? high : images;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function autoLinkKeywordsInTextM(
  html,
  _sectionPath,
  featheredImages
) {
  // 🔥 Hardcoded for consistent linking across all painterly pages
  const sectionPath = "/Galleries/Painterly-Fine-Art-Photography";

  // Gather all galleries & images for this section recursively
  const { galleryPaths, galleryDatas } = getAllDescendantGalleryData(sectionPath);

  // Manual override URLs
  const overrides = {
    "medical illustration": "https://heimmedicalart.com",
    "medical illustrator": "https://heimmedicalart.com",
  };

  // Section/gallery nav names
  const sectionLinks = flattenNav(siteNav);

  const featheredIds = new Set(featheredImages.map(img => img.id));
  const linkableImages = [].concat(...galleryDatas)
    .filter(img => !featheredIds.has(img.id));

  // --- Gather all unique, multi-word phrases (with suffixes, menu, overrides, and semantic linkOverrides) ---
  const validPhrases = new Set(Object.keys(overrides));

  // Add semantic.linkOverrides (if present)
  const linkOverrides = (semantic.linkOverrides || []).map(s => s.toLowerCase());
  linkOverrides.forEach(p => validPhrases.add(p));

  // Add menu nav (with allowed suffixes)
  const allowedSuffixes = ["series", "gallery", "collection", "art", "photos", "images"];
  Object.keys(sectionLinks).forEach(label => {
    if (label.split(/\s+/).length > 1) {
      validPhrases.add(label);
      allowedSuffixes.forEach(suffix => validPhrases.add(`${label} ${suffix}`.trim()));
    }
  });

  // Add gallery image multi-word phrases
  for (const img of linkableImages) {
    [img.title, img.alt, img.description, ...(img.keywords || [])]
      .filter(Boolean)
      .forEach(str => {
        if (typeof str === "string" && str.trim().split(/\s+/).length > 1) {
          validPhrases.add(str.trim().toLowerCase());
        }
      });
  }

  // --- 4. Link only these phrases (sorted longest to shortest) ---
  const allKeywords = Array.from(validPhrases).sort((a, b) => b.length - a.length);
  if (allKeywords.length === 0) return html;
  const keywordRegex = new RegExp(`\\b(${allKeywords.map(escapeRegex).join('|')})\\b`, "gi");

  let match, matches = [];
  while ((match = keywordRegex.exec(html)) !== null) {
    matches.push({ index: match.index, keyword: match[1] });
  }
  matches.reverse();

  let output = html;
  let alreadyLinked = new Set();

  for (const { index, keyword } of matches) {
    const kwLower = keyword.toLowerCase();
    if (alreadyLinked.has(kwLower)) continue;
    let href = null;
    // 1. Manual override
    if (overrides[kwLower]) {
      href = overrides[kwLower];
    }
    // 2. Section/gallery name (lookup with/without suffix)
    else {
      let navLabel = Object.keys(sectionLinks).find(label =>
        kwLower === label ||
        allowedSuffixes.some(suffix => kwLower === `${label} ${suffix}`)
      );
      if (navLabel) {
        href = sectionLinks[navLabel];
      }
    }
    // 3. Semantic linkOverride (random image)
    if (!href && linkOverrides.includes(kwLower)) {
      const img = pickRandomImage(linkableImages);
      if (img) {
        let galleryIdx = galleryDatas.findIndex(arr => arr.find(e => e.id === img.id));
        const idPart = img.id.startsWith('i-') ? img.id : `i-${img.id}`;
        href = `${galleryPaths[galleryIdx] || galleryPaths[0]}/${idPart}`;
      }
    }
    // 4. Image keyword
    if (!href) {
      let img = linkableImages.find(img =>
        [img.title, img.alt, img.description, ...(img.keywords || [])]
          .filter(Boolean)
          .some(str => typeof str === "string" && str.trim().toLowerCase() === kwLower)
      );
      if (img) {
        let galleryIdx = galleryDatas.findIndex(arr => arr.find(e => e.id === img.id));
        const idPart = img.id.startsWith('i-') ? img.id : `i-${img.id}`;
        href = `${galleryPaths[galleryIdx] || galleryPaths[0]}/${idPart}`;
      }
    }
    if (href) {
      output = output.slice(0, index) +
        `<a href="${href}" class="kw-link">${keyword}</a>` +
        output.slice(index + keyword.length);
      alreadyLinked.add(kwLower);
    }
  }
  return output;
}
