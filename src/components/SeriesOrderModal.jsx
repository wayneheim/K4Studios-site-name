// SeriesOrderModal.jsx — Unified ordering modal for all series (except Engrained)
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CircleX, Info } from "lucide-react";
import { SERIES_DEFINITIONS, SERIES_ICONS, getEffectiveSeries, getSeriesPricingList, fetchPricingConfig, loadSeriesRegistry, getExcludeSizesFromRegistry, isOneImageMovieFromRegistry } from "../data/seriesDefinitions.js";
import { getSpecialtyPrintSeries } from "../data/pricing/printSeries.js";
import { normalizeImageSrc } from "../utils/imageProxyCore.js";

// Import config at build time as fallback (auto-synced, no manual copy needed)
import pricingConfigFallback from "../data/pricingConfig.json";

// Engrained has its own order flow, but its public copy lives with shared print series data.
const [ENGRAINED_SERIES] = getSpecialtyPrintSeries();
const ENGRAINED_INFO = {
  title: ENGRAINED_SERIES.name,
  body: ENGRAINED_SERIES.description,
};

// Info overlay component (museum label style) - fixed position to float above modal
function SeriesInfoOverlay({ seriesKey, infoCopy, onClose }) {
  // Handle Engrained specially since it's not in pricingConfig
  const isEngrained = seriesKey === "engrained";
  const info = isEngrained ? ENGRAINED_INFO : (infoCopy?.[seriesKey] || pricingConfigFallback.infoCopy?.[seriesKey]);
  const def = SERIES_DEFINITIONS[seriesKey];
  
  if (!info) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black bg-opacity-30"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="bg-stone-50 border-2 border-stone-400 rounded-lg shadow-xl p-5 max-w-sm"
        style={isEngrained ? { borderColor: "#b45309", backgroundColor: "#fffbeb" } : {}}
        onClick={(e) => e.stopPropagation()}
      >
        <h4 className="flex items-center gap-2 font-semibold text-base mb-3" style={{ color: isEngrained ? "#92400e" : "#991b1b" }}>
          {def?.icon && <span className="text-lg">{def.icon}</span>}
          {info.title}
        </h4>
        <div className="text-sm text-stone-600 leading-relaxed whitespace-pre-line">
          {info.body}
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="text-xs text-stone-600 border border-stone-400 px-3 py-1 rounded hover:bg-stone-200 hover:border-stone-500 transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Fetch edition state for an image from seriesRegistry (consolidated database)
async function fetchEditionState(imageId) {
  try {
    const cacheBuster = Date.now();
    const res = await fetch(`/.netlify/functions/seriesRegistry?imageId=${imageId}&_t=${cacheBuster}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      // Convert editionData from registry format to component format
      const editionData = data.series?.editionData || {};
      const states = {};
      for (const [tier, tierData] of Object.entries(editionData)) {
        states[tier] = {
          soldBySize: tierData.soldBySize || {},
          printedBySize: tierData.printedBySize || {},
          sold: Object.values(tierData.soldBySize || {}).reduce((a, b) => a + b, 0),
          released: tierData.released || false
        };
      }
      return states;
    }
  } catch (err) {
    console.error("[SeriesOrderModal] Error fetching edition state:", err);
  }
  return {};
}

// Build mailto link with pre-filled info
function buildMailtoLink(image, seriesKey, seriesDef, editionNumber, selectedSize = null, price = null) {
  const subject = encodeURIComponent(`Order Inquiry: ${image.title || "Image"} — ${seriesDef.label} Series`);
  
  let body = `Hello,\n\nI am interested in ordering:\n\n`;
  body += `Image: ${image.title || "N/A"}\n`;
  body += `Image ID: ${image.id || "N/A"}\n`;
  body += `Series: ${seriesDef.label}\n`;
  
  if (selectedSize) {
    body += `Size: ${selectedSize}`;
    if (price) {
      body += ` ($${price.toLocaleString()})`;
    }
    body += `\n`;
  }
  
  if (seriesDef.showEdition && editionNumber !== undefined) {
    body += `Edition: ${editionNumber + 1} of ${seriesDef.editionLimit}\n`;
  }
  
  body += `\nPlease provide ordering information.\n\n`;
  body += `---\n`;
  body += `Your Name:\n`;
  body += `Preferred Contact (email or phone):\n`;
  body += `---\n\n`;
  body += `Thank you!`;
  
  return `mailto:info@k4studios.com?subject=${subject}&body=${encodeURIComponent(body)}`;
}

// Fetch Engrained data to check if current image has an Engrained counterpart
// Uses static endpoint (works in production), falls back to Netlify function (for fresh data in dev)
async function fetchEngrainedCrosslink(imageId) {
  // Helper to parse response and find linked item
  const findLinkedItem = (data) => {
    const linked = (data.items || []).find(
      item => item.linkedImageId === imageId && item.visibility !== "ghost"
    );
    if (linked) {
      const inv = linked.inventory || {};
      const inStock = inv.inStock || Math.max(0, (inv.printed || 0) - (inv.sold || 0));
      return {
        engrainedId: linked.id,
        title: linked.title,
        url: `/Other/K4-Select-Series/Engrained/Engrained-Series/${linked.id}`,
        price: linked.price,
        imageSize: linked.imageSize,
        inStock: inStock,
        hasInventory: inStock > 0
      };
    }
    return null;
  };

  // Try static endpoint first (always works in production)
  try {
    const res = await fetch(`/data/engrainedData.json?_t=${Date.now()}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      const result = findLinkedItem(data);
      if (result) return result;
    }
  } catch (err) {
    console.warn("[SeriesOrderModal] Static Engrained endpoint failed, trying function:", err.message);
  }

  // Fallback to Netlify function (for admin/dev with fresh writes)
  try {
    const res = await fetch(`/.netlify/functions/engrainedData?_t=${Date.now()}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      return findLinkedItem(data);
    }
  } catch (err) {
    console.error("[SeriesOrderModal] Error fetching Engrained crosslink:", err);
  }
  return null;
}

// Build mailto link for Engrained inquiry
function buildEngrainedMailtoLink(image, engrainedLink) {
  const subject = encodeURIComponent(`Order Inquiry: ${image.title || "Image"} — Engrained Series`);
  
  let body = `Hello,\n\nI am interested in ordering:\n\n`;
  body += `Image: ${image.title || "N/A"}\n`;
  body += `Image ID: ${image.id || "N/A"}\n`;
  body += `Series: Engrained (Baltic Birch Wood Print)\n`;
  
  if (engrainedLink.imageSize) {
    body += `Size: ${engrainedLink.imageSize}`;
    if (engrainedLink.price) {
      body += ` (${engrainedLink.price})`;
    }
    body += `\n`;
  }
  
  body += `\nPlease provide ordering information.\n\n`;
  body += `---\n`;
  body += `Your Name:\n`;
  body += `Preferred Contact (email or phone):\n`;
  body += `---\n\n`;
  body += `Thank you!`;
  
  return `mailto:info@k4studios.com?subject=${subject}&body=${encodeURIComponent(body)}`;
}

const FIRST_PARTY_BUY_LINK_HOSTS = new Set(["k4studios.com", "www.k4studios.com"]);
const BUY_LINK_PATH_PREFIXES = ["/Galleries/", "/Other/Photo-Shoots/"];
const BUY_LINK_SMUGMUG_HOST = "wayne-heim.smugmug.com";

// Legacy gallery data still contains first-party /A links; normalize them so we never emit broken internal buy URLs.
function normalizeBuyLink(buyLink) {
  if (typeof buyLink !== "string") return null;

  const trimmed = buyLink.trim();
  if (!trimmed) return null;

  const normalizeUrl = (url) => {
    if (!FIRST_PARTY_BUY_LINK_HOSTS.has(url.hostname)) {
      return url.toString();
    }

    const hasSupportedPath = BUY_LINK_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
    if (!hasSupportedPath || !url.pathname.endsWith("/A")) {
      return null;
    }

    url.protocol = "https:";
    url.hostname = BUY_LINK_SMUGMUG_HOST;
    return url.toString();
  };

  try {
    if (trimmed.startsWith("/")) {
      return normalizeUrl(new URL(trimmed, "https://www.k4studios.com"));
    }

    return normalizeUrl(new URL(trimmed));
  } catch {
    return null;
  }
}

export default function SeriesOrderModal({ isOpen, onClose, image, trackEvent }) {
  const [editionStates, setEditionStates] = useState({});
  const [pricingData, setPricingData] = useState(null);
  const [descriptions, setDescriptions] = useState(null);
  const [cardCopy, setCardCopy] = useState(null);
  const [infoCopy, setInfoCopy] = useState(null);
  const [seriesRegistry, setSeriesRegistry] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false); // Tracks if async data has been fetched
  const [activeInfo, setActiveInfo] = useState(null); // Which series info overlay is open
  const [engrainedLink, setEngrainedLink] = useState(null); // Cross-link to Engrained if exists

  // Fetch edition state and pricing when modal opens
  useEffect(() => {
    if (isOpen && image?.id) {
      setDataLoaded(false); // Reset on new image/open
      setActiveInfo(null); // Reset info overlay when modal opens
      setEngrainedLink(null); // Reset Engrained link
      Promise.all([
        fetchEditionState(image.id),
        fetchPricingConfig(),
        loadSeriesRegistry(), // Use static JSON file (works in production)
        fetchEngrainedCrosslink(image.id), // Check for Engrained crosslink
      ]).then(([states, config, registry, engrained]) => {
        setEditionStates(states);
        setPricingData(config.pricing);
        setDescriptions(config.descriptions);
        setCardCopy(config.cardCopy);
        setInfoCopy(config.infoCopy);
        setSeriesRegistry(registry);
        setEngrainedLink(engrained);
        setDataLoaded(true);
      });
    }
  }, [isOpen, image?.id]);

  if (!isOpen || !image) return null;

  // Derived loading state: we're loading if modal is open but data hasn't been fetched yet
  const loading = !dataLoaded;

  // Wait for registry to load before computing series (prevents SSR mismatch showing only "sketch")
  const effectiveSeries = seriesRegistry ? getEffectiveSeries(image, seriesRegistry) : [];
  const excludeSizes = seriesRegistry ? getExcludeSizesFromRegistry(image?.id, seriesRegistry) : {};
  const oneImageMovie = Boolean(image?.oneImageMovie || (seriesRegistry && isOneImageMovieFromRegistry(image?.id, seriesRegistry)));

  const buyLinkHref = normalizeBuyLink(image?.buyLink);
  const shouldUseBuyLink = (seriesKey) => (seriesKey === "sketch" || seriesKey === "foundation") && !!buyLinkHref;
  const getTierOrderHref = (seriesKey, seriesDef, editionNumber, size = null, price = null) => {
    if (shouldUseBuyLink(seriesKey)) return buyLinkHref;
    return buildMailtoLink(image, seriesKey, seriesDef, editionNumber, size, price);
  };

  // Filter to only series we have definitions for, then sort by sortOrder
  const displaySeries = effectiveSeries
    .filter((s) => SERIES_DEFINITIONS[s])
    .sort((a, b) => (SERIES_DEFINITIONS[a].sortOrder || 99) - (SERIES_DEFINITIONS[b].sortOrder || 99));

  return (
    <AnimatePresence>
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
          className="bg-white rounded-lg shadow-xl max-w-md w-full min-h-[520px] max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 relative">
            {/* Info overlay (museum label style) */}
            <AnimatePresence>
              {activeInfo && (
                <SeriesInfoOverlay
                  seriesKey={activeInfo}
                  infoCopy={infoCopy}
                  onClose={() => setActiveInfo(null)}
                />
              )}
            </AnimatePresence>

            {/* Header */}
            <div className="mb-2 flex items-center gap-3">
              <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent to-gray-400/35" />
              <h2 className="text-base font-bold text-gray-800/75 whitespace-nowrap">Order Options</h2>
              <div className="h-0.5 flex-1 bg-gradient-to-l from-transparent to-gray-400/35" />
            </div>

            {/* Image Preview */}
            <div className="text-center mb-3">
              <img
                src={normalizeImageSrc(image.src, 'm')}
                alt={image.title}
                className="w-full max-w-32 mx-auto rounded-lg shadow-md"
              />
              <h3 className="text-sm font-semibold text-gray-800 mt-2">{image.title}</h3>
              {oneImageMovie && (
                <p className="text-xs text-[#8a3d2b] mt-1">
                  A One-Image Movie™ work by Wayne Heim
                </p>
              )}
              <p className="text-xs text-gray-500 italic mt-1">
                Available as printed photographs in the following formats:
              </p>
            </div>

            {/* Series Options */}
            <div className="space-y-2">
              {loading && (
                <p className="text-gray-500 text-center py-4">Loading pricing options...</p>
              )}

              {!loading && displaySeries.length === 0 && (
                <p className="text-gray-500 text-center">No series available for this image.</p>
              )}

              {displaySeries.map((seriesKey) => {
                const def = SERIES_DEFINITIONS[seriesKey];
                if (!def) return null;

                const editionState = editionStates[seriesKey];
                const editionNumber = editionState?.sold ?? 0;
                const pricingList = getSeriesPricingList(seriesKey, pricingData, excludeSizes);

                // Progressive shades - Sketch is light green (different medium), then tan progression
                const bgColors = {
                  1: "#d7e2daff", // Sketch - sage green (proof prints, different feel)
                  2: "#fcfaf4ff", // Foundation - near white/cream
                  3: "#f7f4e8ff", // Chronicle - very light tan
                  4: "#dfdac9ff", // Legend - light warm tan
                };
                const bgColor = bgColors[def.sortOrder] || "#f5f5f4";

                return (
                  <div
                    key={seriesKey}
                    className="p-3 rounded-lg border border-gray-200"
                    style={{ backgroundColor: bgColor }}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-1.5">
                        {/* Title + Info icon - both open museum-label overlay */}
                        <button
                          onClick={() => setActiveInfo(seriesKey)}
                          className="group flex items-center gap-1.5 transition-colors"
                          title={`About the ${def.label} Series Member`}
                        >
                          <span className="text-base" style={{ color: "#7c6a5bff" }}>{def.icon}</span>
                          <h4 className="font-semibold text-gray-800 text-sm group-hover:text-red-800">{def.label} Series</h4>
                          <Info className="w-3.5 h-3.5 text-stone-400 group-hover:text-red-800" />
                        </button>
                      </div>
                      {/* Editions remaining — only for Chronicle and Legend */}
                      {def.showEdition && (
                        <span className="text-xs text-amber-700 font-semibold">
                          {loading ? "..." : `${def.editionLimit - editionNumber} remaining in series`}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mb-2 whitespace-pre-line leading-relaxed">
                      {cardCopy?.[seriesKey] || pricingConfigFallback.cardCopy?.[seriesKey] || descriptions?.[seriesKey] || def.description}
                    </p>

                    {/* For contact fulfillment: show clickable size buttons that open mailto */}
                    {def.fulfillment === "contact" && (
                      <div className="space-y-1.5">
                        {pricingList && pricingList.length > 0 ? (
                          pricingList.map(({ size, price }) => {
                            // Calculate inventory for this size
                            const printedBySize = editionState?.printedBySize || {};
                            const soldBySize = editionState?.soldBySize || {};
                            const printed = printedBySize[size] || 0;
                            const sold = soldBySize[size] || 0;
                            const inventory = printed - sold;
                            const hasInventory = inventory > 0;
                            
                            return (
                            <a
                              key={size}
                              href={getTierOrderHref(seriesKey, def, editionNumber, size, price)}
                              target={shouldUseBuyLink(seriesKey) ? "_blank" : undefined}
                              rel={shouldUseBuyLink(seriesKey) ? "nofollow noopener noreferrer" : undefined}
                              className="flex items-center justify-between w-full px-3 py-2 text-white rounded text-sm transition-all font-medium"
                              style={{
                                background: "linear-gradient(to bottom, #64748b 0%, #516474ff 100%)",
                                boxShadow: "0 2px 4px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.3)",
                                border: "1px solid #334155",
                                textShadow: "0 1px 1px rgba(0,0,0,0.2)",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "linear-gradient(to bottom, #475569 0%, #334155 100%)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "linear-gradient(to bottom, #64748b 0%, #475469 100%)";
                              }}
                              onClick={() => {
                                trackEvent?.("order_submitted");
                              }}
                            >
                              <span>{size}: ${price.toLocaleString()}</span>
                              <span className="flex items-center gap-2">
                                {hasInventory && (
                                  <span className="text-xs text-green-200/80 font-normal italic">Quick ship</span>
                                )}
                                <span className="text-xs font-semibold uppercase tracking-wide">Order</span>
                              </span>
                            </a>
                          );})
                        ) : (
                          <a
                            href={getTierOrderHref(seriesKey, def, editionNumber)}
                            target={shouldUseBuyLink(seriesKey) ? "_blank" : undefined}
                            rel={shouldUseBuyLink(seriesKey) ? "nofollow noopener noreferrer" : undefined}
                            className="inline-block w-full text-center px-3 py-1.5 text-white rounded text-sm transition-all font-medium"
                            style={{
                              background: "linear-gradient(to bottom, #64748b 0%, #516474ff 100%)",
                              boxShadow: "0 2px 4px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.3)",
                              border: "1px solid #334155",
                              textShadow: "0 1px 1px rgba(0,0,0,0.2)",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "linear-gradient(to bottom, #475569 0%, #334155 100%)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "linear-gradient(to bottom, #64748b 0%, #475469 100%)";
                            }}
                            onClick={() => {
                              trackEvent?.("order_submitted");
                            }}
                          >
                            {def.buttonLabel}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Engrained Series Cross-Link */}
            {engrainedLink && (
              <div className="mt-4 p-3 rounded-lg border-2 border-amber-400 bg-amber-50">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-1.5">
                    {/* Title + Info icon - opens museum-label overlay */}
                    <button
                      onClick={() => setActiveInfo("engrained")}
                      className="group flex items-center gap-1.5 transition-colors"
                      title="About the Engrained Series"
                    >
                      <span className="text-base" style={{ color: "#92400e" }}>◈</span>
                      <span className="font-semibold text-amber-800 text-sm group-hover:text-amber-900">Also Available in Engrained Series</span>
                      <Info className="w-3.5 h-3.5 text-amber-500 group-hover:text-amber-700" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-amber-700 mb-2 leading-relaxed">
                  This image is also available as a stunning wood print on Baltic birch, featuring Wayne's signature UV layering process.
                </p>
                
                {/* Show size and price if available */}
                {(engrainedLink.imageSize || engrainedLink.price) && (
                  <p className="text-sm text-amber-800 mb-3 font-medium">
                    {engrainedLink.imageSize && <span>{engrainedLink.imageSize}</span>}
                    {engrainedLink.imageSize && engrainedLink.price && <span> · </span>}
                    {engrainedLink.price && <span>{engrainedLink.price}</span>}
                  </p>
                )}
                
                {/* Contact button - same style as Chronicle/Legend */}
                <a
                  href={buildEngrainedMailtoLink(image, engrainedLink)}
                  className="inline-flex items-center justify-center gap-2 w-full text-center px-3 py-2 text-white rounded text-sm transition-all font-medium"
                  style={{
                    background: "linear-gradient(to bottom, #92400e 0%, #78350f 100%)",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
                    border: "1px solid #78350f",
                    textShadow: "0 1px 1px rgba(0,0,0,0.3)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "linear-gradient(to bottom, #78350f 0%, #451a03 100%)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "linear-gradient(to bottom, #92400e 0%, #78350f 100%)";
                  }}
                  onClick={() => {
                    trackEvent?.("order_submitted");
                  }}
                >
                  <span>Contact Us to Order</span>
                  {engrainedLink.hasInventory && (
                    <span className="text-xs text-green-200/90 font-normal italic">· Quick ship available</span>
                  )}
                </a>
                
                {/* View in Gallery link */}
                <a
                  href={engrainedLink.url}
                  className="block mt-2 text-center text-xs text-amber-700 hover:text-amber-900 underline"
                  onClick={() => {
                    trackEvent?.("gallery_navigate");
                  }}
                >
                  View in Engrained Gallery →
                </a>
              </div>
            )}

            {/* Production Notes */}
            <div className="mt-4 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center leading-relaxed">
                <span className="font-semibold text-gray-600">* Production Notes *</span>
                <br />
                Standard paper prints include a 1–2 inch archival border. Sizes listed reflect the maximum dimension. Secondary dimension will scale proportionately to preserve the image's actual aspect ratio.
              </p>
            </div>

            {/* Close button - top right */}
            <button
              type="button"
              className="absolute top-3 right-3 inline-flex items-center justify-center w-7 h-7 text-gray-400 rounded-full hover:bg-gray-100 hover:text-gray-600 focus:outline-none transition-colors cursor-pointer"
              aria-label="Close"
              title="Close"
              onClick={onClose}
            >
              <CircleX className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
