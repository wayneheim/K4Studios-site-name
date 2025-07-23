import { siteNav } from "../../data/siteNav.ts";
import { semantic as defaultSemantic } from "../../data/semantic/K4-Sem.ts";

// --- Universal: Find all descendant leaf gallery paths for a section ---
function getAllDescendantGalleryPaths(nav, parentPath) {
  const paths = [];
  function walk(node) {
    if (node.href && node.href.startsWith(parentPath) && node.href !== parentPath) {
      if (!node.children || node.children.length === 0) {
        paths.push(node.href);
      } else {
        node.children.forEach(walk);
      }
    }
  }
  nav.forEach(walk);
  return paths;
}

// --- Universal: Feathered (alternating) pool, random-delete, random-pull per gallery ---
function getFeatheredImagePool(allGalleryData, galleryPaths) {
  const pools = galleryPaths.map(path => {
    const filePath = "../../../../data/Galleries" + path.replace(/^\/Galleries/, "") + ".mjs";
    let images = allGalleryData[filePath]?.galleryData?.filter(img => img && img.id !== "i-k4studios") || [];
    if (images.length > 30) images = images.sort(() => Math.random() - 0.5).slice(0, 30);
    if (images.length > 20) images = images.sort(() => Math.random() - 0.5).slice(0, 20);
    return images.sort(() => Math.random() - 0.5);
  });

  const stack = [];
  let i = 0, added;
  do {
    added = false;
    for (let p = 0; p < pools.length; p++) {
      if (pools[p][i]) {
        stack.push(pools[p][i]);
        added = true;
      }
    }
    i++;
  } while (added);
  return stack;
}

// --- Section Href Helper ---
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

// --- Main Exported Function ---
export function autoLinkKeywordsInText(
  html,
  featheredImages,
  sectionPath,
  allGalleryData,
  semantic = defaultSemantic
) {
  // ** NO GALLERY LOGIC NEEDED IN ASTRO PAGE! **
  const galleryPaths = getAllDescendantGalleryPaths(siteNav, sectionPath);
  const linkableImages = getFeatheredImagePool(allGalleryData, galleryPaths)
    .filter(img => !featheredImages.map(f => f.id).includes(img.id));

  // Manual override URLs
  const overrides = {
    "medical illustration": "https://heimmedicalart.com",
    "medical illustrator": "https://heimmedicalart.com",
  };

  // Flatten siteNav for section links
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

  // Build valid phrases from semantic, overrides, and nav
  const validPhrases = new Set(Object.keys(overrides));
  const linkOverrides = (semantic.linkOverrides || []).map(s => s.toLowerCase());
  linkOverrides.forEach(p => validPhrases.add(p));
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

  // --- Linking logic as before ---
  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
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
  const currentSectionHref = getSectionHrefFromGalleryPaths(galleryPaths);

  for (const { index, keyword } of matches) {
    const kwLower = keyword.toLowerCase();
    if (alreadyLinked.has(kwLower)) continue;
    let href = null;
    // Manual override
    if (overrides[kwLower]) {
      href = overrides[kwLower];
    } else {
      let navLabel = Object.keys(sectionLinks).find(label =>
        kwLower === label ||
        allowedSuffixes.some(suffix => kwLower === `${label} ${suffix}`)
      );
      if (navLabel) {
        const navHref = sectionLinks[navLabel];
        if (
          currentSectionHref &&
          navHref.replace(/\/$/, "") === currentSectionHref.replace(/\/$/, "")
        ) {
          const img = linkableImages[imgIdx++] || linkableImages[0];
          if (img) {
            let galleryIdx = galleryPaths.findIndex(gp => img.galleries?.includes(gp));
            const idPart = img.id;
            href = `${galleryPaths[galleryIdx] || galleryPaths[0]}/${idPart}`;
          }
        } else {
          href = navHref;
        }
      }
    }
    // If still not set, assign by image pool
    if (!href) {
      let img = linkableImages[imgIdx++] || linkableImages[0];
      if (img) {
        let galleryIdx = galleryPaths.findIndex(gp => img.galleries?.includes(gp));
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
