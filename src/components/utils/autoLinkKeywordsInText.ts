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

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// --- PICK IMAGE BY SECTION LOGIC --- //
function pickImageForSection(section, pool) {
  if (!section || !section.path) return null;
  const matches = pool.filter(({ galleryPath }) =>
    galleryPath && galleryPath.startsWith(section.path)
  );
  if (matches.length > 0) {
    return matches[Math.floor(Math.random() * matches.length)];
  }
  // fallback: pick any image
  return pool[Math.floor(Math.random() * pool.length)] || null;
}

// --- GET SECTION BY KEYWORD --- //
function getSectionForKW(kwLower, semantic) {
  for (const sectionName of Object.keys(semantic)) {
    if (sectionName === "synonymMap" || sectionName === "universal") continue;
    const section = semantic[sectionName];
    // landingPhrases
    if ((section.landingPhrases || []).some(p => p.use && p.phrase.toLowerCase() === kwLower)) {
      return { section, type: "landing" };
    }
    // imagePhrases
    if ((section.imagePhrases || []).some(p => p.use && p.phrase.toLowerCase() === kwLower)) {
      return { section, type: "image" };
    }
  }
  // universal (image-only)
  if ((semantic.universal?.imagePhrases || []).some(p => p.use && p.phrase.toLowerCase() === kwLower)) {
    return { section: semantic.universal, type: "universal" };
  }
  return null;
}

// --- RESOLVE SYNONYM --- //
function resolveSynonym(kwLower, semantic) {
  const synMap = semantic.synonymMap || {};
  for (const [mainKW, syns] of Object.entries(synMap)) {
    if (syns.map(s => s.toLowerCase()).includes(kwLower)) {
      return mainKW.toLowerCase();
    }
  }
  return null;
}

// --- MAIN LINKER --- //
export function autoLinkKeywordsInText(
  html,
  galleryDatas,
  featheredImages,
  galleryPaths,
  semantic = defaultSemantic
) {
  if (!html) return "";
  if (!Array.isArray(galleryDatas) || galleryDatas.length === 0) return html;

  // 1. Manual overrides (ALWAYS prioritized)
  const overrides = {
    "medical illustration": "https://heimmedicalart.com",
    "medical illustrator": "https://heimmedicalart.com",
    "Explore Civil War Photography": "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits",
    "Discover WWII Photography": "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII",
    "Step into the Roaring 20s": "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits",
    "Explore Western Photography": "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits",
  };
  const overridePhrases = Object.keys(overrides).sort((a, b) => b.length - a.length);
  for (const phrase of overridePhrases) {
    const overrideRegex = new RegExp(escapeRegex(phrase), "gi");
    html = html.replace(overrideRegex, (matched) => {
      return `<a href="${overrides[phrase]}" class="kw-link">${matched}</a>`;
    });
  }

  // 2. Build round robin image pool
  const featheredIds = new Set((featheredImages || []).map(img => img.id));
  const linkableImages = getRoundRobinImagePool(galleryDatas, galleryPaths)
    .filter(({ img }) => img && !featheredIds.has(img.id));

  // 3. Gather all active phrases (from all sections, use: true)
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
    return all;
  }
  const allKeywords = getAllActivePhrases(semantic)
    .concat(Object.keys(overrides))
    .sort((a, b) => b.length - a.length);

  // 4. Keyword matching (case-insensitive)
  const keywordRegex = new RegExp(`\\b(${allKeywords.map(escapeRegex).join('|')})\\b`, "gi");
  let match, matches = [];
  while ((match = keywordRegex.exec(html)) !== null) {
    matches.push({ index: match.index, keyword: match[1] });
  }
  matches.reverse(); // so string edits don't affect upcoming match positions

  let output = html;
  let alreadyLinked = new Set();

  for (const { index, keyword } of matches) {
    const kwLower = keyword.toLowerCase();
    if (alreadyLinked.has(kwLower)) continue;

    // --- DO NOT LINK IF ALREADY INSIDE A LINK --- //
    const before = output.lastIndexOf("<a", index);
    const after = output.indexOf("</a>", index);
    if (before !== -1 && after !== -1 && before < index && after > index) {
      continue; // already inside a link, skip
    }

    let href = null;

    // 1. Manual overrides (should have already replaced, but double-check)
    if (overrides[keyword] || overrides[kwLower]) {
      href = overrides[keyword] || overrides[kwLower];
    }

    // 2. Exact match in section/image/universal
    if (!href) {
      const resolved = getSectionForKW(kwLower, semantic);
      if (resolved) {
        // --- Landing page link
        if (resolved.type === "landing" && resolved.section.path) {
          href = resolved.section.path;
        }
        // --- Image phrase (section-specific)
        else if (resolved.type === "image" && resolved.section.path) {
          const entry = pickImageForSection(resolved.section, linkableImages);
          if (entry) {
            const { img, galleryPath } = entry;
            href = `${galleryPath}/${img.id}`;
          }
        }
        // --- Universal: any image from the pool
        else if (resolved.type === "universal") {
          const entry = linkableImages[Math.floor(Math.random() * linkableImages.length)];
          if (entry) {
            const { img, galleryPath } = entry;
            href = `${galleryPath}/${img.id}`;
          }
        }
      }
    }

    // 3. SynonymMap logic
    if (!href) {
      const canonical = resolveSynonym(kwLower, semantic);
      if (canonical) {
        const resolved = getSectionForKW(canonical, semantic);
        if (resolved) {
          if (resolved.type === "landing" && resolved.section.path) {
            href = resolved.section.path;
          } else if (resolved.type === "image" && resolved.section.path) {
            const entry = pickImageForSection(resolved.section, linkableImages);
            if (entry) {
              const { img, galleryPath } = entry;
              href = `${galleryPath}/${img.id}`;
            }
          } else if (resolved.type === "universal") {
            const entry = linkableImages[Math.floor(Math.random() * linkableImages.length)];
            if (entry) {
              const { img, galleryPath } = entry;
              href = `${galleryPath}/${img.id}`;
            }
          }
        }
      }
    }

    // 4. Fallback: Any image from pool
    if (!href) {
      const entry = linkableImages[Math.floor(Math.random() * linkableImages.length)];
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
