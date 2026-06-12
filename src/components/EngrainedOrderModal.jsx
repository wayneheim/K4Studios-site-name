import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CircleX } from "lucide-react";
import {
  SERIES_DEFINITIONS,
  fetchPricingConfig,
  getEffectiveSeries,
  getExcludeSizesFromRegistry,
  getSeriesPricingList,
  loadSeriesRegistry,
} from "../data/seriesDefinitions.js";
import { getProxySrc, normalizeImageSrc } from "../utils/imageProxyCore.js";

function getInStockCount(inventory = {}) {
  return inventory.inStock || Math.max(0, (inventory.printed || 0) - (inventory.sold || 0));
}

function buildEngrainedMailtoLink(image) {
  const subject = encodeURIComponent(`Order Inquiry: ${image?.title || "Engrained Series Image"} — Engrained Series`);
  const sizeLine = image?.imageSize
    ? `Size: ${image.imageSize}${image?.price ? ` (${image.price})` : ""}`
    : image?.price
      ? `Price: ${image.price}`
      : "";

  let body = "Hello,\n\nI am interested in ordering:\n\n";
  body += `Image: ${image?.title || "N/A"}\n`;
  body += `Image ID: ${image?.id || "N/A"}\n`;
  body += "Series: Engrained (Baltic Birch Wood Print)\n";
  if (sizeLine) {
    body += `${sizeLine}\n`;
  }
  body += "\nPlease provide ordering information.\n\n";
  body += "---\n";
  body += "Your Name:\n";
  body += "Preferred Contact (email or phone):\n";
  body += "---\n\n";
  body += "Thank you!";

  return `mailto:info@k4studios.com?subject=${subject}&body=${encodeURIComponent(body)}`;
}

function normalizeDatasetPathToPublicPath(input = "") {
  if (!input || typeof input !== "string") return "";

  let normalized = input.replace(/\\/g, "/").trim();
  normalized = normalized.replace(/^src\/(data|pages)\//, "");
  normalized = normalized.replace(/\.(mjs|astro)$/i, "");
  normalized = normalized.replace(/^\/+/, "");

  if (!normalized) return "";
  if (normalized.startsWith("Galleries/") || normalized.startsWith("Other/")) {
    return `/${normalized}`;
  }
  if (normalized.startsWith("K4-Select-Series/")) {
    return `/Other/${normalized}`;
  }

  return `/${normalized}`;
}

function buildPaperGalleryUrl(galleryPath, imageId) {
  const basePath = normalizeDatasetPathToPublicPath(galleryPath);
  if (!basePath || !imageId) return "";
  return `${basePath}/${imageId}`;
}

async function fetchGalleryImage(datasetPath, imageId) {
  if (!datasetPath || !imageId) return null;

  const response = await fetch(
    `/.netlify/functions/updateGalleryItem?datasetPath=${encodeURIComponent(datasetPath)}`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    throw new Error(`Failed to load linked gallery (${response.status})`);
  }

  const data = await response.json();
  const image = (data.items || []).find((item) => item.id === imageId);
  return image || null;
}

async function fetchPaperAlternative(image) {
  if (!image?.linkedImageId || !image?.linkedGalleryPath) return null;

  const [masterImage, registry, pricingConfig] = await Promise.all([
    fetchGalleryImage(image.linkedGalleryPath, image.linkedImageId),
    loadSeriesRegistry(),
    fetchPricingConfig(),
  ]);

  if (!masterImage) return null;

  const excludeSizes = getExcludeSizesFromRegistry(masterImage.id, registry);
  const displaySeries = getEffectiveSeries(masterImage, registry)
    .filter((seriesKey) => SERIES_DEFINITIONS[seriesKey] && seriesKey !== "engrained")
    .sort((a, b) => (SERIES_DEFINITIONS[a].sortOrder || 99) - (SERIES_DEFINITIONS[b].sortOrder || 99));

  const seriesOptions = displaySeries.map((seriesKey) => ({
    key: seriesKey,
    definition: SERIES_DEFINITIONS[seriesKey],
    pricingList: getSeriesPricingList(seriesKey, pricingConfig.pricing, excludeSizes),
  }));

  return {
    title: masterImage.title || image.title,
    url: buildPaperGalleryUrl(image.linkedGalleryPath, image.linkedImageId),
    previewSrc: normalizeImageSrc(masterImage.srcM || masterImage.srcS || masterImage.src || "", "m"),
    seriesOptions,
  };
}

export default function EngrainedOrderModal({ isOpen, onClose, image, trackEvent }) {
  const [paperAlternative, setPaperAlternative] = useState(null);
  const [paperAlternativeLoading, setPaperAlternativeLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!isOpen || !image?.linkedImageId || !image?.linkedGalleryPath) {
      setPaperAlternative(null);
      setPaperAlternativeLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setPaperAlternativeLoading(true);
    fetchPaperAlternative(image)
      .then((result) => {
        if (!cancelled) {
          setPaperAlternative(result);
        }
      })
      .catch((error) => {
        console.error("[EngrainedOrderModal] Failed to load paper alternative:", error);
        if (!cancelled) {
          setPaperAlternative(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPaperAlternativeLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, image]);

  if (!image) return null;

  const hasInventory = getInStockCount(image.inventory || {}) > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[10000] bg-black bg-opacity-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="p-6 relative">
              <div className="mb-4 flex items-center gap-3">
                <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent to-gray-400/35" />
                <h2 className="text-base font-bold text-gray-800/75 whitespace-nowrap">Order Options</h2>
                <div className="h-0.5 flex-1 bg-gradient-to-l from-transparent to-gray-400/35" />
              </div>

              <div className="space-y-4">
                <div className="text-center">
                  <img
                    src={getProxySrc(image.id, "s")}
                    alt={image.alt || image.title}
                    className="w-full max-w-48 mx-auto rounded-lg shadow-md"
                  />
                  <h3 className="text-lg font-semibold text-gray-800 mt-3">{image.title}</h3>
                  {image.oneImageMovie && (
                    <p className="text-xs text-[#8a3d2b] mt-1">
                      A One-Image Movie™ work by Wayne Heim
                    </p>
                  )}
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">Pricing Information</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    {(() => {
                      const editionSize = image.editionSize;
                      const imageSize = image.imageSize;
                      const price = image.price;
                      const availability = image.availability;
                      const shipping = image.shipping;

                      if (editionSize || imageSize || price || availability || shipping) {
                        return (
                          <div className="space-y-1">
                            {editionSize && <p style={{ color: "#1b1a19" }}>• Limited Edition: {editionSize}</p>}
                            {imageSize && <p style={{ color: "#1b1a19" }}>• Size: {imageSize}</p>}
                            {price && <p style={{ color: "#1b1a19" }}>• Price: {price}</p>}
                            {availability && <p style={{ color: "#1b1a19" }}>• Availability: {availability}</p>}
                            {shipping && <p style={{ color: "#1b1a19" }}>• Shipping: {shipping}</p>}
                          </div>
                        );
                      }

                      const description = image.description || "";
                      const pricingMatches = description.match(/\$[\d,]+(?:\.\d{2})?/g);
                      const sizeMatches = description.match(/\d+"?\s*x\s*\d+"?/g);
                      const limitedEdition = description.match(/Limited edition[-\s]*(\d+)/i);

                      if (pricingMatches && pricingMatches.length > 0) {
                        return (
                          <div className="space-y-1">
                            {limitedEdition && <p style={{ color: "#1b1a19" }}>• Limited Edition: {limitedEdition[1]}</p>}
                            {sizeMatches && sizeMatches.length > 0 && (
                              <p style={{ color: "#1b1a19" }}>• Size: {sizeMatches[0].replace(/x/g, " × ")}</p>
                            )}
                            <p style={{ color: "#1b1a19" }}>• Price: {pricingMatches[0]}</p>
                            <p style={{ color: "#1b1a19" }}>• Availability: Call</p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-1">
                          <p style={{ color: "#1b1a19" }}>• Contact us for custom pricing</p>
                          <p style={{ color: "#1b1a19" }}>• Various sizes available</p>
                          <p style={{ color: "#1b1a19" }}>• Limited edition</p>
                          <p style={{ color: "#1b1a19" }}>• Availability: Call</p>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="p-4 rounded-lg" style={{ backgroundColor: "#cfd1c8ff" }}>
                  <h4 className="font-semibold mb-2" style={{ color: "#1b1a19" }}>About Engrained Series</h4>
                  <p className="text-sm" style={{ color: "#1b1a19" }}>
                    Fine art printed on nature's canvas. Each piece is created using a custom 5-layer UV process on hand-selected Baltic Birch, where the wood's natural grain becomes part of the image. The result: rich depth, painterly texture, and a one-of-a-kind fusion of art and nature.
                  </p>
                </div>

                <div className="text-center">
                  <a
                    href={buildEngrainedMailtoLink(image)}
                    className="inline-flex items-center justify-center gap-2 w-full max-w-xs px-4 py-2.5 text-white rounded text-sm transition-all font-medium"
                    style={{
                      background: "linear-gradient(to bottom, #92400e 0%, #78350f 100%)",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
                      border: "1px solid #78350f",
                      textShadow: "0 1px 1px rgba(0,0,0,0.3)",
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.background = "linear-gradient(to bottom, #78350f 0%, #451a03 100%)";
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.background = "linear-gradient(to bottom, #92400e 0%, #78350f 100%)";
                    }}
                    onClick={() => {
                      trackEvent?.("order_submitted");
                    }}
                  >
                    <span>Contact Us to Order</span>
                    {hasInventory && <span className="text-xs text-green-200/90 font-normal italic">· Quick ship available</span>}
                  </a>
                </div>

                {(paperAlternativeLoading || paperAlternative) && (
                  <div className="p-4 rounded-lg border" style={{ backgroundColor: "#f7f5ef", borderColor: "#d6d1c5" }}>
                    <h4 className="font-semibold mb-2" style={{ color: "#1b1a19" }}>Also Available as Paper Editions</h4>
                    <p className="text-sm mb-3" style={{ color: "#534b45" }}>
                      Prefer the standard collector print series? This Engrained piece is linked to its paper-gallery edition as well.
                    </p>

                    {paperAlternativeLoading && (
                      <p className="text-sm" style={{ color: "#6b645d" }}>Loading paper edition pricing...</p>
                    )}

                    {paperAlternative && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 rounded-lg bg-white/80 p-2 border" style={{ borderColor: "#e5dfd0" }}>
                          {paperAlternative.previewSrc && (
                            <img
                              src={paperAlternative.previewSrc}
                              alt={paperAlternative.title}
                              className="w-14 h-14 rounded object-cover shadow-sm"
                            />
                          )}
                          <div>
                            <div className="text-sm font-semibold" style={{ color: "#1b1a19" }}>{paperAlternative.title}</div>
                            <div className="text-xs" style={{ color: "#6b645d" }}>Paper collector formats</div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {paperAlternative.seriesOptions.map(({ key, definition, pricingList }) => (
                            <div key={key} className="rounded-lg border bg-white px-3 py-2" style={{ borderColor: "#e5dfd0" }}>
                              <div className="text-sm font-semibold mb-1" style={{ color: "#1b1a19" }}>
                                {definition.icon} {definition.label} Series
                              </div>
                              <div className="text-xs leading-relaxed" style={{ color: "#534b45" }}>
                                {pricingList && pricingList.length > 0
                                  ? pricingList.map(({ size, price }) => `${size}: $${price.toLocaleString()}`).join(" · ")
                                  : "Contact for current sizing and pricing."}
                              </div>
                            </div>
                          ))}
                        </div>

                        {paperAlternative.url && (
                          <a
                            href={paperAlternative.url}
                            className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded text-sm font-medium transition-all"
                            style={{
                              background: "linear-gradient(to bottom, #ebe7dd 0%, #ddd6c8 100%)",
                              border: "1px solid #c8bfaf",
                              color: "#3f352c",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.4)",
                            }}
                            onClick={() => {
                              trackEvent?.("gallery_navigate");
                            }}
                          >
                            View Paper Options
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                className="absolute bottom-4 left-4 inline-flex items-center justify-center w-8 h-8 border border-gray-300 bg-white text-gray-300 rounded-full shadow-sm hover:bg-gray-700 hover:text-gray-200 hover:border-red-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400 transition-colors cursor-pointer"
                aria-label="Close pricing modal"
                title="Close"
                onClick={onClose}
              >
                <CircleX className="w-7 h-7" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
