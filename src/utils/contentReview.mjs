export function getContentReviewState(entry) {
  return {
    isOim: entry?.classification === "oim",
    isScout: entry?.classification === "scout" || entry?.scout === true,
  };
}

export function isOimImage(imageId, galleryPath, registry) {
  const id = String(imageId || '').replace(/-sketch$/i, '');
  if (!id) return false;
  const path = String(galleryPath || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  const datasetPath = path.startsWith('src/data/') ? `/${path}` : `/src/data/${path}.mjs`;
  const images = registry?.images || {};
  const exactKey = `${id}:${datasetPath}`;
  if (Object.prototype.hasOwnProperty.call(images, exactKey)) {
    return getContentReviewState(images[exactKey]).isOim;
  }
  // Shared images can appear in another gallery or in a direct Sketch view.
  return Object.entries(images).some(([key, entry]) =>
    (key === id || key.startsWith(`${id}:`)) && getContentReviewState(entry).isOim,
  );
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
