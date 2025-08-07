import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Grid, Notebook, ShoppingCart, ChevronRight, ChevronLeft } from "lucide-react";
import ZoomOverlay from "./ZoomOverlay.jsx";
import RebuiltScrollGrid from "./RebuiltScrollGrid";
import MobileMiniDrawer from "./MobileMiniDrawer";
import "./ScrollFlipZoomStyles.css";
import "../styles/global.css";
import { galleryData as rawData } from "../data/Galleries/Painterly-Fine-Art-Photography/Transportation/Cars.mjs";
import SwipeHint from "./SwipeHint";
import LikeButton from "@/components/LikeButton.jsx";

const galleryData = rawData.filter(entry => entry.id !== "i-k4studios");

export default function ScrollFlipGallery({ initialImageId }) {
  const [hasEnteredChapters, setHasEnteredChapters] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [viewMode, setViewMode] = useState("flip");
  const [isZoomed, setIsZoomed] = useState(false);
  const [showArrowHint, setShowArrowHint] = useState(false);
  const [matColor, setMatColor] = useState("white");
  const [showMiniMenu, setShowMiniMenu] = useState(false);
  const [showArrows, setShowArrows] = useState(true);
  const [isLandscapeMobile, setIsLandscapeMobile] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const startX = useRef(null);
  const prevIndex = useRef(currentIndex);

  // 🔄 Trigger chapter entry mode via custom event
  useEffect(() => {
    const handleEnterChapters = () => setHasEnteredChapters(true);
    window.addEventListener("enterChapters", handleEnterChapters);
    return () => window.removeEventListener("enterChapters", handleEnterChapters);
  }, []);

  // 🔍 Initial load: parse URL or use fallback — safe for static builds
  useEffect(() => {
    if (!galleryData || galleryData.length === 0) return;

    const match = window.location.pathname.match(/\/(i-[a-zA-Z0-9_-]+)$/);
    const idFromURL = match ? match[1] : initialImageId;

    if (idFromURL) {
      const index = galleryData.findIndex((entry) => entry.id === idFromURL);
      if (index !== -1) {
        setCurrentIndex(index);
      }
    }
  }, [initialImageId]);

  // 🟢 Auto-enter chapters if directly loading an image page
  useEffect(() => {
    if (window.location.pathname.match(/\/(i-[a-zA-Z0-9_-]+)/)) {
      setHasEnteredChapters(true);
    }
  }, []);

  // 🔗 Update URL when navigating *after* entering chapters
  useEffect(() => {
    const imageId = galleryData[currentIndex]?.id;
    const alreadyOnImage = window.location.pathname.match(/\/i-[a-zA-Z0-9_-]+$/);
    if (!imageId || (!hasEnteredChapters && !alreadyOnImage)) return;

    const basePath = "/Galleries/Painterly-Fine-Art-Photography/Transportation/Cars";
    const newUrl = `${basePath}/${imageId}`;
    const currentUrl = window.location.pathname;

    if (currentUrl !== newUrl) {
      window.history.pushState(null, "", newUrl);
    }
  }, [currentIndex, hasEnteredChapters]);

  // 🧼 Clean up stray ID in URL if landing intro is showing
  useEffect(() => {
    const introEl = document.getElementById("intro-section");
    const isIntroVisible = introEl && !introEl.classList.contains("section-hidden");
    const isViewingImageZero = currentIndex === 0;

    if (isIntroVisible && isViewingImageZero && window.location.pathname.includes("/i-")) {
      const cleanUrl = "/Galleries/Painterly-Fine-Art-Photography/Transportation/Cars";
      window.history.replaceState(null, "", cleanUrl);
    }
  }, [currentIndex]);

  // ⬅️⬆️ Browser back/forward handler
  useEffect(() => {
    const handlePopState = () => {
      const match = window.location.pathname.match(/\/(i-[a-zA-Z0-9_-]+)/);
      const id = match ? match[1] : null;

      const header = document.getElementById("header-section");
      const intro = document.getElementById("intro-section");
      const chapter = document.getElementById("chapter-section");

      if (id) {
        const index = galleryData.findIndex((entry) => entry.id === id);
        if (index !== -1) {
          setCurrentIndex(index);
          if (header) header.classList.add("section-hidden");
          if (intro) intro.classList.add("section-hidden");
          if (chapter) {
            chapter.style.display = "block";
            chapter.classList.remove("section-hidden");
            chapter.classList.add("section-visible");
          }
          return;
        }
      }

      // No image ID = return to intro
      if (chapter) {
        chapter.style.display = "none";
        chapter.classList.add("section-hidden");
        chapter.classList.remove("section-visible");
      }
      if (header) {
        header.classList.remove("section-hidden", "slide-fade-out");
      }
      if (intro) {
        intro.classList.remove("section-hidden", "slide-fade-out");
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Add react-mounted class
  useEffect(() => {
    document.body.classList.add("react-mounted");
  }, []);

  // Arrow key navigation
  useEffect(() => {
    const onKeyDown = (e) => {
      if (
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        e.shiftKey ||
        /(INPUT|TEXTAREA|SELECT)/.test(e.target.tagName)
      ) {
        return;
      }

      if (viewMode !== "flip" || isZoomed) return;

      if (e.key === "ArrowRight") {
        setIsExpanded(false);
        setCurrentIndex((i) => Math.min(i + 1, galleryData.length - 1));
      } else if (e.key === "ArrowLeft") {
        setIsExpanded(false);
        setCurrentIndex((i) => Math.max(i - 1, 0));
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [viewMode, isZoomed]);

  // Orientation detection
  useEffect(() => {
    const updateOrientation = () => {
      setIsLandscapeMobile(window.innerWidth < 900 && window.innerWidth > window.innerHeight);
    };
    updateOrientation();
    window.addEventListener("resize", updateOrientation);
    window.addEventListener("orientationchange", updateOrientation);
    return () => {
      window.removeEventListener("resize", updateOrientation);
      window.removeEventListener("orientationchange", updateOrientation);
    };
  }, []);

  // Mobile check
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Arrow hint timeout
  useEffect(() => {
    if (!showArrows) return;
    const timeout = setTimeout(() => setShowArrows(false), 4000);
    return () => clearTimeout(timeout);
  }, [showArrows]);

  // Swipe hint for first-time
  useEffect(() => {
    if (!localStorage.getItem("scrollFlipIntroSeen")) {
      setShowArrowHint(true);
      setTimeout(() => {
        setShowArrowHint(false);
        localStorage.setItem("scrollFlipIntroSeen", "true");
      }, 3000);
    }
  }, []);

  // Touch navigation
  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (startX.current !== null) {
      const endX = e.changedTouches[0].clientX;
      const deltaX = endX - startX.current;
      if (deltaX > 50) {
        setIsExpanded(false);
        setCurrentIndex((i) => Math.max(i - 1, 0));
      } else if (deltaX < -50) {
        setIsExpanded(false);
        setCurrentIndex((i) => Math.min(i + 1, galleryData.length - 1));
      }
      startX.current = null;
    }
  };

  const direction = currentIndex > prevIndex.current ? 1 : -1;
  prevIndex.current = currentIndex;

  return (
    <div
      className="min-h- bg-white text-black font-serif px-5 py-8 overflow-hidden"
      style={{ fontFamily: 'Glegoo, serif' }}
      onMouseMove={() => setShowArrows(true)}
    >
      {/* Google Font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Glegoo:ital,wght@0,400;0,700;1,400&display=swap"
        rel="stylesheet"
      />

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
                  {isMobile && (
                    <div
                      className="text-center text-2xl text-gray-400 tracking-wide mb-0 sm:hidden font-bold"
                      style={{
                        fontFamily: "'Glegoo', serif",
                        marginTop: "-2.0rem",
                        opacity: ".6",
                        lineHeight: "1",
                      }}
                    >
                      ⸺{" "}
                      <a
                        href={(() => {
                          const parts = window.location.pathname.split("/");
                          const iIdx = parts.findIndex((p) => p.startsWith("i-"));
                          return iIdx > 1
                            ? parts.slice(0, iIdx - 1).join("/")
                            : parts.slice(0, -1).join("/");
                        })()}
                        title="Explore Full Collection"
                        className="text-[#85644b] no-underline hover:underline"
                      >
                        K4 Studios
                      </a>{" "}
                      ⸺
                    </div>
                  )}

                  {/* IMAGE + ARROWS COLUMN */}
                  <div className="flex flex-col -mt-4 items-center w-full relative">
                    <div className="w-full relative flex items-center justify-center mb-0">
                      {/* Left Arrow (mobile) */}
                      <button
                        onClick={() => {
                          setIsExpanded(false);
                          setCurrentIndex((i) => Math.max(i - 1, 0));
                        }}
                        aria-label="Previous Chapter"
                        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 text-gray-400 bg-gray-100 rounded-md shadow px-2 py-1 text-xl md:hidden"
                        style={{
                          minWidth: 28,
                          minHeight: 28,
                          fontSize: "1.2rem",
                          display: isMobile ? "block" : "none",
                          opacity: showArrows ? 0.8 : 0,
                          transition: "opacity 0.5s ease",
                          pointerEvents: showArrows ? "auto" : "none",
                        }}
                        tabIndex={isMobile ? 0 : -1}
                      >
                        ❮
                      </button>

                      <div className="relative w-full md:w-[340px] flex flex-row">
                        {/* Image */}
                        <div className="aspect-[4/5] relative rounded-lg flex items-center justify-center text-gray-500 cursor-pointer overflow-hidden z-10 w-full group"
                          style={{
                            marginLeft: isMobile ? "10px" : 0,
                            marginRight: isMobile ? "10px" : 0,
                          }}
                        >
                          <img
                            src={galleryData[currentIndex].src}
                            alt={galleryData[currentIndex].title}
                            className="chapter-image-mobile border-2 border-gray-400 rounded-lg"
                            style={
                              isMobile
                                ? {
                                    cursor: "zoom-in",
                                    width: "auto",
                                    height: "auto",
                                    objectFit: "contain",
                                    maxHeight: "65vh",
                                  }
                                : {
                                    cursor: "zoom-in",
                                    width: "auto",
                                    height: "auto",
                                    objectFit: "contain",
                                    maxHeight: "70vh",
                                    background: "#f7f7f7",
                                  }
                            }
                            onClick={() => {
                              if (!isLandscapeMobile) setIsZoomed(true);
                            }}
                          />

                          {/* ❤️ Like Button (Mobile overlay) */}
                          {isMobile && (
                            <div className="absolute top-2 right-2 z-30">
  <LikeButton
    imageId={galleryData[currentIndex].id}
    pageTitle={galleryData[currentIndex].title}
  />
</div>
                          )}
                        </div>

                        {/* Collector Notes (desktop) */}
                        {!isMobile && galleryData[currentIndex].notes && (
                          <div className="hidden md:flex flex-col items-start relative">
                            <button
                              onClick={() => setShowNotes((prev) => !prev)}
                              aria-label="View Collector Notes"
                              title={showNotes ? "Hide Collector Notes" : "View Collector Notes"}
                              className="ml-0 mt-1 w-6 h-8 border border-gray-300 bg-white text-gray-400 rounded-md shadow hover:bg-gray-200 transition relative z-30"
                              style={{ boxShadow: "0 2px 6px rgba(80,60,30,0.10)" }}
                            >
                              {showNotes ? (
                                <span className="text-lg leading-none">✕</span>
                              ) : (
                                <>
                                  <span className="absolute left-2 top-[2px] text-[12px] text-red-600 font-semibold">
                                    *
                                  </span>
                                  <Notebook className="w-6 h-6 stroke-[1.75]" />
                                </>
                              )}
                            </button>
                            <AnimatePresence>
                              {showNotes && (
                                <motion.div
                                  key="collector-notes-desktop"
                                  initial={{ opacity: 0, x: -32 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: -32 }}
                                  transition={{ duration: 0.38, ease: [0.33, 1, 0.68, 1] }}
                                  className="absolute -left-3 top-11 z-50 w-96 border border-gray-300 rounded shadow-2xl p-5 text-sm text-gray-800"
                                  style={{
                                    backgroundColor: "#9fa692",
                                    border: "1px solid rgb(109, 111, 114)",
                                    minWidth: "260px",
                                    maxWidth: "90vw",
                                    marginLeft: "16px",
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", marginBottom: "0.5rem" }}>
                                    <strong
                                      style={{
                                        color: "#fff",
                                        textShadow: "0 1px 2px #444",
                                        fontWeight: "bold",
                                        marginRight: "0.75em",
                                        fontSize: "1em",
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
                                        filter: "drop-shadow(0 1px 2px #444)",
                                      }}
                                    />
                                  </div>
                                  {galleryData[currentIndex].notes.split("\n\n").map((para, idx) => (
                                    <p key={idx} className="mb-3 last:mb-0">
                                      {para}
                                    </p>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>

                      {/* Right Arrow (mobile) */}
                      <button
                        onClick={() => {
                          setIsExpanded(false);
                          setCurrentIndex((i) => Math.min(i + 1, galleryData.length - 1));
                        }}
                        aria-label="Next Chapter"
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 text-gray-400 bg-gray-100 rounded-md shadow px-2 py-1 text-xl md:hidden"
                        style={{
                          minWidth: 28,
                          minHeight: 28,
                          fontSize: "1.2rem",
                          display: isMobile ? "block" : "none",
                          opacity: showArrows ? 0.8 : 0,
                          transition: "opacity 0.5s ease",
                          pointerEvents: showArrows ? "auto" : "none",
                        }}
                        tabIndex={isMobile ? 0 : -1}
                      >
                        ❯
                      </button>
                    </div>

                   

                    {/* Unified Nav Row */}
                    <div
                      className="flex items-center justify-center ml-[0.2rem] gap-1 md:gap-6 mt-3 mb-1 max-w-[340px] mx-auto"
                      style={
                        !isMobile && galleryData[currentIndex].notes
                          ? { marginRight: "112px" }
                          : {}
                      }
                    >
                      {/* Menu */}
                      <button
                        className="px-1 py-.5 border border-gray-200 hover:bg-gray-200 bg-white text-gray-400 text-lg rounded shadow-sm transition-colors duration-150 hover:text-gray-900 focus:text-gray-900 hover:border-gray-500 focus:border-gray-500"
                        aria-label="Show Menu"
                        title="Show Menu"
                        style={{ minWidth: 32, minHeight: 32, fontWeight: 400 }}
                        onClick={() => setShowMiniMenu(true)}
                      >
                        ☰
                      </button>

                      {/* Notes (mobile) */}
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
                              <span className="absolute left-2 top-[2px] text-[12px] text-red-600 font-semibold">
                                *
                              </span>
                              <Notebook className="w-5 h-5 stroke-[1.75]" />
                            </>
                          )}
                        </button>
                      )}

                      {/* Chapter count */}
                      <div className="text-sm text-gray-500 font-medium flex items-center whitespace-nowrap" style={{ letterSpacing: '-0.075em' }}>
                        {`${currentIndex + 1} – ${galleryData.length}`}
                      </div>

                      {/* Grid icon (mobile) */}
                      <button
                        onClick={() => setViewMode((prev) => (prev === "flip" ? "grid" : "flip"))}
                        aria-label="View Grid Mode"
                        title="View Grid Mode"
                        className="bg-gray-100 rounded p-1 shadow hover:bg-gray-200 flex items-center justify-center md:hidden"
                        style={{ minWidth: 32, minHeight: 32 }}
                      >
                        <Grid className="w-5 h-5" style={{ stroke: "#84766d" }} />
                      </button>

                      {/* Jump form */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const num = parseInt(e.target.elements.chapterNum.value, 10);
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
                        style={{ backgroundColor: '#bbb6b1', color: '#ffffff' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#76807b')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#bbb6b1')}
                      >
                        <ShoppingCart className="w-4 h-4" />
                      </a>
 {/* ❤️ Like Button (Desktop in button row) */}
  {!isMobile && (
    <div className="inline-flex items-center px-2">
      <LikeButton
        imageId={galleryData[currentIndex].id}
        pageTitle={galleryData[currentIndex].title}
      />
    </div>
  )}
                      {/* Exit */}
                      <button
                        className="group relative inline-block px-1 py-[0.15rem] border border-gray-200 bg-white text-gray-400 text-xs rounded shadow-sm transition-colors duration-200 hover:bg-gray-200 hover:text-gray-900 hover:border-gray-500 focus:text-gray-900 focus:border-gray-500"
                        aria-label="Exit Chapter View"
                        title="Exit"
                        style={{ fontWeight: 400, minHeight: 32, minWidth: 35 }}
                        onClick={() =>
                          (window.location.href =
                            "/Galleries/Painterly-Fine-Art-Photography/Transportation/Cars")
                        }
                      >
                        <span className="block relative h-[1em]">
                          <span className="absolute inset-0 flex items-center justify-center text-md transition-all duration-200 ease-in-out opacity-100 translate-y-0 group-hover:opacity-0 group-hover:-translate-y-1">
                            X
                          </span>
                          <span className="absolute inset-0 flex items-center justify-center transition-all duration-200 ease-in-out opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0">
                            Exit
                          </span>
                        </span>
                      </button>
                    </div>

                    {/* Collector Notes Panel (mobile) */}
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
                            style={{ backgroundColor: "#9fa692", border: "1px solid rgb(109, 111, 114)", maxWidth: "98vw", boxSizing: "border-box" }}
                          >
                            <div style={{ display: "flex", alignItems: "center", marginBottom: "0.5rem" }}>
                              <strong style={{ color: "#fff", textShadow: "0 1px 2px #444", fontWeight: "bold", marginRight: "0.75em", fontSize: "1em" }}>
                                Collector Notes:
                              </strong>
                              <span style={{ flex: 1, marginTop: "4px", height: "2px", marginLeft: "0.5em", borderRadius: "2px", background: "linear-gradient(to right, #fff 65%, rgba(255,255,255,0))", filter: "drop-shadow(0 1px 2px #444)" }} />
                            </div>
                            {galleryData[currentIndex].notes.split("\n\n").map((para, idx) => (
                              <p key={idx} className="mb-3 last:mb-0">
                                {para}
                              </p>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    )}
                  </div>

                  {/* DESCRIPTION + DESKTOP NAV COLUMN */}
                  <div className="w-full md:pl-8">
                    {/* Separator */}
                    <div className="hidden md:flex justify-center my-2">
                      <div className="flex items-center justify-center gap-3 my-4 text-[#7a6a58]">
                        <div className="h-px w-20 bg-[#7a6a58]" />
                        <div className="w-3 h-3 rotate-45 bg-[#7a6a58]" />
                        <div className="h-px w-20 bg-[#7a6a58]" />
                      </div>
                    </div>

                    {/* Logo Watermark */}
                    <div className="mb-4 flex justify-center relative z-0 hidden md:flex">
                      <img
                        src="/images/K4Logo-web-b.jpg"
                        alt="K4 Studios Logo"
                        className="h-16.5 mb-5"
                        style={{ borderRadius: "50px", maxWidth: "160px", opacity: ".55" }}
                      />
                    </div>

                    {/* Title */}
                    <h2
                      className="text-center font-semibold mb-1 tracking-wide text-[#85644b]"
                      style={{
                        fontSize: "1.55rem",
                        opacity: .5,
                        lineHeight: isMobile ? "1.0" : "1.35",
                        fontFamily: "'Glegoo', serif",
                      }}
                    >
                      Chapter {currentIndex + 1}:
                      {galleryData[currentIndex].title && (
                        <>
                          <br />
                          <span className="chapter-title">{galleryData[currentIndex].title}</span>
                        </>
                      )}
                    </h2>

                    {/* Story */}
                    <p className="italic text-base mt-3 md:text-lg mb-4 leading-snug text-left">
                      {galleryData[currentIndex].story}
                    </p>

                    {/* More Info Toggle & Panel */}
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

                    {/* Bottom Separator */}
                    <div className="flex justify-center my-3">
                      <div className="flex items-center justify-center gap-3 my-6 text-[#7a6a58]">
                        <div className="h-px w-20 bg-[#7a6a58]" />
                        <div className="w-3 h-3 rotate-45 bg-[#7a6a58]" />
                        <div className="h-px w-20 bg-[#7a6a58]" />
                      </div>
                    </div>

                    {/* Desktop Nav Buttons */}
                    <div className="hidden md:flex justify-center items-center gap-4 pt-4">
                      <button
                        onClick={() => setCurrentIndex((i) => Math.max(i - 1, 0))}
                        className="bg-gray-100 px-3 py-1 -mt-16 rounded shadow hover:bg-gray-200"
                      >
                        &lt;
                      </button>
                      <button
                        onClick={() => setViewMode("grid")}
                        className="bg-gray-100 p-2 -mt-16 rounded shadow hover:bg-gray-200"
                      >
                        <Grid className="w-5 h-5" color="#84766d" />
                      </button>
                      <button
                        onClick={() => setCurrentIndex((i) => Math.min(i + 1, galleryData.length - 1))}
                        className={`bg-gray-100 px-3 py-1 -mt-16 rounded shadow hover:bg-gray-200 ${
                          showArrowHint ? "animate-pulse text-yellow-500" : "text-black"
                        }`}
                      >
                        &gt;
                      </button>
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
                initialImageIndex={currentIndex}
                style={{ display: viewMode === "grid" ? "block" : "none" }}
              />
            )}
          </>
        )}
      </div>

      {/* Swipe Hint */}
      <SwipeHint galleryKey="Transportation-Cars" />
    </div>
  );
}
