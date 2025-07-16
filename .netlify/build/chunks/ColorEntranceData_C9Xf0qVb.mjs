import { c as createComponent, d as createAstro, i as renderComponent, r as renderTemplate, m as maybeRenderHead, j as renderScript } from './astro/server_DU4U1nxe.mjs';
import 'kleur/colors';
import { a as $$BaseLayout, $ as $$Footer } from './Footer_VeJuj4uH.mjs';
import { Z as ZoomOverlay, M as MobileMiniDrawer, R as RebuiltScrollGrid, S as SwipeHint, G as GalleryLandingHeader, a as GalleryInfo } from './SwipeHint_B6JaAkqb.mjs';
import { jsxs, jsx, Fragment } from 'react/jsx-runtime';
import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Notebook, Grid, ShoppingCart } from 'lucide-react';
/* empty css                        */
/* empty css                        */
import { g as galleryData$1 } from './Color_D9UJrp0k.mjs';
/* empty css                        */

const galleryData = galleryData$1.filter((entry) => entry.id !== "i-k4studios");
function ScrollFlipGallery({ initialImageId }) {
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
  useEffect(() => {
    const handleEnterChapters = () => setHasEnteredChapters(true);
    window.addEventListener("enterChapters", handleEnterChapters);
    return () => window.removeEventListener("enterChapters", handleEnterChapters);
  }, []);
  useEffect(() => {
    const match = window.location.pathname.match(/\/(i-[a-zA-Z0-9_-]+)/);
    const id = match ? match[1] : initialImageId;
    const index = galleryData.findIndex((entry) => entry.id === id);
    setCurrentIndex(index !== -1 ? index : 0);
  }, []);
  useEffect(() => {
    if (window.location.pathname.match(/\/(i-[a-zA-Z0-9_-]+)/)) {
      setHasEnteredChapters(true);
    }
  }, []);
  useEffect(() => {
    const imageId = galleryData[currentIndex]?.id;
    const alreadyOnImage = window.location.pathname.match(/\/i-[a-zA-Z0-9_-]+$/);
    if (!imageId || !hasEnteredChapters && !alreadyOnImage) return;
    const basePath = "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Color";
    const newUrl = `${basePath}/${imageId}`;
    const currentUrl = window.location.pathname;
    if (currentUrl !== newUrl) {
      window.history.pushState(null, "", newUrl);
    }
  }, [currentIndex, hasEnteredChapters]);
  useEffect(() => {
    const introEl = document.getElementById("intro-section");
    const isIntroVisible = introEl && !introEl.classList.contains("section-hidden");
    const isViewingImageZero = currentIndex === 0;
    if (isIntroVisible && isViewingImageZero && window.location.pathname.includes("/i-")) {
      const cleanUrl = "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Color";
      window.history.replaceState(null, "", cleanUrl);
    }
  }, [currentIndex]);
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
  useEffect(() => {
    document.body.classList.add("react-mounted");
  }, []);
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
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);
  useEffect(() => {
    if (!showArrows) return;
    const timeout = setTimeout(() => setShowArrows(false), 4e3);
    return () => clearTimeout(timeout);
  }, [showArrows]);
  useEffect(() => {
    if (!localStorage.getItem("scrollFlipIntroSeen")) {
      setShowArrowHint(true);
      setTimeout(() => {
        setShowArrowHint(false);
        localStorage.setItem("scrollFlipIntroSeen", "true");
      }, 3e3);
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
        setCurrentIndex((i) => {
          setIsExpanded(false);
          return Math.max(i - 1, 0);
        });
      } else if (deltaX < -50) {
        setCurrentIndex((i) => {
          setIsExpanded(false);
          return Math.min(i + 1, galleryData.length - 1);
        });
      }
      startX.current = null;
    }
  };
  const direction = currentIndex > prevIndex.current ? 1 : -1;
  prevIndex.current = currentIndex;
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: "min-h-screen bg-white text-black font-serif px-5 py-8 overflow-hidden",
      style: { fontFamily: "Glegoo, serif" },
      onMouseMove: () => setShowArrows(true),
      children: [
        /* @__PURE__ */ jsx("link", { href: "https://fonts.googleapis.com/css2?family=Glegoo:ital,wght@0,400;0,700;1,400&display=swap", rel: "stylesheet" }),
        /* @__PURE__ */ jsx("div", { className: "relative max-w-6xl mx-auto", children: isZoomed ? /* @__PURE__ */ jsx(
          ZoomOverlay,
          {
            imageData: galleryData[currentIndex],
            matColor,
            setMatColor,
            onClose: () => setIsZoomed(false)
          }
        ) : /* @__PURE__ */ jsxs(Fragment, { children: [
          viewMode === "flip" && /* @__PURE__ */ jsx(AnimatePresence, { mode: "wait", children: /* @__PURE__ */ jsxs(
            motion.div,
            {
              initial: { opacity: 0, x: direction > 0 ? 150 : -150 },
              animate: { opacity: 1, x: 0 },
              exit: { opacity: 0, x: direction > 0 ? -150 : 150 },
              transition: { duration: 0.6, ease: [0.45, 0, 0.55, 1] },
              className: "grid md:grid-cols-2 gap-6 md:gap-12 items-center",
              onTouchStart: handleTouchStart,
              onTouchEnd: handleTouchEnd,
              children: [
                /* @__PURE__ */ jsxs("div", { className: "flex flex-col -mt-4 items-center w-full relative", children: [
                  /* @__PURE__ */ jsxs("div", { className: "w-full relative flex items-center justify-center mb-0", children: [
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        onClick: () => {
                          setIsExpanded(false);
                          setCurrentIndex((i) => Math.max(i - 1, 0));
                        },
                        "aria-label": "Previous Chapter",
                        className: "absolute left-4 top-1/2 -translate-y-1/2 z-20 text-gray-400 bg-gray-100 rounded-md shadow px-2 py-1 text-xl md:hidden",
                        style: {
                          minWidth: 28,
                          minHeight: 28,
                          fontSize: "1.2rem",
                          display: isMobile ? "block" : "none",
                          opacity: showArrows ? 0.8 : 0,
                          // 80% then fade
                          transition: "opacity 0.5s ease",
                          pointerEvents: showArrows ? "auto" : "none"
                          // avoid accidental taps when hidden
                        },
                        tabIndex: isMobile ? 0 : -1,
                        children: "❮"
                      }
                    ),
                    /* @__PURE__ */ jsxs("div", { className: "relative w-full md:w-[340px] flex flex-row", children: [
                      /* @__PURE__ */ jsx(
                        "div",
                        {
                          className: "aspect-[4/5] rounded-lg flex items-center justify-center text-gray-500 cursor-pointer overflow-hidden z-10 w-full group",
                          style: {
                            marginLeft: isMobile ? "10px" : 0,
                            marginRight: isMobile ? "10px" : 0
                          },
                          children: /* @__PURE__ */ jsx(
                            "img",
                            {
                              src: galleryData[currentIndex].src,
                              alt: galleryData[currentIndex].title,
                              className: "chapter-image-mobile border-2 border-gray-400 rounded-lg",
                              style: isMobile ? {
                                cursor: "zoom-in",
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                maxHeight: "65vh"
                              } : {
                                cursor: "zoom-in",
                                width: "100%",
                                height: "auto",
                                objectFit: "contain",
                                maxHeight: "70vh",
                                minHeight: "340px",
                                background: "#f7f7f7"
                              },
                              onClick: () => {
                                if (!isLandscapeMobile) setIsZoomed(true);
                              }
                            }
                          )
                        }
                      ),
                      !isMobile && galleryData[currentIndex].notes && /* @__PURE__ */ jsxs("div", { className: "hidden md:flex flex-col items-start relative", children: [
                        /* @__PURE__ */ jsx(
                          "button",
                          {
                            onClick: () => setShowNotes((prev) => !prev),
                            "aria-label": "View Collector Notes",
                            title: showNotes ? "Hide Collector Notes" : "View Collector Notes",
                            className: "ml-0 mt-1 w-6 h-8 border border-gray-300 bg-white text-gray-400 rounded-md shadow hover:bg-gray-200 transition relative z-30",
                            style: {
                              boxShadow: "0 2px 6px rgba(80,60,30,0.10)"
                            },
                            children: showNotes ? /* @__PURE__ */ jsx("span", { className: "text-lg leading-none", children: "✕" }) : /* @__PURE__ */ jsxs(Fragment, { children: [
                              /* @__PURE__ */ jsx("span", { className: "absolute left-2 top-[2px] text-[12px] text-red-600 font-semibold", children: "*" }),
                              /* @__PURE__ */ jsx(Notebook, { className: "w-6 h-6 stroke-[1.75]" })
                            ] })
                          }
                        ),
                        /* @__PURE__ */ jsx(AnimatePresence, { children: showNotes && /* @__PURE__ */ jsxs(
                          motion.div,
                          {
                            initial: { opacity: 0, x: -32 },
                            animate: { opacity: 1, x: 0 },
                            exit: { opacity: 0, x: -32 },
                            transition: { duration: 0.38, ease: [0.33, 1, 0.68, 1] },
                            className: "absolute -left-3 top-11 z-50 w-96 border border-gray-300 rounded shadow-2xl p-5 text-sm text-gray-800",
                            style: {
                              backgroundColor: "#9fa692",
                              border: "1px solid rgb(109, 111, 114)",
                              minWidth: "260px",
                              maxWidth: "90vw",
                              marginLeft: "16px"
                            },
                            children: [
                              /* @__PURE__ */ jsxs("div", { style: {
                                display: "flex",
                                alignItems: "center",
                                marginBottom: "0.5rem"
                              }, children: [
                                /* @__PURE__ */ jsx(
                                  "strong",
                                  {
                                    style: {
                                      color: "#fff",
                                      textShadow: "0 1px 2px #444",
                                      fontWeight: "bold",
                                      marginRight: "0.75em",
                                      fontSize: "1em"
                                    },
                                    children: "Collector Notes:"
                                  }
                                ),
                                /* @__PURE__ */ jsx(
                                  "span",
                                  {
                                    style: {
                                      flex: 1,
                                      marginTop: "4px",
                                      height: "2px",
                                      marginLeft: "0.5em",
                                      borderRadius: "2px",
                                      background: "linear-gradient(to right, #fff 65%, rgba(255,255,255,0))",
                                      filter: "drop-shadow(0 1px 2px #444)"
                                    }
                                  }
                                )
                              ] }),
                              galleryData[currentIndex].notes.split("\n\n").map((para, idx) => /* @__PURE__ */ jsx("p", { className: "mb-3 last:mb-0", children: para }, idx))
                            ]
                          },
                          "collector-notes-desktop"
                        ) })
                      ] })
                    ] }),
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        onClick: () => {
                          setIsExpanded(false);
                          setCurrentIndex((i) => Math.min(i + 1, galleryData.length - 1));
                        },
                        "aria-label": "Previous Chapter",
                        className: "absolute right-4 top-1/2 -translate-y-1/2 z-20 text-gray-400 bg-gray-100 rounded-md shadow px-2 py-1 text-xl md:hidden",
                        style: {
                          minWidth: 28,
                          minHeight: 28,
                          fontSize: "1.2rem",
                          display: isMobile ? "block" : "none",
                          opacity: showArrows ? 0.8 : 0,
                          // 80% then fade
                          transition: "opacity 0.5s ease",
                          pointerEvents: showArrows ? "auto" : "none"
                          // avoid accidental taps when hidden
                        },
                        tabIndex: isMobile ? 0 : -1,
                        children: "❯"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxs(
                    "div",
                    {
                      className: "flex items-center justify-center ml-[0.2rem] gap-1 md:gap-6 mt-3 mb-1 max-w-[340px] mx-auto",
                      style: (
                        // If on desktop, and notes are present, add right margin to bar
                        !isMobile && galleryData[currentIndex].notes ? { marginRight: "112px" } : {}
                      ),
                      children: [
                        /* @__PURE__ */ jsx(
                          "button",
                          {
                            className: "px-1 py-.5 border border-gray-200 hover:bg-gray-200 bg-white text-gray-400 text-lg rounded shadow-sm transition-colors duration-150 hover:text-gray-900 focus:text-gray-900 hover:border-gray-500 focus:border-gray-500",
                            "aria-label": "Show Menu",
                            title: "Show Menu",
                            style: { minWidth: 32, minHeight: 32, fontWeight: 400 },
                            onClick: () => setShowMiniMenu(true),
                            children: "☰"
                          }
                        ),
                        galleryData[currentIndex].notes && isMobile && /* @__PURE__ */ jsx(
                          "button",
                          {
                            onClick: () => setShowNotes((prev) => !prev),
                            "aria-label": "View Collector Notes",
                            title: showNotes ? "Hide Collector Notes" : "View Collector Notes",
                            className: "inline-flex items-center text-gray-400 hover:bg-gray-200 justify-center w-7 h-7 relative border border-gray-200 bg-white rounded shadow",
                            children: showNotes ? /* @__PURE__ */ jsx("span", { className: "text-lg leading-none", children: "✕" }) : /* @__PURE__ */ jsxs(Fragment, { children: [
                              /* @__PURE__ */ jsx("span", { className: "absolute left-2 top-[2px] text-[12px] text-red-600 font-semibold", children: "*" }),
                              /* @__PURE__ */ jsx(Notebook, { className: "w-5 h-5 stroke-[1.75]" })
                            ] })
                          }
                        ),
                        /* @__PURE__ */ jsx("div", { className: "text-sm text-gray-500 font-medium flex items-center whitespace-nowrap", style: { letterSpacing: "-0.075em" }, children: `${currentIndex + 1} – ${galleryData.length}` }),
                        /* @__PURE__ */ jsx(
                          "button",
                          {
                            onClick: () => setViewMode((prev) => prev === "flip" ? "grid" : "flip"),
                            "aria-label": "View Grid Mode",
                            title: "View Grid Mode",
                            className: "bg-gray-100 rounded p-1 shadow hover:bg-gray-200 flex items-center justify-center md:hidden",
                            style: { minWidth: 32, minHeight: 32 },
                            children: /* @__PURE__ */ jsx(Grid, { className: "w-5 h-5", style: { stroke: "#84766d" } })
                          }
                        ),
                        /* @__PURE__ */ jsxs(
                          "form",
                          {
                            onSubmit: (e) => {
                              e.preventDefault();
                              const input = e.target.elements.chapterNum.value;
                              const num = parseInt(input, 10);
                              if (!isNaN(num) && num >= 1 && num <= galleryData.length) {
                                setIsExpanded(false);
                                setCurrentIndex(num - 1);
                              }
                            },
                            className: "flex items-center gap-2 text-xs",
                            style: { minWidth: 100 },
                            children: [
                              /* @__PURE__ */ jsx(
                                "input",
                                {
                                  type: "number",
                                  id: "chapterNum",
                                  name: "chapterNum",
                                  min: "1",
                                  max: galleryData.length,
                                  placeholder: "Jump #",
                                  className: "w-20 border border-gray-300 rounded px-1 py-1 text-center",
                                  style: { fontSize: "0.95em" }
                                }
                              ),
                              /* @__PURE__ */ jsx("button", { type: "submit", className: "bg-gray-100 px-2 py-1 rounded shadow hover:bg-gray-200", children: "Go" })
                            ]
                          }
                        ),
                        /* @__PURE__ */ jsx(
                          "a",
                          {
                            href: galleryData[currentIndex].buyLink || "#",
                            target: "_blank",
                            rel: "noopener noreferrer",
                            title: "Click to order prints",
                            className: "inline-flex items-center gap-2 rounded px-2 py-1.5 text-xs font-semibold shadow transition",
                            style: {
                              backgroundColor: "#bbb6b1",
                              color: "#ffffff"
                            },
                            onMouseEnter: (e) => {
                              e.currentTarget.style.backgroundColor = "#76807b";
                            },
                            onMouseLeave: (e) => {
                              e.currentTarget.style.backgroundColor = "#bbb6b1";
                            },
                            children: /* @__PURE__ */ jsx(ShoppingCart, { className: "w-4 h-4" })
                          }
                        ),
                        /* @__PURE__ */ jsx(
                          "button",
                          {
                            className: "px-2 py-.5 border border-gray-200 hover:bg-gray-200 bg-white text-gray-400 text-lg rounded shadow-sm transition-colors duration-150 hover:text-gray-900 focus:text-gray-900 hover:border-gray-500 focus:border-gray-500",
                            "aria-label": "Close",
                            title: "Close",
                            style: { minWidth: 32, minHeight: 32, fontWeight: 400 },
                            onClick: () => window.location.href = "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Color",
                            children: "⨂"
                          }
                        )
                      ]
                    }
                  ),
                  galleryData[currentIndex].notes && isMobile && /* @__PURE__ */ jsx(AnimatePresence, { children: showNotes && /* @__PURE__ */ jsxs(
                    motion.div,
                    {
                      initial: { opacity: 0, y: -8 },
                      animate: { opacity: 1, y: 0 },
                      exit: { opacity: 0, y: -8 },
                      transition: { duration: 0.6, ease: [0.33, 1, 0.68, 1] },
                      className: "w-full mx-auto mt-2 mb-[6px] border border-gray-300 rounded shadow p-4 text-sm text-gray-800 text-left",
                      style: {
                        backgroundColor: "#9fa692",
                        border: "1px solid rgb(109, 111, 114)",
                        maxWidth: "98vw",
                        boxSizing: "border-box"
                      },
                      children: [
                        /* @__PURE__ */ jsxs("div", { style: {
                          display: "flex",
                          alignItems: "center",
                          marginBottom: "0.5rem"
                        }, children: [
                          /* @__PURE__ */ jsx(
                            "strong",
                            {
                              style: {
                                color: "#fff",
                                textShadow: "0 1px 2px #444",
                                fontWeight: "bold",
                                marginRight: "0.75em",
                                fontSize: "1em"
                              },
                              children: "Collector Notes:"
                            }
                          ),
                          /* @__PURE__ */ jsx(
                            "span",
                            {
                              style: {
                                flex: 1,
                                marginTop: "4px",
                                height: "2px",
                                marginLeft: "0.5em",
                                borderRadius: "2px",
                                background: "linear-gradient(to right, #fff 65%, rgba(255,255,255,0))",
                                filter: "drop-shadow(0 1px 2px #444)"
                              }
                            }
                          )
                        ] }),
                        galleryData[currentIndex].notes.split("\n\n").map((para, idx) => /* @__PURE__ */ jsx("p", { className: "mb-3 last:mb-0", children: para }, idx))
                      ]
                    },
                    "collector-notes-mobile"
                  ) })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "w-full md:pl-8", children: [
                  /* @__PURE__ */ jsx("div", { className: "hidden md:flex justify-center my-2", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center gap-3 my-4 text-[#7a6a58]", children: [
                    /* @__PURE__ */ jsx("div", { className: "h-px w-20 bg-[#7a6a58]" }),
                    /* @__PURE__ */ jsx("div", { className: "w-3 h-3 rotate-45 bg-[#7a6a58]" }),
                    /* @__PURE__ */ jsx("div", { className: "h-px w-20 bg-[#7a6a58]" })
                  ] }) }),
                  /* @__PURE__ */ jsx("div", { className: "mb-4 flex justify-center relative z-0 hidden md:flex", children: /* @__PURE__ */ jsx(
                    "img",
                    {
                      src: "/images/K4Logo-web-b.jpg",
                      alt: "K4 Studios Logo",
                      className: "h-16.5 mb-5",
                      style: {
                        borderRadius: "50px",
                        maxWidth: "160px",
                        opacity: ".55"
                      }
                    }
                  ) }),
                  /* @__PURE__ */ jsxs("h2", { className: "text-center font-semibold mb-1 tracking-wide text-[#85644b]", style: { fontSize: "1.55rem" }, children: [
                    "Chapter ",
                    currentIndex + 1,
                    ":",
                    galleryData[currentIndex].title && /* @__PURE__ */ jsxs(Fragment, { children: [
                      /* @__PURE__ */ jsx("br", {}),
                      /* @__PURE__ */ jsx("span", { className: "chapter-title", children: galleryData[currentIndex].title })
                    ] })
                  ] }),
                  /* @__PURE__ */ jsx("p", { className: "italic text-base md:text-lg mb-4 leading-snug text-left", children: galleryData[currentIndex].story }),
                  (() => {
                    const descPanelId = `desc-panel-${galleryData[currentIndex]?.id || currentIndex}`;
                    return /* @__PURE__ */ jsxs("div", { className: "text-sm text-gray-600 mb-6 text-center group", style: { position: "relative" }, children: [
                      /* @__PURE__ */ jsxs(
                        "button",
                        {
                          onClick: () => setIsExpanded((prev) => !prev),
                          className: "inline-flex items-center gap-1 no-underline hover:no-underline focus:no-underline",
                          "aria-expanded": isExpanded,
                          "aria-controls": descPanelId,
                          "aria-label": "Toggle more information about this image",
                          id: `desc-toggle-${galleryData[currentIndex]?.id || currentIndex}`,
                          style: { zIndex: 50, position: "relative" },
                          children: [
                            /* @__PURE__ */ jsx("span", { className: `inline-block transform transition-transform duration-300 ${isExpanded ? "rotate-90" : ""}`, children: "▼" }),
                            "More about this image"
                          ]
                        }
                      ),
                      /* @__PURE__ */ jsx(AnimatePresence, { children: isExpanded && (isMobile ? /* @__PURE__ */ jsx(
                        motion.div,
                        {
                          initial: { opacity: 0, y: 12 },
                          animate: { opacity: 1, y: 0 },
                          exit: { opacity: 0, y: 12 },
                          transition: { duration: 0.45, ease: [0.33, 1, 0.68, 1] },
                          className: "relative mt-4 mx-auto w-11/12 max-w-lg px-4",
                          style: {
                            background: "#f9f6f1",
                            border: "1.5px solid #e1d6c1",
                            borderRadius: 16,
                            boxShadow: "0 8px 48px rgba(130,110,60,0.10)",
                            padding: ".95rem 1.5rem",
                            color: "#564427",
                            minHeight: "4rem",
                            maxHeight: "290px",
                            overflowY: "auto",
                            width: "100%"
                          },
                          id: descPanelId,
                          role: "region",
                          "aria-labelledby": `desc-toggle-${galleryData[currentIndex]?.id || currentIndex}`,
                          "aria-label": "More information about this image",
                          children: /* @__PURE__ */ jsx("p", { className: "pb-2", children: galleryData[currentIndex].description })
                        },
                        `desc-${currentIndex}-mobile`
                      ) : /* @__PURE__ */ jsx(
                        motion.div,
                        {
                          initial: { opacity: 0, y: 12 },
                          animate: { opacity: 1, y: 0 },
                          exit: { opacity: 0, y: 12 },
                          transition: { duration: 0.45, ease: [0.33, 1, 0.68, 1] },
                          className: "absolute left-2/2 top-12 z-50",
                          style: {
                            transform: "translateX(-50%)",
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
                            overflowY: "auto"
                          },
                          id: descPanelId,
                          role: "region",
                          "aria-labelledby": `desc-toggle-${galleryData[currentIndex]?.id || currentIndex}`,
                          "aria-label": "More information about this image",
                          children: /* @__PURE__ */ jsx("p", { className: "pb-2", children: galleryData[currentIndex].description })
                        },
                        `desc-${currentIndex}-desktop`
                      )) })
                    ] });
                  })(),
                  /* @__PURE__ */ jsx("div", { className: "flex justify-center my-3", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center gap-3 my-6 text-[#7a6a58]", children: [
                    /* @__PURE__ */ jsx("div", { className: "h-px w-20 bg-[#7a6a58]" }),
                    /* @__PURE__ */ jsx("div", { className: "w-3 h-3 rotate-45 bg-[#7a6a58]" }),
                    /* @__PURE__ */ jsx("div", { className: "h-px w-20 bg-[#7a6a58]" })
                  ] }) }),
                  /* @__PURE__ */ jsxs("div", { className: "hidden md:flex justify-center items-center gap-4 pt-4", children: [
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        onClick: () => setCurrentIndex((i) => Math.max(i - 1, 0)),
                        className: "bg-gray-100 px-3 py-1 -mt-16 rounded shadow hover:bg-gray-200",
                        children: "<"
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        onClick: () => setViewMode("grid"),
                        className: "bg-gray-100 p-2 -mt-16 rounded shadow hover:bg-gray-200",
                        children: /* @__PURE__ */ jsx(Grid, { className: "w-5 h-5", color: "#84766d" })
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        onClick: () => setCurrentIndex((i) => Math.min(i + 1, galleryData.length - 1)),
                        className: `bg-gray-100 px-3 py-1 -mt-16 rounded shadow hover:bg-gray-200 ${showArrowHint ? "animate-pulse text-yellow-500" : "text-black"}`,
                        children: ">"
                      }
                    )
                  ] })
                ] })
              ]
            },
            currentIndex
          ) }),
          showMiniMenu && /* @__PURE__ */ jsx("div", { className: "fixed top-0 right-0 h-full z-[9999] bg-white overflow-y-auto shadow-xl transition-all duration-300 w-[90vw] md:w-[50vw] lg:w-[25vw]", children: /* @__PURE__ */ jsx(MobileMiniDrawer, { onClose: () => setShowMiniMenu(false) }) }),
          viewMode === "grid" && /* @__PURE__ */ jsx(
            RebuiltScrollGrid,
            {
              galleryData,
              onCardClick: (i) => {
                setCurrentIndex(i);
                setIsExpanded(false);
                setViewMode("flip");
                window.scrollTo(0, 0);
              }
            }
          )
        ] }) }),
        /* @__PURE__ */ jsx(SwipeHint, { galleryKey: "Painterly-Roaring20s-Color" })
      ]
    }
  );
}

const $$Astro = createAstro();
const $$GalleryShellRoaring20SColor = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$GalleryShellRoaring20SColor;
  const { breadcrumb, entranceData, initialImageId } = Astro2.props;
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "Facing History: Roaring 20s \u2013 Color Photos", "data-astro-cid-4p6tw367": true }, { "default": ($$result2) => renderTemplate`  ${maybeRenderHead()}<section id="gallery-shell" class="flex flex-col bg-white" data-astro-cid-4p6tw367> <div id="gallery-content" class="flex-grow relative overflow-hidden" data-astro-cid-4p6tw367> <!-- Header stays fixed above intro --> <div id="header-section" class="section-visible" style="z-index: 10; position: relative;" data-astro-cid-4p6tw367> ${renderComponent($$result2, "GalleryHeader", GalleryLandingHeader, { "client:load": true, "breadcrumb": breadcrumb, "client:component-hydration": "load", "client:component-path": "C:/Users/Wayne/Documents/GitHub/K4-Studios/src/components/Gallery-LandingHeader.jsx", "client:component-export": "default", "data-astro-cid-4p6tw367": true })} </div> <!-- Spacer to push intro below header visually --> <div class="h-0 md:h-5" data-astro-cid-4p6tw367></div> <!-- Intro: Visible initially, now loads under the header --> <div id="intro-section" class="section-visible" style="z-index: 1; position: relative;" data-astro-cid-4p6tw367> ${renderComponent($$result2, "GalleryInfo", GalleryInfo, { "client:load": true, "entranceData": entranceData, "client:component-hydration": "load", "client:component-path": "C:/Users/Wayne/Documents/GitHub/K4-Studios/src/components/GalleryInfo.jsx", "client:component-export": "default", "data-astro-cid-4p6tw367": true })} </div> <!-- Chapter Viewer: Hidden initially --> <div id="chapter-section" class="section-hidden" style="display: none;" data-astro-cid-4p6tw367> ${renderComponent($$result2, "ChapterViewer", ScrollFlipGallery, { "client:load": true, "initialImageId": initialImageId || "i-k4studios", "client:component-hydration": "load", "client:component-path": "C:/Users/Wayne/Documents/GitHub/K4-Studios/src/components/Chapter-Roaring20sColor.jsx", "client:component-export": "default", "data-astro-cid-4p6tw367": true })} </div> </div> <!-- Spacer pushes the footer down on landing page --> <div class="h-12 md:h-20" data-astro-cid-4p6tw367></div> ${renderComponent($$result2, "Footer", $$Footer, { "data-astro-cid-4p6tw367": true })} </section>  ${renderScript($$result2, "C:/Users/Wayne/Documents/GitHub/K4-Studios/src/components/GalleryShell-Roaring20s-Color.astro?astro&type=script&index=0&lang.ts")}   ${renderScript($$result2, "C:/Users/Wayne/Documents/GitHub/K4-Studios/src/components/GalleryShell-Roaring20s-Color.astro?astro&type=script&index=1&lang.ts")} ` })}`;
}, "C:/Users/Wayne/Documents/GitHub/K4-Studios/src/components/GalleryShell-Roaring20s-Color.astro", void 0);

const entranceData = {
  title: "Roaring 20s Art Prints by Wayne Heim – Painterly Fine Art Photography in Color",
  subtitle: "Reliving America’s Defining Conflict Through Painterly Photography",
  description: "Explore vivid and emotional Roaring 20s art prints that blend historical accuracy with painterly expression. Wayne Heim’s color portraits of Roaring 20s reenactors are crafted with a fine art touch — turning battlefield moments and solemn reflections into collectible photographic artwork.",
  details: "Roaring 20s art prints, Roaring 20s photography, and historical reenactment portraits captured in vivid painterly color. These fine art photographs feature Roaring 20s reenactors, Union and Confederate soldier portraits, and historically inspired wall art for collectors, interior designers, and history enthusiasts. Ideal for themed home decor, Roaring 20s gifts, and Americana fine art collections. Wayne Heim’s painterly photography technique blends realism with texture — creating museum-quality Roaring 20s portraiture with modern clarity and timeless appeal.",
  image: {
    src: "https://photos.smugmug.com/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Color/i-8zkKqtg/0/LrsP2CGWPpdRwGbGNVSGcHp5ZCCK9LFPzBrVpVfcX/S/12x18_O1H0006-Edit-2-Edit-S.jpg",
    alt: "Painterly Roaring 20s reenactor standing guard in color",
    caption: '"Make It Shine"'
  },
  breadcrumb: "Roaring 20s Portraits | Color"
};

export { $$GalleryShellRoaring20SColor as $, entranceData as e };
