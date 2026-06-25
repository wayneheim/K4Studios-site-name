import {
  galleryDoorwayAssignments,
} from "./galleryDoorwayAssignments.generated.js";
import { getChapterDoorwayTerm } from "./chapterDoorwayLinks.js";
import {
  galleryDoorwayFrames,
  chapterDoorwayThemes,
  getChapterDoorwayThemeForPaths,
  normalizeDoorwayPath,
} from "./chapterDoorwayConfig.mjs";

function hashToIndex(seed, length) {
  if (!length) return 0;
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % length;
}

function getFallbackAssignment(galleryPath) {
  const theme = getChapterDoorwayThemeForPaths([galleryPath]);
  if (!theme?.doorwayPaths?.length) return null;
  const doorwayIndex = hashToIndex(`${theme.key}|${normalizeDoorwayPath(galleryPath)}`, theme.doorwayPaths.length);
  return {
    theme: theme.key,
    href: theme.doorwayPaths[doorwayIndex],
    frameIndex: doorwayIndex % galleryDoorwayFrames.length,
    generated: false,
  };
}

export function getGalleryDoorwayLink(galleryPath = "") {
  const normalizedGalleryPath = normalizeDoorwayPath(galleryPath);
  if (!normalizedGalleryPath) return null;

  const generatedAssignment = galleryDoorwayAssignments[normalizedGalleryPath];
  const assignment = generatedAssignment || getFallbackAssignment(normalizedGalleryPath);
  if (!assignment?.href) return null;

  const href = normalizeDoorwayPath(assignment.href);
  if (href.toLowerCase() === normalizedGalleryPath.toLowerCase()) return null;

  const configuredTheme = chapterDoorwayThemes.find((theme) => theme.key === assignment.theme);
  if (configuredTheme && !configuredTheme.doorwayPaths.map(normalizeDoorwayPath).includes(href)) {
    return null;
  }

  const term = getChapterDoorwayTerm(href);
  const frame = galleryDoorwayFrames[
    Number.isInteger(assignment.frameIndex)
      ? assignment.frameIndex % galleryDoorwayFrames.length
      : hashToIndex(`${normalizedGalleryPath}|${href}|gallery-frame`, galleryDoorwayFrames.length)
  ];

  return {
    href,
    term,
    label: frame.replace("[Term]", term),
    theme: assignment.theme || null,
    generated: Boolean(generatedAssignment),
  };
}
