import { galleryData as trainsGalleryData } from "./Trains.mjs";

const BW_PATTERN = /\b(black\s*&\s*white|black\s+and\s+white|monochrome|b\/?w)\b/i;

function isBlackAndWhiteImage(img) {
  if (!img || typeof img !== "object") return false;

  // Keep the intro card used by gallery shells.
  if (img.id === "i-k4studios") return true;

  const haystack = [
    img.title,
    img.description,
    img.alt,
    Array.isArray(img.keywords) ? img.keywords.join(" ") : "",
  ]
    .filter(Boolean)
    .join(" ");

  return BW_PATTERN.test(haystack);
}

export const galleryData = trainsGalleryData.filter(isBlackAndWhiteImage);
