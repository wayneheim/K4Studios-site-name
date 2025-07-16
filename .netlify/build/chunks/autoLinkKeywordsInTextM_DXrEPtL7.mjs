import { _ as __vite_glob_0_26, a as __vite_glob_0_25, b as __vite_glob_0_24, c as __vite_glob_0_23, d as __vite_glob_0_22, e as __vite_glob_0_21, f as __vite_glob_0_20, g as __vite_glob_0_19, h as __vite_glob_0_18, i as __vite_glob_0_17, j as __vite_glob_0_16, k as __vite_glob_0_15, l as __vite_glob_0_12, m as __vite_glob_0_11, n as __vite_glob_0_10, o as __vite_glob_0_9, p as __vite_glob_0_8, q as __vite_glob_0_7, r as __vite_glob_0_2, s as __vite_glob_0_1, t as __vite_glob_0_0, v as semantic } from './K4-Sem_DXtEsQNi.mjs';
import { _ as __vite_glob_0_3 } from './Black-White_KdVP8gLQ.mjs';
import { _ as __vite_glob_0_4 } from './Color_B0tZ5rnE.mjs';
import { _ as __vite_glob_0_5 } from './Black-White_CacyG34n.mjs';
import { _ as __vite_glob_0_6 } from './Color_D9UJrp0k.mjs';
import { _ as __vite_glob_0_13 } from './Black-White_BdpB_JkH.mjs';
import { _ as __vite_glob_0_14 } from './Color_CB1i983B.mjs';
import { s as siteNav } from './Footer_VeJuj4uH.mjs';

const modules = /* #__PURE__ */ Object.assign({"../../data/galleries/Fine-Art-Photography/Landscapes/By-Theme/Mountains/Mountains.mjs": __vite_glob_0_0,"../../data/galleries/Fine-Art-Photography/Landscapes/By-Theme/Sunsets/Sunsets.mjs": __vite_glob_0_1,"../../data/galleries/Fine-Art-Photography/Landscapes/By-Theme/Water/Water.mjs": __vite_glob_0_2,"../../data/galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War/Black-White.mjs": __vite_glob_0_3,"../../data/galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War/Color.mjs": __vite_glob_0_4,"../../data/galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Black-White.mjs": __vite_glob_0_5,"../../data/galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Color.mjs": __vite_glob_0_6,"../../data/galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Black-White.mjs": __vite_glob_0_7,"../../data/galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Color.mjs": __vite_glob_0_8,"../../data/galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Black-White.mjs": __vite_glob_0_9,"../../data/galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Color.mjs": __vite_glob_0_10,"../../data/galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Black-White.mjs": __vite_glob_0_11,"../../data/galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Color.mjs": __vite_glob_0_12,"../../data/galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White.mjs": __vite_glob_0_13,"../../data/galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color.mjs": __vite_glob_0_14,"../../data/galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/International/Gallery.mjs": __vite_glob_0_15,"../../data/galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/Midwest/Gallery.mjs": __vite_glob_0_16,"../../data/galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/Northeast/Gallery.mjs": __vite_glob_0_17,"../../data/galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/West/Gallery.mjs": __vite_glob_0_18,"../../data/galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Mountains/Mountains.mjs": __vite_glob_0_19,"../../data/galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Water/Water.mjs": __vite_glob_0_20,"../../data/galleries/Painterly-Fine-Art-Photography/Miscellaneous/Portraits.mjs": __vite_glob_0_21,"../../data/galleries/Painterly-Fine-Art-Photography/Transportation/Cars.mjs": __vite_glob_0_22,"../../data/galleries/Painterly-Fine-Art-Photography/Transportation/Trains-Black-White.mjs": __vite_glob_0_23,"../../data/galleries/Painterly-Fine-Art-Photography/Transportation/Trains-Color.mjs": __vite_glob_0_24,"../../data/galleries/zPainterly-Western-Cowboy-Portraits/BlackWhite.mjs": __vite_glob_0_25,"../../data/galleries/zPainterly-Western-Cowboy-Portraits/Color.mjs": __vite_glob_0_26});
const galleryDataMap = {};
for (const [path, mod] of Object.entries(modules)) {
  const href = path.replace(/^.*[\\\/]galleries/, "/Galleries").replace(/\.mjs$/, "");
  galleryDataMap[href] = mod.galleryData || mod.default || [];
}
function findNavNodeByHref(tree, href) {
  for (const node of tree) {
    if (node.href === href) return node;
    if (node.children) {
      const found = findNavNodeByHref(node.children, href);
      if (found) return found;
    }
  }
  return null;
}
function collectGalleryHrefs(node) {
  let hrefs = [];
  if (node.type === "gallery-source" && node.href) hrefs.push(node.href);
  if (node.children) node.children.forEach((child) => hrefs.push(...collectGalleryHrefs(child)));
  return hrefs;
}
function getAllDescendantGalleryData(sectionPath) {
  const navRoot = findNavNodeByHref(siteNav, sectionPath);
  if (!navRoot) return { galleryPaths: [], galleryDatas: [] };
  const galleryPaths = collectGalleryHrefs(navRoot);
  const galleryDatas = galleryPaths.map((href) => galleryDataMap[href] || []);
  return { galleryPaths, galleryDatas };
}
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
  const high = images.filter((img) => (img.rating ?? 0) >= 3);
  const pool = high.length > 0 ? high : images;
  return pool[Math.floor(Math.random() * pool.length)];
}
function autoLinkKeywordsInTextM(html, _sectionPath, featheredImages) {
  const sectionPath = "/Galleries/Painterly-Fine-Art-Photography";
  const { galleryPaths, galleryDatas } = getAllDescendantGalleryData(sectionPath);
  const overrides = {
    "medical illustration": "https://heimmedicalart.com",
    "medical illustrator": "https://heimmedicalart.com"
  };
  const sectionLinks = flattenNav(siteNav);
  const featheredIds = new Set(featheredImages.map((img) => img.id));
  const linkableImages = [].concat(...galleryDatas).filter((img) => !featheredIds.has(img.id));
  const validPhrases = new Set(Object.keys(overrides));
  const linkOverrides = (semantic.linkOverrides || []).map((s) => s.toLowerCase());
  linkOverrides.forEach((p) => validPhrases.add(p));
  const allowedSuffixes = ["series", "gallery", "collection", "art", "photos", "images"];
  Object.keys(sectionLinks).forEach((label) => {
    if (label.split(/\s+/).length > 1) {
      validPhrases.add(label);
      allowedSuffixes.forEach((suffix) => validPhrases.add(`${label} ${suffix}`.trim()));
    }
  });
  for (const img of linkableImages) {
    [img.title, img.alt, img.description, ...img.keywords || []].filter(Boolean).forEach((str) => {
      if (typeof str === "string" && str.trim().split(/\s+/).length > 1) {
        validPhrases.add(str.trim().toLowerCase());
      }
    });
  }
  const allKeywords = Array.from(validPhrases).sort((a, b) => b.length - a.length);
  if (allKeywords.length === 0) return html;
  const keywordRegex = new RegExp(`\\b(${allKeywords.map(escapeRegex).join("|")})\\b`, "gi");
  let match, matches = [];
  while ((match = keywordRegex.exec(html)) !== null) {
    matches.push({ index: match.index, keyword: match[1] });
  }
  matches.reverse();
  let output = html;
  let alreadyLinked = /* @__PURE__ */ new Set();
  for (const { index, keyword } of matches) {
    const kwLower = keyword.toLowerCase();
    if (alreadyLinked.has(kwLower)) continue;
    let href = null;
    if (overrides[kwLower]) {
      href = overrides[kwLower];
    } else {
      let navLabel = Object.keys(sectionLinks).find(
        (label) => kwLower === label || allowedSuffixes.some((suffix) => kwLower === `${label} ${suffix}`)
      );
      if (navLabel) {
        href = sectionLinks[navLabel];
      }
    }
    if (!href && linkOverrides.includes(kwLower)) {
      const img = pickRandomImage(linkableImages);
      if (img) {
        let galleryIdx = galleryDatas.findIndex((arr) => arr.find((e) => e.id === img.id));
        const idPart = img.id.startsWith("i-") ? img.id : `i-${img.id}`;
        href = `${galleryPaths[galleryIdx] || galleryPaths[0]}/${idPart}`;
      }
    }
    if (!href) {
      let img = linkableImages.find(
        (img2) => [img2.title, img2.alt, img2.description, ...img2.keywords || []].filter(Boolean).some((str) => typeof str === "string" && str.trim().toLowerCase() === kwLower)
      );
      if (img) {
        let galleryIdx = galleryDatas.findIndex((arr) => arr.find((e) => e.id === img.id));
        const idPart = img.id.startsWith("i-") ? img.id : `i-${img.id}`;
        href = `${galleryPaths[galleryIdx] || galleryPaths[0]}/${idPart}`;
      }
    }
    if (href) {
      output = output.slice(0, index) + `<a href="${href}" class="kw-link">${keyword}</a>` + output.slice(index + keyword.length);
      alreadyLinked.add(kwLower);
    }
  }
  return output;
}

export { autoLinkKeywordsInTextM as a };
