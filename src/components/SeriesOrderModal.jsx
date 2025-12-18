// SeriesOrderModal.jsx — Unified ordering modal for all series (except Engrained)
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CircleX, Info } from "lucide-react";
import { SERIES_DEFINITIONS, getEffectiveSeries, getSeriesPricingList, fetchPricingConfig } from "../data/seriesDefinitions.js";

// Default card copy — promise (short, evocative) - used if config not loaded
const DEFAULT_CARD_COPY = {
  sketch: "Open edition study prints — intimate, immediate, and tactile.\nA quiet entry point into the work.",
  foundation: "Open edition archival prints — refined, balanced, and collectible.\nWhere images begin to take their full form.",
  chronicle: "Signed, limited archival prints — historically recorded and tightly controlled.",
  legend: "Ultra-limited, signed statement works — the highest expression of the image.",
};

// Default hover/info copy — reassurance (deeper prose) - used if config not loaded
const DEFAULT_INFO_COPY = {
  sketch: {
    title: "The Sketch Series",
    body: "These small-format prints are the foundation of the work — intimate studies meant to be held, revisited, and lived with.\n\nPrinted in a single size to preserve immediacy and accessibility, they offer a personal way to engage with the image without ceremony or commitment.\n\nMany collectors begin here.",
  },
  foundation: {
    title: "The Foundation Series",
    body: "This series represents the first formal presentation of an image as a finished work.\n\nOffered in collector-friendly sizes and printed on archival papers, Foundation pieces retain accessibility while introducing scale, presence, and refinement.\n\nThis series remains open until an image advances into higher collector tiers.",
  },
  chronicle: {
    title: "The Chronicle Series",
    body: "Each Chronicle image is released as a signed, limited edition and formally recorded as part of the artist's historical archive.\n\nWhile the image may exist in earlier open editions, the Chronicle Series marks the point at which scarcity, provenance, and long-term collectability are introduced.\n\nOnce editions are issued, they remain permanently in circulation.",
  },
  legend: {
    title: "The Legend Series",
    body: "Legend works represent the final and most complete expression of an image.\n\nProduced in large scale and released in extremely limited quantities, each piece is individually signed and intended as a long-term anchor work for serious collectors and institutions.\n\nCustom sizes and special placements may be considered by request.",
  },
};

// Info overlay component (museum label style) - fixed position to float above modal
function SeriesInfoOverlay({ seriesKey, infoCopy, onClose }) {
  const info = infoCopy?.[seriesKey] || DEFAULT_INFO_COPY[seriesKey];
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
        onClick={(e) => e.stopPropagation()}
      >
        <h4 className="font-semibold text-red-800 text-base mb-3">{info.title}</h4>
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

// Fetch edition state for an image from the server
async function fetchEditionState(imageId) {
  try {
    const cacheBuster = Date.now();
    const res = await fetch(`/.netlify/functions/editionState?imageId=${imageId}&_t=${cacheBuster}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      return data.states || {};
    }
  } catch (err) {
    console.error("[SeriesOrderModal] Error fetching edition state:", err);
  }
  return {};
}

// Build mailto link with pre-filled info
function buildMailtoLink(image, seriesKey, seriesDef, editionNumber) {
  const subject = encodeURIComponent(`Order Inquiry: ${image.title || "Image"} — ${seriesDef.label} Series`);
  
  let body = `Hello,\n\nI am interested in ordering:\n\n`;
  body += `Image: ${image.title || "N/A"}\n`;
  body += `Image ID: ${image.id || "N/A"}\n`;
  body += `Series: ${seriesDef.label}\n`;
  
  if (seriesDef.showEdition && editionNumber) {
    body += `Edition: ${editionNumber} of ${seriesDef.editionLimit}\n`;
  }
  
  body += `\nPlease provide ordering information.\n\n`;
  body += `---\n`;
  body += `Your Name:\n`;
  body += `Preferred Contact (email or phone):\n`;
  body += `---\n\n`;
  body += `Thank you!`;
  
  return `mailto:info@k4studios.com?subject=${subject}&body=${encodeURIComponent(body)}`;
}

export default function SeriesOrderModal({ isOpen, onClose, image, logUIEvent }) {
  const [editionStates, setEditionStates] = useState({});
  const [pricingData, setPricingData] = useState(null);
  const [descriptions, setDescriptions] = useState(null);
  const [cardCopy, setCardCopy] = useState(null);
  const [infoCopy, setInfoCopy] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeInfo, setActiveInfo] = useState(null); // Which series info overlay is open

  // Fetch edition state and pricing when modal opens
  useEffect(() => {
    if (isOpen && image?.id) {
      setLoading(true);
      setActiveInfo(null); // Reset info overlay when modal opens
      Promise.all([
        fetchEditionState(image.id),
        fetchPricingConfig(),
      ]).then(([states, config]) => {
        setEditionStates(states);
        setPricingData(config.pricing);
        setDescriptions(config.descriptions);
        setCardCopy(config.cardCopy);
        setInfoCopy(config.infoCopy);
        setLoading(false);
      });
    }
  }, [isOpen, image?.id]);

  if (!isOpen || !image) return null;

  const effectiveSeries = getEffectiveSeries(image);

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
            <div className="mb-2 text-center">
              <h2 className="text-lg font-bold text-gray-800">Order Options</h2>
            </div>

            {/* Image Preview */}
            <div className="text-center mb-3">
              <img
                src={image.src}
                alt={image.title}
                className="w-full max-w-32 mx-auto rounded-lg shadow-md"
              />
              <h3 className="text-sm font-semibold text-gray-800 mt-2">{image.title}</h3>
              <p className="text-xs text-gray-500 italic mt-1">
                This image is available in the following collector formats:
              </p>
            </div>

            {/* Series Options */}
            <div className="space-y-2">
              {displaySeries.length === 0 && (
                <p className="text-gray-500 text-center">No series available for this image.</p>
              )}

              {displaySeries.map((seriesKey) => {
                const def = SERIES_DEFINITIONS[seriesKey];
                if (!def) return null;

                const editionState = editionStates[seriesKey];
                const editionNumber = editionState?.sold ?? 0;
                const pricingList = getSeriesPricingList(seriesKey, pricingData);

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
                          title={`About the ${def.label} Series`}
                        >
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
                      {cardCopy?.[seriesKey] || DEFAULT_CARD_COPY[seriesKey] || descriptions?.[seriesKey] || def.description}
                    </p>

                    {/* Pricing list (stacked format) */}
                    <div className="text-sm mb-2 ml-1">
                      {pricingList ? (
                        <ul className="space-y-1">
                          {pricingList.map(({ size, price }) => (
                            <li key={size} className="flex items-center gap-1.5">
                              <span className="text-gray-400">•</span>
                              <span className="text-gray-700">{size}: ${price.toLocaleString()}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="italic text-gray-600">Pricing: Call</p>
                      )}
                    </div>

                    {/* Order Button */}
                    {def.fulfillment === "smugmug" ? (
                      <a
                        href={image.buyLink || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block w-full text-center px-3 py-1.5 text-white rounded text-sm transition-all font-medium"
                        style={{
                          background: "linear-gradient(to bottom, #f59e0b 0%, #d97706 100%)",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.3)",
                          border: "1px solid #b45309",
                          textShadow: "0 1px 1px rgba(0,0,0,0.2)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "linear-gradient(to bottom, #d97706 0%, #b45309 100%)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "linear-gradient(to bottom, #f59e0b 0%, #d97706 100%)";
                        }}
                        onClick={() => {
                          logUIEvent?.("series_order_click", {
                            page: window.location.pathname,
                            imageId: image.id,
                            series: seriesKey,
                            fulfillment: "smugmug",
                          });
                        }}
                      >
                        {def.buttonLabel}
                      </a>
                    ) : (
                      <a
                        href={buildMailtoLink(image, seriesKey, def, editionNumber)}
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
                          e.currentTarget.style.background = "linear-gradient(to bottom, #64748b 0%, #475569 100%)";
                        }}
                        onClick={() => {
                          logUIEvent?.("series_order_click", {
                            page: window.location.pathname,
                            imageId: image.id,
                            series: seriesKey,
                            fulfillment: "contact",
                          });
                        }}
                      >
                        {def.buttonLabel}
                      </a>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Close button */}
            <button
              type="button"
              className="absolute bottom-4 left-4 inline-flex items-center justify-center w-8 h-8 border border-gray-300 bg-white text-gray-400 rounded-full shadow-sm hover:bg-gray-100 hover:text-gray-600 focus:outline-none transition-colors cursor-pointer"
              aria-label="Close"
              title="Close"
              onClick={onClose}
            >
              <CircleX className="w-6 h-6" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
