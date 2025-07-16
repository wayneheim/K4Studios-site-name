import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Grid, Notebook, ShoppingCart } from "lucide-react";

import ZoomOverlay from "./ZoomOverlay.jsx";
import RebuiltScrollGrid from "./RebuiltScrollGrid";
import MobileMiniDrawer from "./MobileMiniDrawer";
import MiniMobileMenuTrigger from "../components/MiniMobileMenuTrigger";
import "./ScrollFlipZoomStyles.css";
import "../styles/global.css";
import { galleryData } from "../data/galleries/Painterly-Western-Cowboy-Portraits/Color";

export default function ScrollFlipGallery() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState("flip");
  const [isZoomed, setIsZoomed] = useState(false);
  const [showArrowHint, setShowArrowHint] = useState(false);
  const startX = useRef(null);
  const prevIndex = useRef(currentIndex);
  const [matColor, setMatColor] = useState("white");
  const [showMiniMenu, setShowMiniMenu] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("scrollFlipIntroSeen")) {
      setShowArrowHint(true);
      setTimeout(() => {
        setShowArrowHint(false);
        localStorage.setItem("scrollFlipIntroSeen", "true");
      }, 3000);
    }
  }, []);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e) => {
    if (startX.current !== null) {
      const endX = e.changedTouches[0].clientX;
      const deltaX = endX - startX.current;
      if (deltaX > 50) {
        setCurrentIndex((i) => { setIsExpanded(false); return Math.max(i - 1, 0); });
      } else if (deltaX < -50) {
        setCurrentIndex((i) => { setIsExpanded(false); return Math.min(i + 1, galleryData.length - 1); });
      }
      startX.current = null;
    }
  };

  const direction = currentIndex > prevIndex.current ? 1 : -1;
  prevIndex.current = currentIndex;

  return (
    <div
      className="min-h-screen bg-white text-black font-serif px-5 py-8 overflow-hidden"
      style={{ fontFamily: 'Glegoo, serif' }}
    >
      <link href="https://fonts.googleapis.com/css2?family=Glegoo:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet" />

      <div className="relative max-w-6xl mx-auto">
        {isZoomed ? (
          <ZoomOverlay
            imageData={galleryData[currentIndex]}
            matColor={matColor}
            setMatColor={setMatColor}
            onClose={() => setIsZoomed(false)}
          />
        ) : (
          <>
            {/* Flip View */}
            {viewMode === "flip" && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIndex}
                  initial={{ opacity: 0, x: direction > 0 ? 150 : -150 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction > 0 ? -150 : 150 }}
                  transition={{ duration: 0.6, ease: [0.45, 0, 0.55, 1] }}
                  className="grid md:grid-cols-2 gap-6 md:gap-12 items-center"
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                >
                  {/* --- IMAGE + ARROWS COLUMN --- */}
                  <div className="flex flex-col -mt-4 items-center w-full relative">
                    <div className="flex justify-center -mt-4 mb-2 gap-2">
                      <MiniMobileMenuTrigger />
                      <button
                        className="px-2 py-0.0 border border-gray-100 bg-white text-gray-200 text-sm rounded shadow-sm min-w-[36px] transition-colors duration-150 hover:text-gray-400 focus:text-gray-400 hover:border-gray-500 focus:border-gray-500"
                        aria-label="Close"
                        title="Close"
                        onClick={() => window.location.href = "/GalleryShell"}
                      >
                        <span className="font-bold text-lg">⨂</span>
                      </button>
                    </div>

                    {/* --- Floating Mobile Arrows & Image --- */}
                    <div className="w-full relative flex items-center justify-center mb-0">
                      {/* Left Arrow (mobile only) */}
                      <button
                        onClick={() => {
                          setIsExpanded(false);
                          setCurrentIndex((i) => Math.max(i - 1, 0));
                        }}
                        aria-label="Previous Chapter"
                        className="absolute left-0 top-1/2 -translate-y-1/2 z-20 text-gray-300 bg-gray-100 rounded-full shadow px-3 py-1 text-xl md:hidden"
                        style={{ minWidth: 38, display: isMobile ? 'block' : 'none' }}
                        tabIndex={isMobile ? 0 : -1}
                      >
                        &lt;
                      </button>
                      {/* Image container */}
                      <div className="aspect-[4/5] rounded-lg flex items-center justify-center text-gray-500 cursor-pointer overflow-hidden relative z-10 w-full group">
                        <img
                          src={galleryData[currentIndex].src}
                          alt={galleryData[currentIndex].title}
                          className="chapter-image-mobile object-cover w-full h-full border-2 border-gray-400 rounded-lg"
                          style={{ cursor: "zoom-in" }}
                          onClick={() => setIsZoomed(true)}
                        />
                      </div>
                      {/* Right Arrow (mobile only) */}
                      <button
                        onClick={() => {
                          setIsExpanded(false);
                          setCurrentIndex((i) => Math.min(i + 1, galleryData.length - 1));
                        }}
                        aria-label="Next Chapter"
                        className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-gray-100 text-gray-300 rounded-full shadow px-3 py-1 text-xl md:hidden"
                        style={{ minWidth: 38, display: isMobile ? 'block' : 'none' }}
                        tabIndex={isMobile ? 0 : -1}
                      >
                        &gt;
                      </button>
                    </div>
                    {/* --- END Floating Arrows --- */}

                    {/* --- Notes tab button --- */}
                    {galleryData[currentIndex].notes && (
                      <div className="absolute top-14 left-full ml-1 hidden md:block">
                        <button
                          onClick={() => setShowNotes((prev) => !prev)}
                          className="relative w-7 h-8 flex items-center justify-center font-bold text-gray-600 bg-gray-200 border border-gray-300 rounded shadow transition hover:bg-gray-400 hover:text-white"
                          title={showNotes ? "Hide Collector Notes" : "View Collector Insights"}
                        >
                          {showNotes ? (
                            "✕"
                          ) : (
                            <>
                              <span
                                className="absolute left-0 top-1 text-[13px] text-red-600 font-bold leading-none pointer-events-none select-none"
                                style={{ transform: "translateX(-3px)" }}
                              >
                                *
                              </span>
                              <Notebook className="w-5 h-5 stroke-[1.75] opacity-70" />
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Sliding notes panel to the right */}
                    <AnimatePresence>
                      {showNotes && galleryData[currentIndex].notes && !isMobile && (
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -40 }}
                          transition={{ duration: 0.4 }}
                          style={{
                            position: "absolute",
                            left: "100%",
                            top: "4rem",
                            marginTop: "2rem",
                            width: "400px",
                            height: "auto",
                            backgroundColor: "#9fa692",
                            border: "1px solid rgb(126, 127, 129)",
                            borderRadius: "0.5rem",
                            padding: "1.25rem",
                            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                            fontSize: "0.875rem",
                            lineHeight: "1.4",
                            zIndex: 999,
                            overflowWrap: "break-word",
                            whiteSpace: "normal"
                          }}
                        >
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            marginBottom: "0.5rem"
                          }}>
                            <strong
                              style={{
                                color: "#fff",
                                textShadow: "0 1px 2px #444",
                                fontWeight: "bold",
                                marginRight: "0.75em",
                                fontSize: "1em"
                              }}
                            >
                              Collector Notes:
                            </strong>
                            <span
                              style={{
                                flex: 1,
                                marginTop: "4px",
                                height: "2px",
                                marginLeft: "0.5em",
                                borderRadius: "2px",
                                background: "linear-gradient(to right, #fff 65%, rgba(255,255,255,0))",
                                filter: "drop-shadow(0 1px 2px #444)"
                              }}
                            />
                          </div>
                          {galleryData[currentIndex].notes}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Chapter & jump nav + grid (mobile: grid in line) */}
                    <div className="flex flex-col text-gray-500 items-center justify-center -mb-2 mt-1 pt-2 space-y-2 w-full">
                      <div className="flex items-center gap-3">
                        {galleryData[currentIndex].notes && (
                          <button
                            onClick={() => setShowNotes((prev) => !prev)}
                            aria-label="View Collector Notes"
                            title={showNotes ? "Hide Collector Notes" : "View Collector Notes"}
                            className="inline-flex items-center justify-center w-6 h-6 md:hidden relative"
                          >
                            {showNotes ? (
                              <span className="text-lg leading-none">✕</span>
                            ) : (
                              <>
                                <span className="absolute -left-2 top-[2px] text-[12px] text-red-600 font-semibold">*</span>
                                <Notebook className="w-5 h-5  stroke-[1.75]" />
                              </>
                            )}
                          </button>
                        )}
                        <div className="text-sm text-gray-500 font-medium flex items-center gap-2" style={{ letterSpacing: '-0.095em' }}>

                          {/* Chapter text label - text before numbers goes after ' */}
                          {` ${currentIndex + 1} – ${galleryData.length}`}
                          {/* Grid icon (mobile only, in-line) */}
                          <button
                            onClick={() => setViewMode((prev) => (prev === "flip" ? "grid" : "flip"))}
                            aria-label="Toggle View Mode"
                            className="ml-1 bg-gray-100 rounded p-0 shadow hover:bg-gray-200 md:hidden"
                          >
                            <Grid className="w-5 h-5" />
                          </button>
                        </div>
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const input = e.target.elements.chapterNum.value;
                            const num = parseInt(input, 10);
                            if (!isNaN(num) && num >= 1 && num <= galleryData.length) {
                              setIsExpanded(false);
                              setCurrentIndex(num - 1);
                            }
                          }}
                          className="flex items-center gap-2 text-xs"
                        >
                          <input
                            type="number"
                            id="chapterNum"
                            name="chapterNum"
                            min="1"
                            max={galleryData.length}
                            placeholder="Jump: #"
                            className="w-20 border border-gray-300 rounded px-1 py-1 text-center"
                          />
                          <button type="submit" className="bg-gray-100 px-1 py-1 rounded shadow hover:bg-gray-200">
                            Go
                          </button>
                          {/* Always-visible Order Print button for testing */}
                          <a
                            href="https://example.com" // Replace with your SmugMug URL
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Click to order prints"
                            className="inline-flex items-center gap-2 rounded px-2 py-1.5 text-xs font-semibold shadow transition"
                            style={{
                              backgroundColor: '#bbb6b1',
                              color: '#ffffff'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#76807b';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#bbb6b1';
                            }}
                          >
                            <ShoppingCart className="w-4 h-4" />
                          </a>
                        </form>
                      </div>
                      {/* Collector Notes dropdown (mobile only) */}
                      {galleryData[currentIndex].notes && isMobile && (
                        <AnimatePresence>
                          {showNotes && (
                            <motion.div
                              key="collector-notes-mobile"
                              initial={{ opacity: 0, y: -8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -8 }}
                              transition={{ duration: 0.6, ease: [0.33, 1, 0.68, 1] }}
                              className="w-full max-w-lg mx-auto mt-2 mb-[6px] border border-gray-300 rounded shadow p-4 text-sm text-gray-800 text-left"
                              style={{ backgroundColor: "#9fa692", border: "1px solid rgb(109, 111, 114)" }}
                            >
                              <div style={{
                                display: "flex",
                                alignItems: "center",
                                marginBottom: "0.5rem"
                              }}>
                                <strong
                                  style={{
                                    color: "#fff",
                                    textShadow: "0 1px 2px #444",
                                    fontWeight: "bold",
                                    marginRight: "0.75em",
                                    fontSize: "1em"
                                  }}
                                >
                                  Collector Notes:
                                </strong>
                                <span
                                  style={{
                                    flex: 1,
                                    marginTop: "4px",
                                    height: "2px",
                                    marginLeft: "0.5em",
                                    borderRadius: "2px",
                                    background: "linear-gradient(to right, #fff 65%, rgba(255,255,255,0))",
                                    filter: "drop-shadow(0 1px 2px #444)"
                                  }}
                                />
                              </div>
                              <p>{galleryData[currentIndex].notes}</p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      )}
                    </div>
                    {/* --- END chapter/nav row --- */}
                  </div>

                  {/* --- DESCRIPTION + DESKTOP NAV COLUMN (unchanged) --- */}
                  <div className="w-full md:pl-8">
                    <div className="hidden md:flex justify-center my-2">
                      <div className="flex items-center justify-center gap-3 my-4 text-[#7a6a58]">
                        <div className="h-px w-20 bg-[#7a6a58]" />
                        <div className="w-3 h-3 rotate-45 bg-[#7a6a58]" />
                        <div className="h-px w-20 bg-[#7a6a58]" />
                      </div>
                    </div>

                    {/* Logo Watermark Above Chapter Title */}
                    <div className="mb-4 flex justify-center relative z-0 hidden md:flex">
                      <img
                        src="/images/K4Logo-web-b.jpg" // adjust path if needed
                        alt="K4 Studios Logo"
                        className="h-16.5 mb-5"
                        style={{
                          borderRadius: "50px",
                          maxWidth: "160px",
                          opacity: ".55",
                        }}
                      />
                    </div>
                    <div
                      className="text-center font-semibold mb-1 tracking-wide text-[#85644b]"
                      style={{ fontSize: "1.55rem" }}
                    >
                      Chapter: {currentIndex + 1}
                    </div>
                    <h2 className="text-xl md:text-3xl mb-2 text-center">"{galleryData[currentIndex].title}"</h2>
                    <p className="italic text-base md:text-lg mb-4  text-left">{galleryData[currentIndex].story}</p>


                    {/* Description + Notes */}
                    {(() => {
                      const descPanelId = `desc-panel-${galleryData[currentIndex]?.id || currentIndex}`;
                      return (
                        <div className="text-sm text-gray-600 mb-6 text-center group">
                          <button
                            onClick={() => setIsExpanded((prev) => !prev)}
                            className="inline-flex items-center gap-1 no-underline hover:no-underline focus:no-underline"
                            aria-expanded={isExpanded}
                            aria-controls={descPanelId}
                            aria-label="Toggle more information about this image"
                            id={`desc-toggle-${galleryData[currentIndex]?.id || currentIndex}`}
                          >
                            <span className={`inline-block transform transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}>
                              ▶
                            </span>
                            More about this image
                          </button>
                          <div
                            id={descPanelId}
                            role="region"
                            aria-labelledby={`desc-toggle-${galleryData[currentIndex]?.id || currentIndex}`}
                            aria-label="More information about this image"
                            hidden={!isExpanded}
                            className="relative min-h-[6rem] mt-4 mx-auto text-left w-10/12 max-w-lg px-4"
                          >
                            <AnimatePresence initial={false}>
                              {isExpanded && (
                                <motion.div
                                  key={`desc-${currentIndex}`}
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  transition={{ duration: 0.5, ease: [0.33, 1, 0.68, 1] }}
                                  style={{
                                    background: "#f9f6f1",
                                    border: "1.5px solid #e1d6c1",
                                    borderRadius: 16,
                                    boxShadow: "0 4px 24px rgba(130,110,60,0.08)",
                                    padding: ".75rem .95rem",
                                    color: "#564427",
                                    minHeight: "4rem",
                                    zIndex: 10,
                                  }}
                                >
                                  <p className="pb-2">{galleryData[currentIndex].description}</p>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="flex justify-center my-4">
                      <div className="flex items-center justify-center gap-3 my-6 text-[#7a6a58]">
                        <div className="h-px w-20 bg-[#7a6a58]" />
                        <div className="w-3 h-3 rotate-45 bg-[#7a6a58]" />
                        <div className="h-px w-20 bg-[#7a6a58]" />
                      </div>
                    </div>
                    <div className="hidden md:flex justify-center items-center gap-4 pt-4">
                      <button onClick={() => setCurrentIndex((i) => Math.max(i - 1, 0))} className="bg-gray-100 px-3 py-1 rounded shadow hover:bg-gray-200">&lt;</button>
                      <button onClick={() => setViewMode("grid")} className="bg-gray-100 p-2 rounded shadow hover:bg-gray-200"><Grid /></button>
                      <button onClick={() => setCurrentIndex((i) => Math.min(i + 1, galleryData.length - 1))} className={`bg-gray-100 px-3 py-1 rounded shadow hover:bg-gray-200 ${showArrowHint ? "animate-pulse text-yellow-500" : "text-black"}`}>&gt;</button>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}

            {/* Mini Menu Drawer */}
            {showMiniMenu && (
              <div className="fixed top-0 right-0 h-full z-[9999] bg-white overflow-y-auto shadow-xl transition-all duration-300 w-[90vw] md:w-[50vw] lg:w-[25vw]">
                <MobileMiniDrawer onClose={() => setShowMiniMenu(false)} />
              </div>
            )}

            {/* Grid View */}
            {viewMode === "grid" && (
              <RebuiltScrollGrid
                galleryData={galleryData}
                onCardClick={(i) => {
                  setCurrentIndex(i);
                  setIsExpanded(false);
                  setViewMode("flip");
                  window.scrollTo(0, 0);
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
