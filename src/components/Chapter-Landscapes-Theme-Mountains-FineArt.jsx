import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ZoomOverlay from "./ZoomOverlay.jsx";
import RebuiltScrollGrid from "./RebuiltScrollGrid";
import MobileMiniDrawer from "./MobileMiniDrawer";
import "./ScrollFlipZoomStyles.css";
import "../styles/global.css";
import { galleryData as rawData } from "../data/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Mountains.mjs";
import SwipeHint from "./SwipeHint";
import LikeButton from "@/components/LikeButton.jsx";
import StoryShow from "./Gallery-Slideshow.jsx";
import useHorizontalSwipeNav from './hooks/useHorizontalSwipeNav.js';

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
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const prevIndex = useRef(currentIndex);
  const [showStoryShow, setShowStoryShow] = useState(false);

  useEffect(() => { const handleEnterChapters = () => setHasEnteredChapters(true); window.addEventListener("enterChapters", handleEnterChapters); return () => window.removeEventListener("enterChapters", handleEnterChapters); }, []);
  useEffect(() => { if (!galleryData || galleryData.length === 0) return; const match = window.location.pathname.match(/\/(i-[a-zA-Z0-9_-]+)$/); const idFromURL = match ? match[1] : initialImageId; if (idFromURL) { const index = galleryData.findIndex((e) => e.id === idFromURL); if (index !== -1) setCurrentIndex(index); } }, [initialImageId]);
  useEffect(() => { if (window.location.pathname.match(/\/(i-[a-zA-Z0-9_-]+)/)) setHasEnteredChapters(true); }, []);
  useEffect(() => { const imageId = galleryData[currentIndex]?.id; const alreadyOnImage = window.location.pathname.match(/\/i-[a-zA-Z0-9_-]+$/); if (!imageId || (!hasEnteredChapters && !alreadyOnImage)) return; const basePath = "/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Mountains"; const newUrl = `${basePath}/${imageId}`; if (window.location.pathname !== newUrl) window.history.pushState(null, "", newUrl); }, [currentIndex, hasEnteredChapters]);
  useEffect(() => { const introEl = document.getElementById("intro-section"); const isIntroVisible = introEl && !introEl.classList.contains("section-hidden"); if (isIntroVisible && currentIndex === 0 && window.location.pathname.includes("/i-")) { const cleanUrl = "/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Mountains"; window.history.replaceState(null, "", cleanUrl); } }, [currentIndex]);
  useEffect(() => { const handlePopState = () => { const match = window.location.pathname.match(/\/(i-[a-zA-Z0-9_-]+)/); const id = match ? match[1] : null; const header = document.getElementById("header-section"); const intro = document.getElementById("intro-section"); const chapter = document.getElementById("chapter-section"); if (id) { const index = galleryData.findIndex((e) => e.id === id); if (index !== -1) { setCurrentIndex(index); if (header) header.classList.add("section-hidden"); if (intro) intro.classList.add("section-hidden"); if (chapter) { chapter.style.display = "block"; chapter.classList.remove("section-hidden"); chapter.classList.add("section-visible"); } return; } } if (chapter) { chapter.style.display = "none"; chapter.classList.add("section-hidden"); chapter.classList.remove("section-visible"); } if (header) header.classList.remove("section-hidden", "slide-fade-out"); if (intro) intro.classList.remove("section-hidden", "slide-fade-out"); }; window.addEventListener("popstate", handlePopState); return () => window.removeEventListener("popstate", handlePopState); }, []);
  useEffect(() => { document.body.classList.add("react-mounted"); }, []);
  useEffect(() => { const onKeyDown = (e) => { if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || /(INPUT|TEXTAREA|SELECT)/.test(e.target.tagName)) return; if (viewMode !== "flip" || isZoomed) return; if (e.key === "ArrowRight") { setIsExpanded(false); setCurrentIndex(i => Math.min(i + 1, galleryData.length - 1)); } else if (e.key === "ArrowLeft") { setIsExpanded(false); setCurrentIndex(i => Math.max(i - 1, 0)); } }; window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown); }, [viewMode, isZoomed]);
  useEffect(() => { const onResize = () => { const w = window.innerWidth; const h = window.innerHeight; setIsMobile(w < 870); setIsLandscapeMobile(w < 870 && w > h); }; onResize(); window.addEventListener("resize", onResize); return () => window.removeEventListener("resize", onResize); }, []);
  const { containerProps: swipeHandlers } = useHorizontalSwipeNav({
    onPrev: () => { setCurrentIndex(i => Math.max(i - 1, 0)); },
    onNext: () => { setCurrentIndex(i => Math.min(i + 1, galleryData.length - 1)); }
  });
  const currentImage = galleryData[currentIndex];
  const showPrev = currentIndex > 0; const showNext = currentIndex < galleryData.length - 1;
  return (<div id="chapter-section" className="chapter-section" style={{ display: hasEnteredChapters ? "block" : "none" }} {...swipeHandlers}>
    <div className="image-navigation-wrapper">
      <div className="image-container" style={{ position: "relative" }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.img key={currentImage.id} src={currentImage.src} alt={currentImage.alt || currentImage.title} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.4 }} style={{ maxHeight: isMobile ? "75vh" : "75vh", objectFit: "contain" }} onClick={() => setIsZoomed(true)} />
        </AnimatePresence>
        {showPrev && !isZoomed && (<button className="nav-arrow left" onClick={() => setCurrentIndex(i => Math.max(i - 1, 0))} aria-label="Previous image">‹</button>)}
        {showNext && !isZoomed && (<button className="nav-arrow right" onClick={() => setCurrentIndex(i => Math.min(i + 1, galleryData.length - 1))} aria-label="Next image">›</button>)}
      </div>
    </div>
    {isZoomed && (<ZoomOverlay image={currentImage} onClose={() => setIsZoomed(false)} />)}
  </div>);
}
