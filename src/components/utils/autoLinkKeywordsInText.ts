import { siteNav } from "../../data/siteNav.ts";
import { semantic as defaultSemantic } from "../../data/semantic/K4-Sem.ts";

// --- ROUND ROBIN Pool Logic --- //
function getRoundRobinImagePool(galleryDatas, galleryPaths) {
  if (!Array.isArray(galleryDatas) || galleryDatas.length === 0) return [];
  const pools = galleryDatas
    .map((arr, i) => {
      let images = (arr || []).filter(img => img && img.id !== "i-k4studios");
      if (images.length > 30) images = images.sort(() => Math.random() - 0.5).slice(0, 30);
      if (images.length > 20) images = images.sort(() => Math.random() - 0.5).slice(0, 20);
      // Attach galleryPath to each
      return images.map(img => ({ img, galleryPath: galleryPaths[i] }));
    });
  const roundRobin = [];
  let i = 0, added;
  do {
    added = false;
    for (let p = 0; p < pools.length; p++) {
      if (pools[p][i]) {
        roundRobin.push(pools[p][i]);
        added = true;
      }
    }
    i++;
  } while (added);
  return roundRobin;
}

// --- Find "current section" href based on galleryPaths --- //
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

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// --- MAIN LINKING FUNCTION --- //
export function autoLinkKeywordsInText(
  html,
  galleryDatas,
  featheredImages,
  galleryPaths,
  semantic = defaultSemantic
) {
  if (!html) return "";
  if (!Array.isArray(galleryDatas) || galleryDatas.length === 0) return html;

  // Manual override URLs
  const overrides = {
    "medical illustration": "https://heimmedicalart.com",
    "medical illustrator": "https://heimmedicalart.com",
    "Explore Civil War Photography": "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits",
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
  const featheredIds = new Set((featheredImages || []).map(img => img.id));

  // --- USE IMPROVED ROUND ROBIN POOL --- //
  const linkableImages = getRoundRobinImagePool(galleryDatas, galleryPaths)
    .filter(({ img }) => img && !featheredIds.has(img.id));

  // --- Find current section/landing href for "self-link" reroute logic --- //
  const currentSectionHref = getSectionHrefFromGalleryPaths(galleryPaths);

  // --- Gather all unique, multi-word phrases (with suffixes, menu, overrides, semantic.phrases, and semantic.linkOverrides) ---
  const validPhrases = new Set(Object.keys(overrides));
  const linkOverrides = (semantic?.linkOverrides || []).map(s => s.toLowerCase());
  linkOverrides.forEach(p => validPhrases.add(p));

  if (semantic?.phrases && Array.isArray(semantic.phrases)) {
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

  for (const { img } of linkableImages) {
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
          const entry = linkableImages[imgIdx++] || linkableImages[0];
          if (entry) {
            const { img, galleryPath } = entry;
            href = `${galleryPath}/${img.id}`;
          }
        } else {
          href = navHref;
        }
      }
    }
    // 3. Semantic linkOverride (random image)
    if (!href && linkOverrides.includes(kwLower)) {
      const entry = linkableImages[imgIdx++] || linkableImages[0];
      if (entry) {
        const { img, galleryPath } = entry;
        href = `${galleryPath}/${img.id}`;
      }
    }
    // 4.  Image keyword
    if (!href) {
      const entry = linkableImages[imgIdx++] || linkableImages[0];
      if (entry) {
        const { img, galleryPath } = entry;
        href = `${galleryPath}/${img.id}`;
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
