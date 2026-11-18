export function getContentReviewState(entry) {
  return {
    isOim: entry?.classification === "oim",
    isScout: entry?.classification === "scout" || entry?.scout === true,
  };
}

const COPY_FIELDS = new Set([
  "title", "alt", "description", "story", "keywords", "tags", "collectorNotes", "notes",
]);

export function getManualCopyPatch(changedFields) {
  return [...changedFields].some((field) => COPY_FIELDS.has(field))
    ? { contentSource: "human" }
    : {};
}

export function toggleContentReview(entry, source) {
  let { isOim, isScout } = getContentReviewState(entry);
  if (source === "oim") isOim = !isOim;
  if (source === "scout") isScout = !isScout;

  // Keep the existing registry classifications compatible with older records.
  return {
    classification: isOim ? "oim" : isScout ? "scout" : null,
    ...(isOim && isScout ? { scout: true } : {}),
  };
}
