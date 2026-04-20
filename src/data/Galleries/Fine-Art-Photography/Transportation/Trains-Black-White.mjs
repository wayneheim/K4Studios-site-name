import { galleryData as sourceGalleryData } from "./Trains.mjs";

const MONOCHROME_PATTERNS = [
  /\bblack and white\b/i,
  /\bblack & white\b/i,
  /\bb&w\b/i,
  /\bb\/w\b/i,
  /\bmonochrome\b/i,
];

const EXPLICIT_COLOR_PATTERNS = [
  /\bcolor photograph\b/i,
  /\bin rich color\b/i,
  /\bcolorful\b/i,
  /\bvivid hues?\b/i,
  /\bfull color\b/i,
  /\bin color\b/i,
];

function matchesAny(value, patterns) {
  const text = String(value || "");
  return patterns.some((pattern) => pattern.test(text));
}

function isTraditionalTrainBlackAndWhite(image) {
  if (!image || typeof image !== "object") return false;
  if (image.id === "i-k4studios") return true;

  const keywordText = Array.isArray(image.keywords) ? image.keywords.join(" ") : "";
  const combinedText = [image.description, keywordText].join(" ");
  const visibleText = [image.alt, image.description, image.story].join(" ");

  return matchesAny(combinedText, MONOCHROME_PATTERNS) && !matchesAny(visibleText, EXPLICIT_COLOR_PATTERNS);
}

export const galleryData = sourceGalleryData.filter(isTraditionalTrainBlackAndWhite);