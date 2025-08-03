import { semantic as defaultSemantic } from "../../data/semantic/K4-Sem.ts";

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getRoundRobinImagePool(galleryDatas, galleryPaths) {
  if (!Array.isArray(galleryDatas) || galleryDatas.length === 0) return [];
  const pools = galleryDatas
    .map((arr, i) => {
      let images = (arr || []).filter(img => img && img.id !== "i-k4studios");
      if (images.length > 30) images = images.sort(() => Math.random() - 0.5).slice(0, 30);
      if (images.length > 20) images = images.sort(() => Math.random() - 0.5).slice(0, 20);
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

function getSectionForKW(kwLower, semantic) {
  for (const sectionName of Object.keys(semantic)) {
    if (sectionName === "synonymMap" || sectionName === "universal") continue;
    const section = semantic[sectionName];
    if ((section.landingPhrases || []).some(p => p.use && p.phrase.toLowerCase() === kwLower)) {
      return { section, type: "landing" };
    }
    if ((section.imagePhrases || []).some(p => p.use && p.phrase.toLowerCase() === kwLower)) {
      return { section, type: "image" };
    }
  }
  if ((semantic.universal?.imagePhrases || []).some(p => p.use && p.phrase.toLowerCase() === kwLower)) {
    return { section: semantic.universal, type: "universal" };
  }
  return null;
}

function resolveSynonym(kwLower, semantic) {
  const synMap = semantic.synonymMap || {};
  for (const [mainKW, syns] of Object.entries(synMap)) {
    if (syns.map(s => s.toLowerCase()).includes(kwLower)) {
      return mainKW.toLowerCase();
    }
  }
  return null;
}

function getAllActivePhrases(semantic) {
  let all = [];
  for (const sectionKey of Object.keys(semantic)) {
    if (sectionKey === "synonymMap") continue;
    const section = semantic[sectionKey];
    if (section.landingPhrases)
      all = all.concat(section.landingPhrases.filter(p => p.use).map(p => p.phrase));
    if (section.imagePhrases)
      all = all.concat(section.imagePhrases.filter(p => p.use).map(p => p.phrase));
  }
  if (semantic.synonymMap) {
    for (const synArr of Object.values(semantic.synonymMap)) {
      all = all.concat(synArr);
    }
  }
  return all;
}

export function autoLinkKeywordsInText(
  html,
  galleryDatas,
  featheredImages,
  galleryPaths,
  semantic = defaultSemantic,
  sectionPath = "/index"
) {
  if (!html) return "";
  if (!Array.isArray(galleryDatas) || galleryDatas.length === 0) return html;

  const universalMode = sectionPath === "/index";

  const overrides = {
    "medical illustration": "https://heimmedicalart.com",
    "medical illustrator": "https://heimmedicalart.com",
  };
  const overridePhrases = Object.keys(overrides).sort((a, b) => b.length - a.length);

  // Apply overrides first
  for (const phrase of overridePhrases) {
    const overrideRegex = new RegExp(escapeRegex(phrase), "gi");
    html = html.replace(overrideRegex, (matched) => {
      return `<a href="${overrides[phrase]}" class="kw-link">${matched}</a>`;
    });
  }

  // Prepare linkable images pool
  const featheredIds = new Set((featheredImages || []).map(img => img.id));
  const linkableImages = getRoundRobinImagePool(galleryDatas, galleryPaths)
    .filter(({ img }) => img && !featheredIds.has(img.id));

  // DEBUG log images available
  console.log("[KW][DEBUG] Linkable images count:", linkableImages.length);

  // All phrases to match (landing + image + synonyms)
  let allKeywords = getAllActivePhrases(semantic)
    .concat(Object.keys(overrides))
    .sort((a, b) => b.length - a.length);

  // Find all matches
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

    // Skip if inside existing <a>
    const before = output.lastIndexOf("<a", index);
    const after = output.indexOf("</a>", index);
    if (before !== -1 && after !== -1 && before < index && after > index) continue;

    let href = null;

    // Check overrides again (case sensitive + lower)
    if (overrides[keyword] || overrides[kwLower]) {
      href = overrides[keyword] || overrides[kwLower];
    }

    if (!href) {
      const resolved = getSectionForKW(kwLower, semantic);

      if (resolved) {
        if (resolved.type === "landing" && resolved.section.path) {
          href = resolved.section.path;
        }
        else if (resolved.type === "image" && resolved.section.path) {
          // ONLY link if we have images in the pool
          if (linkableImages.length > 0) {
            // Pick random image matching section
            const entry = linkableImages.find(({ galleryPath }) =>
              galleryPath && galleryPath.startsWith(resolved.section.path)
            );
            if (entry) {
              href = `${entry.galleryPath}/${entry.img.id}`;
            }
          }
        }
        else if (resolved.type === "universal") {
          // fallback to first image if any
          if (linkableImages.length > 0) {
            const entry = linkableImages[0];
            href = `${entry.galleryPath}/${entry.img.id}`;
          }
        }
      }
    }

    if (!href) {
      // Try synonym resolution
      const canonical = resolveSynonym(kwLower, semantic);
      if (canonical) {
        const resolved = getSectionForKW(canonical, semantic);
        if (resolved) {
          if (resolved.type === "landing" && resolved.section.path) {
            href = resolved.section.path;
          }
          else if (resolved.type === "image" && resolved.section.path) {
            if (linkableImages.length > 0) {
              const entry = linkableImages.find(({ galleryPath }) =>
                galleryPath && galleryPath.startsWith(resolved.section.path)
              );
              if (entry) {
                href = `${entry.galleryPath}/${entry.img.id}`;
              }
            }
          }
          else if (resolved.type === "universal") {
            if (linkableImages.length > 0) {
              const entry = linkableImages[0];
              href = `${entry.galleryPath}/${entry.img.id}`;
            }
          }
        }
      }
    }

    // Forced dummy link fallback
    if (!href) {
      href = "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/West/i-forced";
      console.log(`[KW][FORCED LINK] ${keyword} → ${href}`);
    }

    // Insert the link
    output = output.slice(0, index) +
      `<a href="${href}" class="kw-link">${keyword}</a>` +
      output.slice(index + keyword.length);

    alreadyLinked.add(kwLower);
  }

  return output;
}
