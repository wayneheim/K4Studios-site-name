import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Grid, Notebook, ShoppingCart } from "lucide-react";

import ZoomOverlay from "./ZoomOverlay.jsx";
import RebuiltScrollGrid from "./RebuiltScrollGrid";
import MobileMiniDrawer from "./MobileMiniDrawer";
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

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("scrollFlipIntroSeen")) {
      setShowArrowHint(true);
      setTimeout(() => {
        setShowArrowHint(false);
        localStorage.setItem("scrollFlipIntroSeen", "true");
      }, 3000);
    }
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
                    {/* --- Floating Mobile Arrows & Image --- */}
                    <div className="w-full relative flex items-center justify-center mb-0">
                      {/* Left Arrow (mobile only) */}
                      <button
                        onClick={() => {
                          setIsExpanded(false);
                          setCurrentIndex((i) => Math.max(i - 1, 0));
                        }}
                        aria-label="Previous Chapter"
                        className="absolute left-6 top-1/2 -translate-y-1/2 z-20 text-gray-300 bg-gray-100 rounded-full shadow px-3 py-1 text-xl md:hidden"
                        style={{ minWidth: 38, display: isMobile ? 'block' : 'none' }}
                        tabIndex={isMobile ? 0 : -1}
                      >
                        &lt;
                      </button>

                      <div className="relative w-full md:w-[340px] flex flex-row">
  {/* Image */}
  <div className="aspect-[4/5] rounded-lg flex items-center justify-center text-gray-500 cursor-pointer overflow-hidden z-10 w-full group">
    <img
      src={galleryData[currentIndex].src}
      alt={galleryData[currentIndex].title}
      className="chapter-image-mobile object-cover w-full h-full border-2 border-gray-400 rounded-lg"
      style={{ cursor: "zoom-in" }}
      onClick={() => setIsZoomed(true)}
    />
  </div>

  {/* Collector Notes Button & Panel (desktop only, right of image, top-aligned) */}
  {!isMobile && galleryData[currentIndex].notes && (
    <div className="hidden md:flex flex-col items-start relative" style={{ minWidth: 56 }}>
      {/* Button, top aligned */}
      <button
        onClick={() => setShowNotes((prev) => !prev)}
        aria-label="View Collector Notes"
        title={showNotes ? "Hide Collector Notes" : "View Collector Notes"}
        className="ml-1 mt-1 w-7 h-9 border border-gray-300 bg-white text-gray-400 rounded-md shadow hover:bg-gray-200 transition relative z-30"
        style={{
          boxShadow: '0 2px 6px rgba(80,60,30,0.10)',
        }}
      >
        {showNotes ? (
          <span className="text-lg leading-none">✕</span>
        ) : (
          <>
            <span className="absolute left-2 top-[2px] text-[12px] text-red-600 font-semibold">*</span>
            <Notebook className="w-6 h-6 stroke-[1.75]" />
          </>
        )}
      </button>

      {/* Panel (flies out right, top-aligned with button/image) */}
      <AnimatePresence>
        {showNotes && (
          <motion.div
            key="collector-notes-desktop"
            initial={{ opacity: 0, x: -32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -32 }}
            transition={{ duration: 0.38, ease: [0.33, 1, 0.68, 1] }}
            className="absolute -left-3 top-11 z-50 w-80 border border-gray-300 rounded shadow-lg p-5 text-sm text-gray-800"
            style={{
              backgroundColor: "#9fa692",
              border: "1px solid rgb(109, 111, 114)",
              minWidth: "260px",
              maxWidth: "90vw",
              marginLeft: "16px"
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
            <p>{galleryData[currentIndex].notes}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )}
</div>

                      {/* Right Arrow (mobile only) */}
                      <button
                        onClick={() => {
                          setIsExpanded(false);
                          setCurrentIndex((i) => Math.min(i + 1, galleryData.length - 1));
                        }}
                        aria-label="Next Chapter"
                        className="absolute right-6 top-1/2 -translate-y-1/2 z-20 bg-gray-100 text-gray-300 rounded-full shadow px-3 py-1 text-xl md:hidden"
                        style={{ minWidth: 38, display: isMobile ? 'block' : 'none' }}
                        tabIndex={isMobile ? 0 : -1}
                      >
                        &gt;
                      </button>
                    </div>

                    {/* --- Unified Nav Row: ☰ | notes | 1–N | grid | jump | go | cart | ⨂ --- */}
                   <div
  className="flex items-center justify-center gap-4 mt-3 mb-1 max-w-[344px] mx-auto"
  style={
    !isMobile && galleryData[currentIndex].notes
      ? { marginLeft: "82px" }
      : {}
  }
>
  {/* MENU (☰) */}
  <button
    className="px-1 py-.5 border border-gray-200 hover:bg-gray-200 bg-white text-gray-400 text-lg rounded shadow-sm transition-colors duration-150 hover:text-gray-900 focus:text-gray-900 hover:border-gray-500 focus:border-gray-500"
    aria-label="Show Menu"
    title="Show Menu"
    style={{ minWidth: 32, minHeight: 32, fontWeight: 400 }}
    onClick={() => setShowMiniMenu(true)}
  >
    ☰
  </button>
  {/* Notes (only if present, only mobile) */}
  {galleryData[currentIndex].notes && isMobile && (
    <button
      onClick={() => setShowNotes((prev) => !prev)}
      aria-label="View Collector Notes"
      title={showNotes ? "Hide Collector Notes" : "View Collector Notes"}
      className="inline-flex items-center text-gray-400 hover:bg-gray-200 justify-center w-7 h-7 relative border border-gray-200 bg-white rounded shadow"
    >
      {showNotes ? (
        <span className="text-lg leading-none">✕</span>
      ) : (
        <>
          <span className="absolute left-2 top-[2px] text-[12px] text-red-600 font-semibold">*</span>
          <Notebook className="w-5 h-5 stroke-[1.75]" />
        </>
      )}
    </button>
  )}
  {/* Chapter/total */}
  <div className="text-sm text-gray-500 font-medium flex items-center whitespace-nowrap" style={{ letterSpacing: '-0.075em' }}>
    {`${currentIndex + 1} – ${galleryData.length}`}
  </div>
  {/* Grid icon (MOBILE ONLY, show here) */}
  {isMobile && (
    <button
      onClick={() => setViewMode((prev) => (prev === "flip" ? "grid" : "flip"))}
      aria-label="View Grid Mode"
      title="View Grid Mode"
      className="bg-gray-100 rounded p-1 shadow hover:bg-gray-200 flex items-center justify-center"
      style={{ minWidth: 32, minHeight: 32 }}
    >
      <Grid className="w-5 h-5" style={{ stroke: "#84766d" }} />
    </button>
  )}
  {/* Jump to form */}
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
    style={{ minWidth: 100 }}
  >
    <input
      type="number"
      id="chapterNum"
      name="chapterNum"
      min="1"
      max={galleryData.length}
      placeholder="Jump #"
      className="w-20 border border-gray-300 rounded px-1 py-1 text-center"
      style={{ fontSize: "0.95em" }}
    />
    <button type="submit" className="bg-gray-100 px-2 py-1 rounded shadow hover:bg-gray-200">
      Go
    </button>
  </form>
  {/* Cart */}
  <a
    href={galleryData[currentIndex].buyLink || "#"}
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
  {/* CLOSE (⨂) */}
  <button
    className="px-2 py-.5 border border-gray-200 hover:bg-gray-200 bg-white text-gray-400 text-lg rounded shadow-sm transition-colors duration-150 hover:text-gray-900 focus:text-gray-900 hover:border-gray-500 focus:border-gray-500"
    aria-label="Close"
    title="Close"
    style={{ minWidth: 32, minHeight: 32, fontWeight: 400 }}
    onClick={() => window.location.href = "/GalleryShell"}
  >
    ⨂
  </button>
</div>

                    {/* Collector Notes Panel (mobile only, static below bar) */}
                    {galleryData[currentIndex].notes && isMobile && (
                      <AnimatePresence>
                        {showNotes && (
                          <motion.div
                            key="collector-notes-mobile"
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.6, ease: [0.33, 1, 0.68, 1] }}
                            className="w-full mx-auto mt-2 mb-[6px] border border-gray-300 rounded shadow p-4 text-sm text-gray-800 text-left"
                            style={{
                              backgroundColor: "#9fa692",
                              border: "1px solid rgb(109, 111, 114)",
                              maxWidth: "98vw",
                              boxSizing: "border-box",
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
                            <p>{galleryData[currentIndex].notes}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    )}
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
                        src="/images/K4Logo-web-b.jpg"
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
                    <p className="italic text-base md:text-lg mb-4 leading-snug text-left">{galleryData[currentIndex].story}</p>
                    {/* More about this image (info dropdown/panel, same logic as before) */}
                    {(() => {
                      const descPanelId = `desc-panel-${galleryData[currentIndex]?.id || currentIndex}`;
                      return (
                        <div className="text-sm text-gray-600 mb-6 text-center group" style={{ position: 'relative' }}>
                          <button
                            onClick={() => setIsExpanded((prev) => !prev)}
                            className="inline-flex items-center gap-1 no-underline hover:no-underline focus:no-underline"
                            aria-expanded={isExpanded}
                            aria-controls={descPanelId}
                            aria-label="Toggle more information about this image"
                            id={`desc-toggle-${galleryData[currentIndex]?.id || currentIndex}`}
                            style={{ zIndex: 50, position: 'relative' }}
                          >
                            <span className={`inline-block transform transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}>
                              ▼
                            </span>
                            More about this image
                          </button>
                          <AnimatePresence>
                            {isExpanded && (
                              isMobile ? (
                                <motion.div
                                  key={`desc-${currentIndex}-mobile`}
                                  initial={{ opacity: 0, y: 12 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 12 }}
                                  transition={{ duration: 0.45, ease: [0.33, 1, 0.68, 1] }}
                                  className="relative mt-4 mx-auto w-11/12 max-w-lg px-4"
                                  style={{
                                    background: "#f9f6f1",
                                    border: "1.5px solid #e1d6c1",
                                    borderRadius: 16,
                                    boxShadow: "0 8px 48px rgba(130,110,60,0.10)",
                                    padding: ".95rem 1.5rem",
                                    color: "#564427",
                                    minHeight: "4rem",
                                    maxHeight: "290px",
                                    overflowY: "auto",
                                    width: "100%",
                                  }}
                                  id={descPanelId}
                                  role="region"
                                  aria-labelledby={`desc-toggle-${galleryData[currentIndex]?.id || currentIndex}`}
                                  aria-label="More information about this image"
                                >
                                  <p className="pb-2">{galleryData[currentIndex].description}</p>
                                </motion.div>
                              ) : (
                                <motion.div
                                  key={`desc-${currentIndex}-desktop`}
                                  initial={{ opacity: 0, y: 12 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 12 }}
                                  transition={{ duration: 0.45, ease: [0.33, 1, 0.68, 1] }}
                                  className="absolute left-2/2 top-12 z-50"
                                  style={{
                                    transform: 'translateX(-50%)',
                                    background: "#f9f6f1",
                                    border: "1.5px solid #e1d6c1",
                                    borderRadius: 16,
                                    boxShadow: "0 8px 48px rgba(130,110,60,0.18)",
                                    padding: ".45rem 1.05rem",
                                    color: "#564427",
                                    minWidth: "340px",
                                    maxWidth: "75vw",
                                    minHeight: "4rem",
                                    maxHeight: "260px",
                                    overflowY: "auto",
                                  }}
                                  id={descPanelId}
                                  role="region"
                                  aria-labelledby={`desc-toggle-${galleryData[currentIndex]?.id || currentIndex}`}
                                  aria-label="More information about this image"
                                >
                                  <p className="pb-2">{galleryData[currentIndex].description}</p>
                                </motion.div>
                              )
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })()}
                    <div className="flex justify-center my-3">
                      <div className="flex items-center justify-center gap-3 my-6 text-[#7a6a58]">
                        <div className="h-px w-20 bg-[#7a6a58]" />
                        <div className="w-3 h-3 rotate-45 bg-[#7a6a58]" />
                        <div className="h-px w-20 bg-[#7a6a58]" />
                      </div>
                    </div>
                    <div className="hidden md:flex justify-center items-center gap-4 pt-4">
                      <button onClick={() => setCurrentIndex((i) => Math.max(i - 1, 0))} className=" bg-gray-100 px-3 py-1 -mt-16 rounded shadow hover:bg-gray-200">&lt;</button>
                      <button
                        onClick={() => setViewMode("grid")}
                        className="bg-gray-100 p-2 -mt-16 rounded shadow hover:bg-gray-200"
                      >
                        <Grid className="w-5 h-5" color="#84766d" />
                      </button>
                      <button onClick={() => setCurrentIndex((i) => Math.min(i + 1, galleryData.length - 1))} className={`bg-gray-100 px-3 py-1 -mt-16 rounded shadow hover:bg-gray-200 ${showArrowHint ? "animate-pulse text-yellow-500" : "text-black"}`}>&gt;</button>
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
