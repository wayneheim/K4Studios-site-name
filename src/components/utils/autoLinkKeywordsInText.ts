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

  // Build lowercase lookup for overrides
  const overridesLower = {};
  for (const k in overrides) overridesLower[k.toLowerCase()] = overrides[k];

  // Section/gallery nav names
  const sectionLinks = flattenNav(siteNav);

  const featheredIds = new Set(featheredImages.map(img => img.id));
  const linkableImages = [].concat(...galleryDatas)
    .filter(img => !featheredIds.has(img.id));

  // --- Gather all unique, multi-word phrases (with suffixes, menu, overrides, and semantic linkOverrides) ---
  const validPhrases = new Set(Object.keys(overrides).map(k => k.toLowerCase()));

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

  // Use a regex to match ONLY outside of existing <a> tags
  function linkify(text) {
    let output = text;
    let alreadyLinked = new Set();

    for (const keyword of allKeywords) {
      const kwRegex = new RegExp(`\\b${escapeRegex(keyword)}\\b`, "gi");
      // Skip if already linked in this block
      if (alreadyLinked.has(keyword)) continue;

      output = output.replace(kwRegex, match => {
        const kwLower = match.toLowerCase();
        if (alreadyLinked.has(kwLower)) return match;
        let href = null;

        // 1. Manual override
        if (overridesLower[kwLower]) {
          href = overridesLower[kwLower];
        }
        // 2. Section/gallery name (lookup with/without suffix)
        else {
          let navLabel = Object.keys(sectionLinks).find(label =>
            kwLower === label.toLowerCase() ||
            allowedSuffixes.some(suffix => kwLower === `${label.toLowerCase()} ${suffix}`)
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
          alreadyLinked.add(kwLower);
          return `<a href="${href}" class="kw-link">${match}</a>`;
        }
        return match;
      });
    }
    return output;
  }

  // Only linkify outside of HTML tags (rough, but safe for story blocks)
  return linkify(html);
}
