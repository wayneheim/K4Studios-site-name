// SeriesInfoPopup.jsx — Scrollable popup showing all series descriptions with anchor navigation
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CircleX } from "lucide-react";
import { SERIES_DEFINITIONS, SERIES_ICONS } from "../data/seriesDefinitions.js";

// Import config at build time for infoCopy
import pricingConfigFallback from "../data/pricingConfig.json";

// Series order for display (excludes engrained which has its own flow)
const DISPLAY_SERIES = ["sketch", "foundation", "chronicle", "legend"];

export default function SeriesInfoPopup({ isOpen, onClose, scrollToSeries = null, activeSeries = [], infoCopy = null }) {
  const contentRef = useRef(null);

  // Get info copy from props or fallback
  const getInfoCopy = () => infoCopy || pricingConfigFallback.infoCopy || {};

  // Scroll to anchor when opening or scrollToSeries changes
  useEffect(() => {
    if (isOpen && scrollToSeries && contentRef.current) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        const anchor = contentRef.current.querySelector(`#series-${scrollToSeries}`);
        if (anchor) {
          anchor.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  }, [isOpen, scrollToSeries]);

  // Handle scrolling to a series section
  const scrollToSection = (seriesKey) => {
    const anchor = contentRef.current?.querySelector(`#series-${seriesKey}`);
    if (anchor) {
      anchor.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (!isOpen) return null;

  const copy = getInfoCopy();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10002] flex items-center justify-center md:justify-end md:pr-[27px] p-4 pointer-events-none"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-stone-50 rounded-lg w-full max-w-lg md:max-w-[517px] flex flex-col overflow-hidden border-[3px] border-stone-300 pointer-events-auto"
            style={{ 
              boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
              maxHeight: "min(45vh, calc(100vh - 120px))"
            }}
          >
            {/* Sticky Header - Dark bar with reversed icons */}
            <div className="sticky top-0 z-10 bg-stone-500 px-3 py-1 flex items-center justify-between">
              {/* Icon Navigation - white icons on dark bar with | separators */}
              <div className="flex items-center">
                {DISPLAY_SERIES.map((seriesKey, index) => {
                  const def = SERIES_DEFINITIONS[seriesKey];
                  const isActive = activeSeries.includes(seriesKey);
                  return (
                    <div key={seriesKey} className="flex items-center">
                      <button
                        onClick={() => scrollToSection(seriesKey)}
                        title={isActive ? `${def.label} Series Member` : `${def.label} Series Info`}
                        className="w-9 h-9 flex items-center justify-center hover:text-amber-300 transition-colors text-lg"
                        style={{ color: isActive ? "#7dd3fc" : "white" }}
                      >
                        {def.icon || SERIES_ICONS[seriesKey]}
                      </button>
                      {index < DISPLAY_SERIES.length - 1 && (
                        <span className="text-stone-400 text-sm mx-1">|</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Title and Close Button */}
              <div className="flex items-center gap-3">
                <span className="text-stone-200 text-sm font-medium opacity-50">K4 Series Guide</span>
                <button
                  onClick={onClose}
                  title="Close"
                  className="w-7 h-7 flex items-center justify-center text-stone-300 hover:text-white transition-colors"
                >
                  <CircleX className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div 
              ref={contentRef} 
              className="flex-1 overflow-y-auto px-5 py-4 space-y-8"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#d6d3d1 transparent'  // stone-300 thumb on transparent track
              }}
            >
              {DISPLAY_SERIES.map((seriesKey) => {
                const def = SERIES_DEFINITIONS[seriesKey];
                const info = copy[seriesKey];

                return (
                  <section
                    key={seriesKey}
                    id={`series-${seriesKey}`}
                    className="scroll-mt-4"
                  >
                    {/* Series Title with Icon */}
                    <h3 className="flex items-center gap-2 text-red-800 font-semibold text-base mb-3">
                      <span className="text-lg">{def.icon || SERIES_ICONS[seriesKey]}</span>
                      <span>{info?.title || `${def.label} Series`}</span>
                    </h3>

                    {/* Series Description */}
                    <div className="text-sm text-stone-600 leading-relaxed whitespace-pre-line">
                      {info?.body || def.description}
                    </div>

                    {/* Divider (except last) */}
                    {seriesKey !== DISPLAY_SERIES[DISPLAY_SERIES.length - 1] && (
                      <div className="mt-6 border-b border-stone-200" />
                    )}
                  </section>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
