import { siteNav } from "../../data/siteNav.ts";
import { semantic } from "../../data/semantic/K4-Sem.ts";
import { allImages } from "../../data/galleryMaps/PainterlyMasterData.mjs";

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function flattenNav(nav: any[], map: Record<string, string> = {}) {
  for (const item of nav) {
    if (item.label && item.href) {
      map[item.label.trim().toLowerCase()] = item.href;
    }
    if (item.children) flattenNav(item.children, map);
  }
  return map;
}

function isSelfLink(targetHref: string, currentPath: string) {
  return currentPath.replace(/\/$/, "") === targetHref.replace(/\/$/, "");
}

function getMatchScore(image: any, keyword: string): number {
  const kw = keyword.toLowerCase();
  let score = 0;
  if (image.title?.toLowerCase().includes(kw)) score += 4;
  if (image.alt?.toLowerCase().includes(kw)) score += 3;
  if (image.description?.toLowerCase().includes(kw)) score += 2;
  if (image.story?.toLowerCase().includes(kw)) score += 1;
  if (image.keywords?.some(k => k.toLowerCase() === kw)) score += 2.5;
  return score;
}

function extractAllKeywordsFromImages(): string[] {
  const keywordSet = new Set<string>();
  for (const img of allImages) {
    img.keywords?.forEach((kw: string) => keywordSet.add(kw.toLowerCase()));
  }
  return Array.from(keywordSet);
}

const keywordCycleMap: Record<string, number> = {}; // Tracks cycling index for each keyword

function pickImageForKeyword(keyword: string) {
  const matches = allImages
    .filter((img) => {
      if (img.visibility === "ghost") return false;
      if (getMatchScore(img, keyword) === 0) return false;
      return true;
    })
    .sort((a, b) => getMatchScore(b, keyword) - getMatchScore(a, keyword));

  if (matches.length === 0) return null;

  // Cycle through matches for this keyword
  const idx = keywordCycleMap[keyword] || 0;
  const picked = matches[idx % matches.length];
  keywordCycleMap[keyword] = idx + 1;

  if (!picked || !picked.galleries?.length) return null;

  const href = `/${picked.galleries[0]}/${picked.id}`;

  return {
    href,
    title: keyword
  };
}

export function autoLinkKeywordsInTextUnified({
  html,
  currentPath,
}: {
  html: string;
  currentPath: string;
}) {
  const linkMap = flattenNav(siteNav);
  const usedKeywords = new Set<string>();
  const perGalleryUse: Record<string, number> = {};
  const MAX_PER_GALLERY = 2;

  const allKeywords = extractAllKeywordsFromImages();

  const keywordRegex = new RegExp(
    `\\b(${allKeywords.map(escapeRegex).join("|")})\\b`,
    "gi"
  );

  const linked = html.replace(keywordRegex, (match) => {
    const keyword = match.toLowerCase();

    const hrefFromNav = linkMap[keyword];
    if (hrefFromNav && !isSelfLink(hrefFromNav, currentPath)) {
      usedKeywords.add(keyword);
      return `<a href="${hrefFromNav}">${match}</a>`;
    }

    const imageMatch = pickImageForKeyword(keyword);
    if (imageMatch) {
      const galleryPath = imageMatch.href.split("/i-")[0].replace(/\/$/, "");

      perGalleryUse[galleryPath] = (perGalleryUse[galleryPath] || 0) + 1;
      if (perGalleryUse[galleryPath] > MAX_PER_GALLERY) return match;

      usedKeywords.add(keyword);
      return `<a href="${imageMatch.href}">${match}</a>`;
    }

    return match;
  });

  return linked;
}