import { semantic } from "./semantic/K4-Sem.ts";
import {
  chapterDoorwayAssignments,
} from "./chapterDoorwayAssignments.generated.js";
import {
  chapterDoorwayFrames,
  chapterDoorwayThemes,
  getChapterDoorwayThemeForPaths,
  normalizeDoorwayPath,
} from "./chapterDoorwayConfig.mjs";

const defaultTermByPath = {
  "/Civil-War-Art": "Civil War Art",
  "/Cowboy-Photography": "Cowboy Photography",
  "/Engrained": "Engrained",
  "/Fine-Art-Photography-of-the-American-West": "Fine Art Photography of the American West",
  "/Historical-Reenactment-Photography": "Historical Reenactment Photography",
  "/Narrative-Western-Art": "Narrative Western Art",
  "/WWII-Themed-Fine-Art-Prints": "WWII Themed Fine Art Prints",
};

function titleCasePhrase(phrase) {
  return String(phrase || "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((word) => {
      if (/^(and|or|of|the|a|an|in|to|for|with)$/i.test(word)) {
        return word.toLowerCase();
      }
      if (/^(WWII|K4)$/i.test(word)) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ")
    .replace(/^./, (char) => char.toUpperCase());
}

function getSemanticTermForPath(path) {
  const normalizedPath = normalizeDoorwayPath(path);
  let best = null;

  for (const [key, entry] of Object.entries(semantic || {})) {
    if (key === "synonymMap" || !entry || typeof entry !== "object") continue;

    const phrases = [
      ...(Array.isArray(entry.landingPhrases) ? entry.landingPhrases : []),
      ...(Array.isArray(entry.imagePhrases) ? entry.imagePhrases : []),
    ];

    for (const phraseEntry of phrases) {
      if (!phraseEntry?.use || !phraseEntry?.phrase) continue;
      const target = normalizeDoorwayPath(phraseEntry.link || entry.path);
      if (target !== normalizedPath) continue;

      const candidate = {
        phrase: phraseEntry.phrase,
        rating: Number(phraseEntry.rating || 0),
      };
      if (!best || candidate.rating > best.rating) best = candidate;
    }
  }

  return best?.phrase ? titleCasePhrase(best.phrase) : null;
}

export function getChapterDoorwayTerm(path) {
  const normalizedPath = normalizeDoorwayPath(path);
  return getSemanticTermForPath(normalizedPath)
    || defaultTermByPath[normalizedPath]
    || titleCasePhrase(normalizedPath.split("/").filter(Boolean).pop()?.replace(/-/g, " "));
}

function hashToIndex(seed, length) {
  if (!length) return 0;
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % length;
}

function getFallbackAssignment(imageId, basePath) {
  const theme = getChapterDoorwayThemeForPaths([basePath]);
  if (!theme?.doorwayPaths?.length) return null;
  const doorwayIndex = hashToIndex(`${theme.key}|${imageId}`, theme.doorwayPaths.length);
  return {
    theme: theme.key,
    href: theme.doorwayPaths[doorwayIndex],
    frameIndex: doorwayIndex % chapterDoorwayFrames.length,
    generated: false,
  };
}

export function getChapterDoorwayLink(image, basePath = "") {
  const imageId = image?.id;
  if (!imageId || String(imageId).trim().toLowerCase() === "i-k4studios") return null;

  const generatedAssignment = chapterDoorwayAssignments[imageId];
  const assignment = generatedAssignment || getFallbackAssignment(imageId, basePath);
  if (!assignment?.href) return null;

  const href = normalizeDoorwayPath(assignment.href);
  const configuredTheme = chapterDoorwayThemes.find((theme) => theme.key === assignment.theme);
  if (configuredTheme && !configuredTheme.doorwayPaths.map(normalizeDoorwayPath).includes(href)) {
    return null;
  }

  const term = getChapterDoorwayTerm(href);
  const frame = chapterDoorwayFrames[
    Number.isInteger(assignment.frameIndex)
      ? assignment.frameIndex % chapterDoorwayFrames.length
      : hashToIndex(`${imageId}|${href}|frame`, chapterDoorwayFrames.length)
  ];

  return {
    href,
    term,
    label: frame.replace("[Term]", term),
    theme: assignment.theme || null,
    generated: Boolean(generatedAssignment),
  };
}
