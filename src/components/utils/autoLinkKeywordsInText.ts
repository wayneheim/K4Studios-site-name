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

export function autoLinkKeywordsInText(html, galleryDatas, featheredImages, galleryPaths) {
  const overrides = {
    "medical illustration": "https://heimmedicalart.com",
    "medical illustrator": "https://heimmedicalart.com",
  };

  const sectionLinks = flattenNav(siteNav);

  const featheredIds = new Set(featheredImages.map(img => img.id));
  const allImages = [].concat(...galleryDatas);
  const linkableImages = allImages.filter(img => !featheredIds.has(img.id));
  const alreadyLinkedImages = new Set();

  const validPhrases = new Set(Object.keys(overrides));

  const linkOverrides = (semantic.linkOverrides || []).map(s => s.toLowerCase());
  linkOverrides.forEach(p => validPhrases.add(p));

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

  const allKeywords = Array.from(validPhrases).sort((a, b) => b.length - a.length);
  if (allKeywords.length === 0) return html;

  const keywordRegex = new RegExp(`\\b(${allKeywords.map(escapeRegex).join('|')})\\b`, "gi");

  let match, matches = [];
  while ((match = keywordRegex.exec(html)) !== null) {
    matches.push({ index: match.index, keyword: match[1] });
  }
  matches.reverse();

  let output = html;
  let alreadyLinkedPhrases = new Set();

  for (const { index, keyword } of matches) {
    const kwLower = keyword.toLowerCase();
    if (alreadyLinkedPhrases.has(kwLower)) continue;

    let href = null;
    let img = null;

    // 1. Manual override
    if (overrides[kwLower]) {
      href = overrides[kwLower];
    }

    // 2. Section/gallery name
    if (!href) {
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
      const candidates = linkableImages.filter(i => !alreadyLinkedImages.has(i.id));
      img = pickRandomImage(candidates);
      if (img) {
        const galleryIdx = galleryDatas.findIndex(arr => arr.find(e => e.id === img.id));
        const idPart = img.id.startsWith('i-') ? img.id : `i-${img.id}`;
        href = `${galleryPaths[galleryIdx] || galleryPaths[0]}/${idPart}`;
      } else {
        console.log(`⚠️ No random image found for override phrase: "${keyword}"`);
      }
    }

    // 4. Image keyword match
    if (!href) {
      img = linkableImages.find(i =>
        !alreadyLinkedImages.has(i.id) &&
        [i.title, i.alt, i.description, ...(i.keywords || [])]
          .filter(Boolean)
          .some(str => typeof str === "string" && str.trim().toLowerCase() === kwLower)
      );
      if (img) {
        const galleryIdx = galleryDatas.findIndex(arr => arr.find(e => e.id === img.id));
        const idPart = img.id.startsWith('i-') ? img.id : `i-${img.id}`;
        href = `${galleryPaths[galleryIdx] || galleryPaths[0]}/${idPart}`;
      } else {
        console.log(`⚠️ No image match for phrase: "${keyword}"`);
      }
    }

    if (href) {
      output = output.slice(0, index) +
        `<a href="${href}" class="kw-link">${keyword}</a>` +
        output.slice(index + keyword.length);
      alreadyLinkedPhrases.add(kwLower);
      if (img?.id) alreadyLinkedImages.add(img.id);
    } else {
      alreadyLinkedPhrases.add(kwLower); // avoid retrying failed phrase
    }
  }

  return output;
}
