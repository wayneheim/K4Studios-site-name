export const DEFAULT_AVAILABLE_SERIES = ["foundation"];

const MANAGED_SERIES = new Set(["sketch", "foundation", "chronicle", "legend"]);

function pathToDatasetPath(galleryPath = "") {
  const clean = String(galleryPath || "").replace(/^\/+/, "").replace(/\/+$/, "");
  return clean ? `/src/data/${clean}.mjs` : "";
}

export function findSeriesId(imageId, galleryPath, registry = null) {
  if (!imageId || !registry?.images) return null;

  const candidates = [
    `${imageId}:${pathToDatasetPath(galleryPath)}`,
    `${imageId}:${galleryPath}`,
    imageId,
  ].filter(Boolean);

  for (const key of candidates) {
    if (registry.images[key]) return registry.images[key];
  }

  for (const [key, seriesId] of Object.entries(registry.images)) {
    if (key.startsWith(`${imageId}:`)) return seriesId;
  }

  return null;
}

export function getConfiguredSeries(image, seriesRecord = null) {
  if (seriesRecord && Array.isArray(seriesRecord.tiers)) {
    return seriesRecord.tiers.filter((tier) => MANAGED_SERIES.has(tier));
  }

  if (image?._hasSeriesOverride === true || Array.isArray(image?.availableSeries)) {
    return (image?.availableSeries || []).filter((tier) => MANAGED_SERIES.has(tier));
  }

  return [...DEFAULT_AVAILABLE_SERIES];
}

export function getEffectiveSeries(image, seriesRecord = null) {
  const series = getConfiguredSeries(image, seriesRecord);

  if (!image?.noSketch && !series.includes("sketch")) {
    series.unshift("sketch");
  }

  return series.filter((tier) => tier !== "engrained");
}

export function resolveImageSeries({ image, galleryPath, registry }) {
  const seriesId = findSeriesId(image?.id, galleryPath, registry);
  const seriesRecord = seriesId ? registry?.series?.[seriesId] || null : null;

  return {
    seriesId,
    seriesRecord,
    tiers: getEffectiveSeries(image, seriesRecord),
  };
}
