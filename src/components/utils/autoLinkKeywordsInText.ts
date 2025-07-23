import { siteNav } from "../../data/siteNav.ts";
import { semantic as defaultSemantic } from "../../data/semantic/K4-Sem.ts";

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// --- NEW: Interleaved (Alternating) Pool Logic --- //
function getRandomizedGalleryPool(arr) {
  let images = arr.filter(img => img && img.id !== "i-k4studios");
  if (images.length > 30) images = images.sort(() => Math.random() - 0.5).slice(0, 30);
  if (images.length > 20) images = images.sort(() => Math.random() - 0.5).slice(0, 20);
  return images.sort(() => Math.random() - 0.5);
}

function getAlternatingImagePool(galleryDatas) {
  // Each galleryDatas[n] = color, bw, etc arrays
  const pools = galleryDatas.map(getRandomizedGalleryPool);
  const maxLen = Math.max(...pools.map(p => p.length));
  const interleaved = [];
  for (let i = 0; i < maxLen; i++) {
    for (let p = 0; p < pools.length; p++) {
      if (pools[p][i]) interleaved.push(pools[p][i]);
    }
  }
  return interleaved;
}

// --- NEW: Get "current section" (landing) href based on galleryPaths --- //
function getSectionHrefFromGalleryPaths(paths) {
  if (!Array.isArray(paths) || paths.length === 0) return null;
  const partsList = paths.map(path => path.split("/").filter(Boolean));
  let prefix = [];
  for (let i = 0; i < Math.min(...partsList.map(parts => parts.length)); i++) {
    const segment = partsList[0][i];
    if (partsList.every(parts => parts[i] === segment)) {
      prefix.push(segment);
    } else {
      break;
    }
  }
  return "/" + prefix.join("/");
}

// --- MAIN LINKING FUNCTION --- //
export function autoLinkKeywordsInText(
  html,
  galleryDatas,
  featheredImages,
  galleryPaths,
  semantic = defaultSemantic // Fallback to K4-Sem if not passed
) {
  // Manual override URLs
  const overrides = {
    "medical illustration": "https://heimmedicalart.com",
    "medical illustrator": "https://heimmedicalart.com",
  };

  // Section/gallery nav names
  function flattenNav(nav, map = {}) {
    for (const entry of nav) {
      if (entry.label && entry.href) {
        map[entry.label.trim().toLowerCase()] = entry.href;
      }
      if (entry.children) flattenNav(entry.children, map);
    }
    return map;
  }
  const sectionLinks = flattenNav(siteNav);

  // Get feathered IDs (exclusions)
  const featheredIds = new Set(featheredImages.map(img => img.id));

  // --- USE INTERLEAVED COLOR/BW POOL --- //
  const linkableImages = getAlternatingImagePool(galleryDatas)
    .filter(img => !featheredIds.has(img.id));

  // --- Find current section/landing href for "self-link" reroute logic --- //
  const currentSectionHref = getSectionHrefFromGalleryPaths(galleryPaths);

  // --- Gather all unique, multi-word phrases (with suffixes, menu, overrides, semantic.phrases, and semantic.linkOverrides) ---
  const validPhrases = new Set(Object.keys(overrides));
  const linkOverrides = (semantic.linkOverrides || []).map(s => s.toLowerCase());
  linkOverrides.forEach(p => validPhrases.add(p));

  // --- ADD ALL PHRASES FROM K4-Sem.ts ---
  if (semantic.phrases && Array.isArray(semantic.phrases)) {
    for (const phrase of semantic.phrases) {
      if (typeof phrase === "string" && phrase.length > 1) {
        validPhrases.add(phrase.trim().toLowerCase());
      }
    }
  }

  const allowedSuffixes = ["series", "gallery", "collection", "art", "photos", "images"];
  Object.keys(sectionLinks).forEach(label => {
    if (label.split(/\s+/).length > 1) {
      validPhrases.add(label);
      allowedSuffixes.forEach(suffix => validPhrases.add(`${label} ${suffix}`.trim()));
    }
  });

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

  // --- Always assign links using the per-block, alternating pool --- //
  let imgIdx = 0;
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
        const navHref = sectionLinks[navLabel];
        // If this navHref matches the currentSectionHref, link to image not landing page!
        if (
          currentSectionHref &&
          navHref.replace(/\/$/, "") === currentSectionHref.replace(/\/$/, "")
        ) {
          // Link to an image in this section, not the landing page
          const img = linkableImages[imgIdx++] || linkableImages[0];
          if (img) {
            let galleryIdx = galleryDatas.findIndex(arr => arr.find(e => e.id === img.id));
            const idPart = img.id;
            href = `${galleryPaths[galleryIdx] || galleryPaths[0]}/${idPart}`;
          }
        } else {
          // Otherwise, link to nav page as normal
          href = navHref;
        }
      }
    }
    // 3. Semantic linkOverride (random image)
    if (!href && linkOverrides.includes(kwLower)) {
      const img = linkableImages[imgIdx++] || linkableImages[0];
      if (img) {
        let galleryIdx = galleryDatas.findIndex(arr => arr.find(e => e.id === img.id));
        const idPart = img.id;
        href = `${galleryPaths[galleryIdx] || galleryPaths[0]}/${idPart}`;
      }
    }
    // 4.  Image keyword
    if (!href) {
      let img = linkableImages[imgIdx++] || linkableImages[0];
      if (img) {
        let galleryIdx = galleryDatas.findIndex(arr => arr.find(e => e.id === img.id));
        const idPart = img.id;
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
