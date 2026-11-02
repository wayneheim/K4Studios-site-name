import { useEffect, useState } from "react";
import CollectionOrderModal from "./commerce/CollectionOrderModal.jsx";
import {
  SERIES_DEFINITIONS,
  fetchPricingConfig,
  getEffectiveSeries,
  getExcludeSizesFromRegistry,
  getSeriesPricingList,
  loadSeriesRegistry,
} from "../data/seriesDefinitions.js";
import { normalizeImageSrc } from "../utils/imageProxyCore.js";

const ENGRAINED_GALLERY_PATH = "/Other/K4-Select-Series/Engrained/Engrained-Series";

function getInStockCount(inventory = {}) {
  return Number(inventory.inStock) || Math.max(
    0,
    (Number(inventory.printed) || 0) - (Number(inventory.sold) || 0),
  );
}

function normalizeDatasetPathToPublicPath(input = "") {
  if (!input || typeof input !== "string") return "";
  let normalized = input.replace(/\\/g, "/").trim();
  normalized = normalized.replace(/^src\/(data|pages)\//, "");
  normalized = normalized.replace(/\.(mjs|astro)$/i, "");
  normalized = normalized.replace(/^\/+/, "");
  if (!normalized) return "";
  if (normalized.startsWith("Galleries/") || normalized.startsWith("Other/")) return `/${normalized}`;
  if (normalized.startsWith("K4-Select-Series/")) return `/Other/${normalized}`;
  return `/${normalized}`;
}

function buildPaperGalleryUrl(galleryPath, imageId) {
  const basePath = normalizeDatasetPathToPublicPath(galleryPath);
  return basePath && imageId ? `${basePath}/${imageId}` : "";
}

async function fetchGalleryImage(datasetPath, imageId) {
  const response = await fetch(
    `/.netlify/functions/updateGalleryItem?datasetPath=${encodeURIComponent(datasetPath)}`,
    { cache: "no-store" },
  );
  if (!response.ok) throw new Error(`Failed to load linked gallery (${response.status})`);
  const data = await response.json();
  return (data.items || []).find((item) => item.id === imageId) || null;
}

async function fetchPaperAlternative(image) {
  if (!image?.linkedImageId || !image?.linkedGalleryPath) return null;

  const fallback = {
    title: image.title,
    url: buildPaperGalleryUrl(image.linkedGalleryPath, image.linkedImageId),
    previewSrc: "",
    seriesOptions: [],
  };

  try {
    const [masterImage, registry, pricingConfig] = await Promise.all([
      fetchGalleryImage(image.linkedGalleryPath, image.linkedImageId),
      loadSeriesRegistry(),
      fetchPricingConfig(),
    ]);
    if (!masterImage) return fallback;

    const excludeSizes = getExcludeSizesFromRegistry(masterImage.id, registry);
    const displaySeries = getEffectiveSeries(masterImage, registry)
      .filter((seriesKey) => SERIES_DEFINITIONS[seriesKey] && seriesKey !== "engrained")
      .sort((a, b) => (SERIES_DEFINITIONS[a].sortOrder || 99) - (SERIES_DEFINITIONS[b].sortOrder || 99));

    return {
      title: masterImage.title || image.title,
      url: fallback.url,
      previewSrc: normalizeImageSrc(masterImage.srcM || masterImage.srcS || masterImage.src || "", "m"),
      seriesOptions: displaySeries.map((seriesKey) => ({
        key: seriesKey,
        definition: SERIES_DEFINITIONS[seriesKey],
        pricingList: getSeriesPricingList(seriesKey, pricingConfig.pricing, excludeSizes),
      })),
    };
  } catch (error) {
    console.error("[EngrainedOrderModal] Failed to load paper alternative:", error);
    return fallback;
  }
}

/**
 * Dedicated Engrained pages use the same first-party collection cart as every
 * other physical print. Each record supplies its own size, price, edition
 * limit, and inventory; no generic Engrained price is substituted here.
 */
export default function EngrainedOrderModal({ isOpen, onClose, image, trackEvent }) {
  const [paperAlternative, setPaperAlternative] = useState(null);
  const [paperAlternativeLoading, setPaperAlternativeLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!isOpen || !image?.linkedImageId || !image?.linkedGalleryPath) {
      setPaperAlternative(null);
      setPaperAlternativeLoading(false);
      return () => { cancelled = true; };
    }

    setPaperAlternativeLoading(true);
    fetchPaperAlternative(image)
      .then((result) => { if (!cancelled) setPaperAlternative(result); })
      .finally(() => { if (!cancelled) setPaperAlternativeLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen, image]);

  if (!image) return null;

  const engrainedLink = {
    engrainedId: image.id,
    title: image.title,
    description: image.description,
    url: `${ENGRAINED_GALLERY_PATH}/${image.id}`,
    price: image.price,
    imageSize: image.imageSize,
    editionSize: image.editionSize,
    hasInventory: getInStockCount(image.inventory) > 0,
  };

  return (
    <CollectionOrderModal
      isOpen={isOpen}
      onClose={onClose}
      image={image}
      trackEvent={trackEvent}
      displaySeries={[]}
      engrainedLink={engrainedLink}
      engrainedPrimary
      paperAlternative={paperAlternative}
      paperAlternativeLoading={paperAlternativeLoading}
      oneImageMovie={Boolean(image.oneImageMovie)}
    />
  );
}
