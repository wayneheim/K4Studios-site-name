import { siteNav } from "../../data/siteNav.ts";
import { semantic } from "../../data/semantic/K4-Sem.ts";

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

export function autoLinkKeywordsInText(
  html,
  galleryDatas,
  featheredImages,
  galleryPaths
) {
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
    // 4.  Image keyword
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
