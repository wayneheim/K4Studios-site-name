export const DEFAULT_AVAILABLE_SERIES = ["foundation"];

const MANAGED_SERIES = new Set(["sketch", "foundation", "chronicle", "legend"]);

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
