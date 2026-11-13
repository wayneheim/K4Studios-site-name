export const TURBO_FIELD_NAMES = Object.freeze([
  "title",
  "story",
  "description",
  "alt",
  "keywords",
  "collectorNotes",
]);

export function buildTurboText(item) {
  if (!item) return "";
  const keywords = Array.isArray(item.tags)
    ? item.tags.join(", ")
    : Array.isArray(item.keywords)
    ? item.keywords.join(", ")
    : "";
  const collectorNotes = item.collectorNotes ?? item.notes ?? "";

  return `<<TITLE>>
${item.title || ""}

<<STORY>>
${item.story || ""}

<<DESCRIPTION>>
${item.description || ""}

<<ALT>>
${item.alt || ""}

<<KEYWORDS>>
${keywords}

<<COLLECTOR_NOTES>>
${collectorNotes}`;
}

export function parseTurboText(text) {
  const result = {};
  const sections = {
    TITLE: "title",
    STORY: "story",
    DESCRIPTION: "description",
    ALT: "alt",
    KEYWORDS: "keywords",
    COLLECTOR_NOTES: "collectorNotes",
  };

  const regex = /(?:\d+\.\s*)?<?<(\w+)>>?\s*([\s\S]*?)(?=(?:\d+\.\s*)?<?<\w+>>?|$)/g;
  let match;
  while ((match = regex.exec(String(text ?? ""))) !== null) {
    const tag = match[1].toUpperCase();
    const content = match[2].trim().replace(/\n+\d+\.?\s*$/, "").trim();
    if (sections[tag]) result[sections[tag]] = content;
  }
  return result;
}

export function getChangedTurboFields(baselineText, currentText) {
  const baseline = parseTurboText(baselineText);
  const current = parseTurboText(currentText);
  const changed = new Set();

  for (const field of TURBO_FIELD_NAMES) {
    // Missing sections are skipped. Keep a tag with empty content to clear it.
    if (
      Object.prototype.hasOwnProperty.call(current, field) &&
      current[field] !== baseline[field]
    ) {
      changed.add(field);
    }
  }
  return changed;
}

export function buildTurboPatch(item, fieldsToSave) {
  const patch = {};
  if (fieldsToSave.has("title")) patch.title = item.title ?? "";
  if (fieldsToSave.has("alt")) patch.alt = item.alt ?? "";
  if (fieldsToSave.has("description")) patch.description = item.description ?? "";
  if (fieldsToSave.has("story")) patch.story = item.story ?? "";
  if (fieldsToSave.has("collectorNotes")) {
    patch.notes = item.collectorNotes ?? item.notes ?? "";
  }
  if (fieldsToSave.has("keywords")) {
    patch.keywords = Array.isArray(item.tags)
      ? item.tags
      : Array.isArray(item.keywords)
      ? item.keywords
      : [];
  }
  if (fieldsToSave.has("rating") && typeof item.rating === "number") {
    patch.rating = item.rating;
  }
  return patch;
}
