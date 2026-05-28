const REPEATED_JOIN_PATTERN = /([A-Za-z][A-Za-z'’-]*(?:[\/–-][A-Za-z][A-Za-z'’-]*)*(?:\s+[A-Za-z][A-Za-z'’-]*(?:[\/–-][A-Za-z][A-Za-z'’-]*)*){1,7})\s+(?:and|or|-|–)\s+\1/gi;
const REPEATED_TOUCH_PATTERN = /([A-Za-z][A-Za-z'’-]*(?:[\/–-][A-Za-z][A-Za-z'’-]*)*(?:\s+[A-Za-z][A-Za-z'’-]*(?:[\/–-][A-Za-z][A-Za-z'’-]*)*){1,7})\s+with a touch of\s+\1/gi;
const REPEATED_THROUGH_PATTERN = /([A-Za-z][A-Za-z'’-]*(?:[\/–-][A-Za-z][A-Za-z'’-]*)*(?:\s+[A-Za-z][A-Za-z'’-]*(?:[\/–-][A-Za-z][A-Za-z'’-]*)*){1,7})\s+through\s+\1/gi;

export function sanitizeRepeatedSeoCopy(value = "") {
  let text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";

  let previous = "";
  while (text !== previous) {
    previous = text;
    text = text
      .replace(REPEATED_JOIN_PATTERN, "$1")
      .replace(REPEATED_TOUCH_PATTERN, "$1")
      .replace(REPEATED_THROUGH_PATTERN, "$1")
      .replace(/\s+([.,;:!?])/g, "$1")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  return text;
}