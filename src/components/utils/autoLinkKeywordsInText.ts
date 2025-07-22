import { siteNav } from "../../data/siteNav.ts";
import { semantic } from "../../data/semantic/K4-Sem.ts";

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function flattenNav(nav, map = {}) {
  for (const entry of nav) {
    if (entry.label && entry.href) map[entry.label.trim().toLowerCase()] = entry.href;
    if (entry.children) flattenNav(entry.children, map);
  }
  return map;
}

function pickRandomImage(images) {
  const rated = images.filter(img => (img.rating ?? 0) >= 3);
  const pool = rated.length ? rated : images;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function autoLinkKeywordsInText(html, galleryDatas, featheredImages, galleryPaths, currentSectionPath) {
  const overrides = {
    "medical illustration": "https://heimmedicalart.com",
    "medical illustrator": "https://heimmedicalart.com",
  };

  const linkOverrides = (semantic.linkOverrides || []).map(s => s.toLowerCase());
  const allowedSuffixes = ["series", "gallery", "collection", "art", "photos", "images"];
  const sectionLinks = flattenNav(siteNav);

  const featheredIds = new Set(featheredImages.map(img => img.id));
  const linkableImages = [].concat(...galleryDatas).filter(img => !featheredIds.has(img.id));

  const validPhrases = new Set(Object.keys(overrides));
  linkOverrides.forEach(p => validPhrases.add(p));
  Object.keys(sectionLinks).forEach(label => {
    if (label.includes(" ")) {
      validPhrases.add(label);
      allowedSuffixes.forEach(suffix => validPhrases.add(`${label} ${suffix}`));
    }
  });

  for (const img of linkableImages) {
    [img.title, img.alt, img.description, ...(img.keywords || [])]
      .filter(Boolean)
      .forEach(str => {
        if (typeof str === "string" && str.trim().includes(" ")) {
          validPhrases.add(str.trim().toLowerCase());
        }
      });
  }

  const sortedKeywords = Array.from(validPhrases).sort((a, b) => b.length - a.length);
  const regex = new RegExp(`\\b(${sortedKeywords.map(escapeRegex).join('|')})\\b`, "gi");

  const matches = [];
  let match;
  while ((match = regex.exec(html))) matches.push({ index: match.index, keyword: match[1] });
  matches.reverse();

  let output = html;
  const alreadyLinked = new Set();

  for (const { index, keyword } of matches) {
    const kwLower = keyword.toLowerCase();
    if (alreadyLinked.has(kwLower)) continue;

    let href = overrides[kwLower] || null;

    if (!href) {
      const labelMatch = Object.keys(sectionLinks).find(label =>
        kwLower === label || allowedSuffixes.some(s => kwLower === `${label} ${s}`)
      );

      if (labelMatch) {
        const targetHref = sectionLinks[labelMatch];
        if (currentSectionPath.replace(/\/$/, '') === targetHref.replace(/\/$/, '')) {
          const img = pickRandomImage([].concat(...galleryDatas));
          if (img) {
            const idx = galleryDatas.findIndex(arr => arr.find(e => e.id === img.id));
            const idPart = img.id.startsWith("i-") ? img.id : `i-${img.id}`;
            href = `${galleryPaths[idx] || galleryPaths[0]}/${idPart}`;
          }
        } else {
          href = targetHref;
        }
      }
    }

    if (!href && linkOverrides.includes(kwLower)) {
      const img = pickRandomImage(linkableImages);
      if (img) {
        const idx = galleryDatas.findIndex(arr => arr.find(e => e.id === img.id));
        const idPart = img.id.startsWith("i-") ? img.id : `i-${img.id}`;
        href = `${galleryPaths[idx] || galleryPaths[0]}/${idPart}`;
      }
    }

    if (!href) {
      const img = linkableImages.find(img =>
        [img.title, img.alt, img.description, ...(img.keywords || [])]
          .filter(Boolean)
          .some(str => typeof str === "string" && str.trim().toLowerCase() === kwLower)
      );
      if (img) {
        const idx = galleryDatas.findIndex(arr => arr.find(e => e.id === img.id));
        const idPart = img.id.startsWith("i-") ? img.id : `i-${img.id}`;
        href = `${galleryPaths[idx] || galleryPaths[0]}/${idPart}`;
      }
    }

    if (href) {
      output = output.slice(0, index) + `<a href="${href}" class="kw-link">${keyword}</a>` + output.slice(index + keyword.length);
      alreadyLinked.add(kwLower);
    }
  }

  return output;
}
