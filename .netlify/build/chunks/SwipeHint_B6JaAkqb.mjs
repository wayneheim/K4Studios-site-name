import { jsxs, jsx, Fragment } from 'react/jsx-runtime';
import { useState, useEffect, useRef } from 'react';
import { s as siteNav, S as SiteNavMenu } from './Footer_VeJuj4uH.mjs';
import { motion } from 'framer-motion';
/* empty css                        */
import { createPortal } from 'react-dom';
import { Hand } from 'lucide-react';

function normalize(path) {
  return path.replace(/\/+$/, "").toLowerCase();
}
function findSiblingGalleries(pathname) {
  const target = normalize(pathname);
  function findInNav(items) {
    for (const item of items) {
      if (item.href && normalize(item.href) === target) return null;
      if (item.children) {
        const match = item.children.find((child) => normalize(child.href) === target);
        if (match) return item.children;
        const deeper = findInNav(item.children);
        if (deeper) return deeper;
      }
    }
    return null;
  }
  return findInNav(siteNav);
}
function GalleryToggleButton({ currentPath }) {
  const [isMobile, setIsMobile] = useState(false);
  const [hoveringOther, setHoveringOther] = useState(false);
  useEffect(() => {
    console.log("🟢 GalleryToggleButton mounted");
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);
  console.log("🟡 currentPath:", currentPath);
  const siblings = findSiblingGalleries(currentPath);
  console.log("🧩 siblings found:", siblings?.map((s) => s.href));
  if (!siblings || siblings.length < 2) return null;
  return /* @__PURE__ */ jsxs("div", { className: "gallery-toggle", children: [
    siblings.filter((s) => !isMobile || s.href !== currentPath).map((sibling) => {
      const isActive = normalize(sibling.href) === normalize(currentPath);
      const labelChar = sibling.label === "Color" ? "C" : sibling.label === "Black & White" ? "B" : sibling.label;
      return /* @__PURE__ */ jsx(
        "a",
        {
          href: sibling.href,
          className: `toggle-pill ${isActive ? "active" : ""} ${isActive && hoveringOther ? "active-fade" : ""}`,
          title: `View ${sibling.label} Gallery`,
          onMouseEnter: () => {
            if (!isActive) setHoveringOther(true);
          },
          onMouseLeave: () => {
            if (!isActive) setHoveringOther(false);
          },
          children: labelChar
        },
        sibling.href
      );
    }),
    /* @__PURE__ */ jsx("style", { jsx: true, children: `
        .gallery-toggle {
          margin-left: 0.75rem;
          display: inline-flex;
          gap: 0.35rem;
          z-index: 5;
          min-width: 50px;
          justify-content: center;
        }

        .toggle-pill {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          font-size: 0.75rem;
          font-weight: 600;
          background: transparent;
          border: 1.8px solid #c5bdbb;
          color: #c5bdbb;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          cursor: pointer;
          padding-top: 1px;
        }

        .toggle-pill:hover {
          background: #e3dad4;
          color: #000;
          transform: translateY(1px);
        }

        .toggle-pill.active {
          background: #c5bdbb;
          color: #000;
          pointer-events: none;
        }

        .toggle-pill.active.active-fade {
          background: transparent;
          color: #c5bdbb;
        }
      ` })
  ] });
}

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return mobile;
}
function GalleryLandingHeader({ breadcrumb }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pathname, setPathname] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") {
      setPathname(window.location.pathname);
    }
  }, []);
  return /* @__PURE__ */ jsxs(
    "header",
    {
      className: `landing-header ${useIsMobile() ? "mobile-animate" : ""}`,
      style: { position: "relative", zIndex: 100 },
      children: [
        /* @__PURE__ */ jsxs("div", { className: "breadcrumb-toggle-wrapper desktop-only", children: [
          /* @__PURE__ */ jsx("div", { className: "breadcrumb-overlay", children: breadcrumb }),
          pathname && /* @__PURE__ */ jsx(GalleryToggleButton, { currentPath: pathname })
        ] }),
        /* @__PURE__ */ jsx("a", { href: "/", className: "logo-slot", children: /* @__PURE__ */ jsx(
          "img",
          {
            src: "/images/K4Logo-web.jpg",
            alt: "K4 Studios Logo",
            className: "logo-img"
          }
        ) }),
        /* @__PURE__ */ jsx("div", { className: "rhs", children: /* @__PURE__ */ jsx(SiteNavMenu, { mobileOpen, setMobileOpen }) }),
        /* @__PURE__ */ jsx(
          "a",
          {
            href: "mailto:wayne@k4studios.com",
            className: "wh-logo-mobile",
            "aria-label": "Email Wayne Heim",
            children: /* @__PURE__ */ jsx("img", { src: "/images/WH.png", alt: "Contact", style: { filter: "invert(100%)" } })
          }
        ),
        /* @__PURE__ */ jsx("div", { className: "mobile-breadcrumb-wrapper mobile-only", children: /* @__PURE__ */ jsxs(
          "div",
          {
            className: "mobile-breadcrumb",
            style: {
              color: "#c2c2c2",
              marginTop: "105px",
              fontWeight: 600,
              fontSize: ".85rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.125rem",
              textAlign: "center"
            },
            children: [
              /* @__PURE__ */ jsx("span", { children: breadcrumb }),
              pathname && /* @__PURE__ */ jsx(GalleryToggleButton, { currentPath: pathname })
            ]
          }
        ) }),
        /* @__PURE__ */ jsx("style", { jsx: true, children: `

.breadcrumb-toggle-wrapper {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding-right: 0.5rem;
  margin-top: 2px;
  font-size: 1.1rem;
}

.gallery-toggle-button {
  display: flex;
  gap: 0.5rem;
}

.gallery-toggle-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.65rem;
  height: 1.65rem;
  border-radius: 50%;
  font-size: 0.85rem;
  font-weight: 600;
  color: #f0f0f0;
  border: 1px solid rgba(255, 255, 255, 0.35);
  background: transparent;
  cursor: pointer;
  transition: all 0.25s ease;
}

.gallery-toggle-pill:hover {
  transform: scale(1.05);
  background-color: rgba(255, 255, 255, 0.1);
}

.gallery-toggle-pill.active {
  background-color: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
}



.k4-watermark {
border: none!important;

}

      /* ─── Mobile entrance animation for the stripes ─── */
@keyframes slideFromLeft  { from { transform: translateX(-100%); } to { transform: translateX(0); } }
@keyframes slideFromRight { from { transform: translateX(100%);  } to { transform: translateX(0); } }

@media (max-width: 768px) {
  /* only run once per page-load */
  .mobile-animate::before,
  .mobile-animate::after {
    animation-duration: .7s;
    animation-timing-function: cubic-bezier(.33,1,.68,1);
    animation-fill-mode: forwards;
  }
  .mobile-animate::before {             /* top stripe → from left */
    transform: translateX(-100%);
    animation-name: slideFromLeft;
  }
  .mobile-animate::after {              /* bottom stripe → from right */
    transform: translateX(100%);
    animation-name: slideFromRight;
  }
}


      
        @import url("https://fonts.googleapis.com/css2?family=Glegoo&display=swap");

        :root {
          --dark-brown: rgb(122, 102, 94);
          --stripe-color: rgb(180, 168, 162);
        }




        
        .landing-header {
          margin-top: 1rem;
          font-family: "Glegoo", serif;
          font-size: 1.15rem;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 0.75rem;
          line-height: 1.4; 
          letter-spacing: -0.02em;  
          padding-left: 3.5rem;
          height: 60px;
            color: white;
            background: rgb(73, 62, 58);
          border-top: 3px solid var(--dark-brown);
          border-bottom: 3px solid var(--dark-brown);
          z-index: 100;
        }

        /* stripe background behind logo */
        .landing-header::before,
        .landing-header::after {
          content: "";
          position: absolute;
          top: 0;
          bottom: 0;
          background-image: repeating-linear-gradient(
            to bottom,
            var(--stripe-color) 0 2px,
            transparent 2px 6px
          );
          opacity: 0.8;
          z-index: 0;
        }
        .landing-header::before {
          left: 0;
          right: 50%;
          margin-right: -30px;
          mask-image: linear-gradient(
            to right,
            transparent 40%,
            #000 85%,
            #000 100%
          );
        }
        .landing-header::after {
          left: 50%;
          right: 0;
          margin-left: -30px;
          mask-image: linear-gradient(
            to left,
            transparent 10%,
            transparent 40%,
            #000 85%,
            #000 100%
          );
        }

        /* breadcrumb */
        .breadcrumb-text {
        top: 5.3rem;
          font-size: 1.15rem;
          color:rgb(233, 233, 233);
          white-space: nowrap;
          z-index: 300;
        }

        /* logo badge */
        .logo-slot {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          top: -17px;
          width: 85px;
          height: 85px;
          background: #000;
          border: 5px solid #fff;
          box-shadow: 0 6px 8px rgba(0, 0, 0, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1;
        }
        .logo-img {
          height: 100%;
          object-fit: contain;
          filter: grayscale(100%);
          opacity: 0.9;
          transition: filter 0.3s, opacity 0.3s;
        }
        .logo-slot:hover {
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4),
            0 0 12px rgba(160, 82, 45, 0.6);
        }
        .logo-slot:hover .logo-img {
          filter: grayscale(20%);
          opacity: 1;
        }

        /* Right-hand side wrapper so nav stays right-aligned */
        .rhs {
          display: flex;
          align-items: center;
          z-index: 3; /* above stripes */
        }

        /* Hide breadcrumb & stripes tweak on tablet/mobile */
        @media (max-width: 1024px) {
        
          .desktop-only {
            display: none;
          }
          .landing-header::before,
          .landing-header::after {
            transform: scaleX(0.76);
            transform-origin: center;
            opacity: 0.25;
          }
        }

        body.mobile-open .logo-slot {
        margin-top: 30px;
        margin-left: -8px;
      
  z-index: 1 !important;  /* lower than drawer z-index 2001 */
  position: relative;
}

.wh-logo-mobile {
  position: absolute;
  right: 4.25%;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.2;
  z-index: 10;
  display: none; /* Default hidden (desktop) */
  align-items: center;
  justify-content: center;
}

.wh-logo-mobile img {
  height: 25px;
  width: auto;
  filter: grayscale(100%);
  transition: opacity 0.3s ease;
}

.wh-logo-mobile:hover {
  opacity: 0.45;
}

@media (max-width: 1024px) {
  .wh-logo-mobile {
    display: inline-flex;
  }
}

  .hamburger-circle {
     border: 2px solid rgb(190, 177, 172);
     }

      .hamburger-circle .bar {
          background:  rgb(190, 177, 172);
        }

      ` })
      ]
    }
  );
}

function GalleryInfo({ entranceData }) {
  function handleExploreClick() {
    const header = document.getElementById("header-section");
    const intro = document.getElementById("intro-section");
    const chapter = document.getElementById("chapter-section");
    const navToggle = document.getElementById("nav-toggle");
    const topSpacer = document.getElementById("top-spacer");
    if (intro) intro.classList.add("slide-fade-out");
    if (header) header.classList.add("slide-fade-out");
    setTimeout(() => {
      if (header) header.classList.add("section-hidden");
      if (intro) {
        intro.classList.add("section-hidden");
        intro.classList.remove("slide-fade-out");
      }
      if (chapter) {
        chapter.style.display = "block";
        void chapter.offsetWidth;
        chapter.classList.remove("section-hidden");
        chapter.classList.add("section-visible", "slide-fade-in");
      }
      if (navToggle) navToggle.classList.remove("hidden");
      if (topSpacer) {
        topSpacer.style.marginTop = "0px";
        topSpacer.style.height = "0px";
        topSpacer.style.overflow = "hidden";
      }
      window.__forceStartAtIndex = 1;
    }, 10);
  }
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs("section", { className: "intro-wrapper", style: { zIndex: 0, position: "relative" }, children: [
      /* @__PURE__ */ jsxs(
        motion.div,
        {
          className: "intro-text",
          initial: { opacity: 0, x: -40 },
          animate: { opacity: 1, x: 0 },
          transition: { duration: 1.2, delay: 0 },
          children: [
            /* @__PURE__ */ jsx("h2", { children: entranceData.title }),
            /* @__PURE__ */ jsx("h3", { children: entranceData.subtitle }),
            /* @__PURE__ */ jsx("p", { children: entranceData.description }),
            entranceData.details && /* @__PURE__ */ jsxs("details", { children: [
              /* @__PURE__ */ jsxs("summary", { children: [
                /* @__PURE__ */ jsx("span", { className: "arrow-icon", children: "▶" }),
                " More…"
              ] }),
              /* @__PURE__ */ jsx("p", { className: "mt-2 text-base", children: entranceData.details })
            ] })
          ]
        }
      ),
      /* @__PURE__ */ jsx(
        motion.div,
        {
          className: "intro-image",
          style: { zIndex: 0, position: "relative" },
          initial: { opacity: 0, x: 50 },
          animate: { opacity: 1, x: 0 },
          transition: { duration: 1.2, ease: [0.33, 1, 0.68, 1] },
          children: entranceData.image && /* @__PURE__ */ jsxs("figure", { children: [
            /* @__PURE__ */ jsx(
              "img",
              {
                src: entranceData.image.src,
                alt: entranceData.image.alt || "Portrait preview",
                style: {
                  maxWidth: "100%",
                  borderRadius: "9px",
                  boxShadow: "0 8px 32px #0002",
                  border: "2px solid #ddd"
                  // <-- soft gray border
                }
              }
            ),
            /* @__PURE__ */ jsx("figcaption", { children: entranceData.image.caption })
          ] })
        }
      )
    ] }),
    /* @__PURE__ */ jsxs(
      motion.div,
      {
        className: "explore-section explore-button",
        role: "button",
        tabIndex: 0,
        onClick: () => {
          window.dispatchEvent(new CustomEvent("enterChapters"));
          handleExploreClick();
        },
        initial: { opacity: 0, y: 30 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 1.2, delay: 0, ease: [0.33, 1, 0.68, 1] },
        children: [
          "Explore the Gallery ",
          /* @__PURE__ */ jsx("span", { style: { fontSize: "1.8rem", verticalAlign: "middle" }, children: "→" }),
          /* @__PURE__ */ jsx("div", { className: "divider", children: /* @__PURE__ */ jsx("span", { style: { fontSize: "1.5rem" }, children: "◆" }) })
        ]
      }
    )
  ] });
}

function ZoomOverlay({ onClose, imageData, matColor, setMatColor }) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 600);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);
  useEffect(() => {
    setMatColor("no-wood");
    document.body.classList.add("zoom-open");
    return () => document.body.classList.remove("zoom-open");
  }, []);
  if (!imageData) return null;
  const frame = {
    background: matColor === "white" ? "#ffffff" : matColor === "white2" ? "#9e9d9d" : matColor === "white3" ? "#000000" : matColor === "wood" ? "url('/images/materials/Maple-w.jpg') center / cover no-repeat" : matColor === "no-wood" ? "url('/images/materials/White-w.jpg') center / cover no-repeat" : matColor === "gray" ? "#888888" : matColor === "black" ? "#000000" : "transparent",
    border: matColor === "white" ? "0vw solid white" : matColor === "white2" ? "0vw solid white" : matColor === "white3" ? "0vw solid white" : matColor === "wood" ? "0vw solid #ffffff" : "0vw solid transparent",
    // Responsive padding: smaller on mobile!
    paddingTop: ["white", "white2", "white3", "wood", "no-wood"].includes(matColor) ? isMobile ? "1.85rem" : "calc(1.5rem + 15px)" : isMobile ? "1.85rem" : "1.5rem",
    paddingBottom: isMobile ? ".5rem" : "1.5rem",
    paddingLeft: ["white", "white2", "white3", "wood", "no-wood"].includes(matColor) ? isMobile ? "1.95rem" : "calc(1.5rem + 20px)" : isMobile ? "1.95rem" : "1.5rem",
    paddingRight: ["white", "white2", "white3", "wood", "no-wood"].includes(matColor) ? isMobile ? "1.95rem" : "calc(1.5rem + 20px)" : isMobile ? "1.95rem" : "1.5rem",
    boxShadow: ["white", "white2", "white3", "gray", "black", "wood"].includes(matColor) ? "0 8px 20px rgba(0,0,0,.2)" : "none",
    outline: ["white", "white2", "white3", "gray", "black", "wood"].includes(matColor) ? "1px solid #ccc" : "none",
    transition: "background .25s ease, padding .25s ease",
    display: "inline-block"
  };
  const cutEdge = {
    padding: 6,
    background: matColor === "wood" ? "transparent" : ["white", "white2", "white3", "gray", "black"].includes(matColor) ? "linear-gradient(-40deg,#ffffff,#8d8d8d)" : ["no-wood"].includes(matColor) ? "rgba(255,255,255,0.25)" : "transparent",
    boxShadow: matColor === "wood" ? "none" : ["white", "white2", "white3", "gray", "black"].includes(matColor) ? "inset -1px 1px 1px rgba(255,255,255,.6), inset 6px 10px 14px rgba(0,0,0,0)" : ["no-wood"].includes(matColor) ? "inset -1px 1px 1px rgba(255,255,255,0.25), inset 8px 12px 16px rgba(0,0,0,0)" : "none",
    border: "1px solid transparent",
    transition: "box-shadow .25s ease, background .25s ease"
  };
  const context = matColor === "no-wood" ? "Paper, Aluminum & Acrylic Prints" : ["wood", "no-wood"].includes(matColor) ? "Maple / Baltic-Birch Wood Print" : "Additional Display Ideas";
  return /* @__PURE__ */ jsx(
    "div",
    {
      className: "fixed inset-0 z-[9999] bg-white overflow-y-auto",
      style: { all: "initial", display: "block" },
      onClick: (e) => e.target === e.currentTarget && onClose(),
      children: /* @__PURE__ */ jsx(
        "div",
        {
          style: {
            width: "100%",
            padding: isMobile ? "0 0.3rem" : "0 1rem",
            boxSizing: "border-box",
            display: "flex",
            justifyContent: "center",
            overflowX: "hidden"
          },
          children: /* @__PURE__ */ jsxs("div", { style: { all: "unset", maxWidth: 1100, textAlign: "center" }, children: [
            /* @__PURE__ */ jsxs("div", { style: { ...frame, maxWidth: "calc(100vw - 2rem)", boxSizing: "border-box" }, children: [
              /* @__PURE__ */ jsx("div", { style: cutEdge, children: /* @__PURE__ */ jsx(
                "img",
                {
                  src: imageData.src,
                  alt: imageData.title,
                  style: {
                    maxWidth: "100%",
                    maxHeight: "80vh",
                    objectFit: "contain",
                    display: "block",
                    border: "1px solid #bbb"
                  }
                }
              ) }),
              /* @__PURE__ */ jsx(
                "div",
                {
                  style: {
                    marginTop: 8,
                    marginRight: 12,
                    fontSize: "0.75rem",
                    textAlign: "right",
                    fontFamily: "'Glegoo', serif",
                    opacity: ["black", "white3"].includes(matColor?.trim().toLowerCase()) ? 0.58 : 0.46,
                    color: ["black", "white3"].includes(matColor?.trim().toLowerCase()) ? "#fff" : "#2c2c2c"
                  },
                  children: "© Wayne Heim"
                }
              )
            ] }),
            /* @__PURE__ */ jsxs(
              "div",
              {
                style: {
                  marginTop: 22,
                  display: "flex",
                  gap: 14,
                  justifyContent: "center",
                  flexWrap: "wrap",
                  width: "100%"
                },
                children: [
                  /* @__PURE__ */ jsx("button", { title: "Paper", onClick: (e) => {
                    e.stopPropagation();
                    setMatColor("no-wood");
                  }, style: { width: 20, height: 20, border: "1px solid #777", borderRadius: 4, backgroundImage: "url('/images/materials/White-w.jpg')", backgroundSize: "cover", backgroundPosition: "center", cursor: "pointer" } }),
                  /* @__PURE__ */ jsx("button", { title: "Wood print", onClick: (e) => {
                    e.stopPropagation();
                    setMatColor("wood");
                  }, style: { width: 20, height: 20, border: "1px solid #777", borderRadius: 4, backgroundImage: "url('/images/materials/Maple-w.jpg')", backgroundSize: "cover", backgroundPosition: "center", cursor: "pointer" } }),
                  [
                    ["white", "#ffffff"],
                    ["white2", "#9e9d9d"],
                    ["white3", "#000000"]
                  ].map(([key, bg]) => /* @__PURE__ */ jsx("button", { title: `${key} mat`, onClick: (e) => {
                    e.stopPropagation();
                    setMatColor(key);
                  }, style: { width: 20, height: 20, border: "1px solid #777", borderRadius: "50%", background: bg, cursor: "pointer" } }, key)),
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      onClick: onClose,
                      style: {
                        padding: "0.005rem .5rem",
                        border: "1px solid #ccc",
                        marginTop: -2,
                        borderRadius: 8,
                        fontFamily: "'Glegoo', serif",
                        background: "#f5f5f5",
                        fontSize: "0.8rem",
                        cursor: "pointer"
                      },
                      children: "Exit"
                    }
                  )
                ]
              }
            ),
            /* @__PURE__ */ jsx(
              "p",
              {
                style: {
                  marginTop: 7,
                  fontSize: "0.8rem",
                  color: "#555",
                  opacity: 0.5,
                  fontFamily: "'Glegoo', serif",
                  fontStyle: "italic"
                },
                children: context
              }
            )
          ] })
        }
      )
    }
  );
}

const BATCH_SIZES = { 1: 25, 2: 24, 3: 30 };
function getColCount() {
  if (typeof window !== "undefined") {
    if (window.innerWidth < 640) return 1;
    if (window.innerWidth < 1024) return 2;
    return 3;
  }
  return 3;
}
const cardVariants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: (i) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: i * 0.08,
      duration: 0.9,
      ease: [0.33, 1, 0.68, 1]
    }
  })
};
function RebuiltScrollGrid({
  galleryData,
  onCardClick,
  initialImageIndex = 0,
  galleryKey = "default"
}) {
  const [colCount, setColCount] = useState(getColCount());
  const [simIndex, setSimIndex] = useState(initialImageIndex);
  const [anchorOnNextUpdate, setAnchorOnNextUpdate] = useState(true);
  const [pendingPrepend, setPendingPrepend] = useState(false);
  const rowRefs = useRef({});
  useEffect(() => {
    const handleResize = () => setColCount(getColCount());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const paddingTop = colCount * 5;
  const paddingBottom = colCount * 8;
  const start = Math.max(0, simIndex - paddingTop);
  const end = Math.min(galleryData.length, simIndex + paddingBottom);
  const visibleData = galleryData.slice(start, end);
  useEffect(() => {
    if (!pendingPrepend) return;
    const anchorRowIndex = Math.floor((start + paddingTop) / colCount);
    const anchor = rowRefs.current[`row-${anchorRowIndex}`];
    if (anchor) {
      const anchorRect = anchor.getBoundingClientRect();
      window.scrollBy({ top: anchorRect.top - 80, behavior: "instant" });
    }
    setPendingPrepend(false);
  }, [start, colCount, pendingPrepend]);
  useEffect(() => {
    if (!anchorOnNextUpdate) return;
    const rowIndex = Math.floor(simIndex / colCount);
    if (rowIndex === 0) {
      setAnchorOnNextUpdate(false);
      return;
    }
    const anchor = rowRefs.current[`row-${rowIndex}`];
    if (anchor) {
      requestAnimationFrame(() => {
        setTimeout(() => {
          anchor.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 0);
      });
    }
    setAnchorOnNextUpdate(false);
  }, [colCount, simIndex, anchorOnNextUpdate]);
  useEffect(() => {
    const preloadStart = end;
    const preloadEnd = Math.min(preloadStart + BATCH_SIZES[colCount], galleryData.length);
    galleryData.slice(preloadStart, preloadEnd).forEach((entry) => {
      if (entry?.src) {
        const img = new window.Image();
        img.src = entry.src;
      }
    });
  }, [end, colCount, galleryData]);
  useEffect(() => {
    const preloadStart = Math.max(0, start - BATCH_SIZES[colCount]);
    const preloadEnd = start;
    galleryData.slice(preloadStart, preloadEnd).forEach((entry) => {
      if (entry?.src) {
        const img = new window.Image();
        img.src = entry.src;
      }
    });
  }, [start, colCount, galleryData]);
  return /* @__PURE__ */ jsxs("section", { className: "bg-white py-10 px-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "chapter-title-block mb-[-3rem] z-20 relative flex items-center justify-center gap-4", children: [
      /* @__PURE__ */ jsx("div", { className: "fade-line" }),
      /* @__PURE__ */ jsx("h2", { className: "watermark-title whitespace-nowrap", style: { marginBottom: "1.5rem" }, children: "Chapter Index" }),
      /* @__PURE__ */ jsx("div", { className: "fade-line" })
    ] }),
    start > 0 && /* @__PURE__ */ jsx("div", { className: "flex justify-center mb-8", children: /* @__PURE__ */ jsx(
      "button",
      {
        className: "px-6 py-2 bg-[#ece4d7] rounded-full border border-gray-300 font-medium text-sm hover:bg-[#f8e8d7] shadow-md transition",
        onClick: () => {
          setSimIndex(start);
          setAnchorOnNextUpdate(false);
          setPendingPrepend(true);
        },
        children: "Show Previous"
      }
    ) }),
    /* @__PURE__ */ jsx(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
          gap: "2rem"
        },
        children: visibleData.map((entry, i) => {
          const globalIndex = start + i;
          const rowIndex = Math.floor(globalIndex / colCount);
          const rowAnchor = globalIndex % colCount === 0;
          return entry?.src && entry?.title ? /* @__PURE__ */ jsxs(
            motion.div,
            {
              ref: (el) => rowAnchor && (rowRefs.current[`row-${rowIndex}`] = el),
              variants: cardVariants,
              initial: "hidden",
              animate: "visible",
              custom: i,
              onClick: () => onCardClick?.(globalIndex),
              className: "rounded-xl border border-gray-300 p-4 hover:shadow-md cursor-pointer flex flex-col will-change-transform",
              style: { backgroundColor: "#f7f3eb" },
              children: [
                /* @__PURE__ */ jsxs("div", { className: "aspect-[4/5] bg-[#eae6df] rounded-sm overflow-hidden relative", children: [
                  /* @__PURE__ */ jsx(
                    "div",
                    {
                      className: "absolute inset-0 rounded-sm pointer-events-none",
                      style: {
                        boxShadow: `
                      inset 2px 0 3px rgba(75,75,75,.4),
                      inset -2px 0 3px rgba(236,236,236,.68),
                      inset 0 2px 3px rgba(77,77,77,.4),
                      inset 0 -3px 4px rgba(255,255,255,.81)
                    `
                      }
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "img",
                    {
                      src: entry.src,
                      alt: entry.title,
                      className: "w-full h-full object-cover rounded-sm border-2 border-gray-400",
                      style: { minHeight: 120 },
                      onError: (e) => {
                        e.target.style.opacity = 0.25;
                      }
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxs(
                  motion.div,
                  {
                    initial: { opacity: 0 },
                    animate: { opacity: 1 },
                    transition: { delay: 0.5, duration: 0.4, ease: "easeOut" },
                    className: "h-[3.25rem] mt-4 flex flex-col items-center justify-center",
                    children: [
                      /* @__PURE__ */ jsx("div", { className: "text-lg sm:text-lg font-semibold text-center text-warm-fade", children: `Chapter ${globalIndex + 1}:` }),
                      /* @__PURE__ */ jsxs("h3", { className: "text-sm sm:text-base font-semibold text-center text-warm-fade", children: [
                        '"',
                        entry.title,
                        '"'
                      ] })
                    ]
                  }
                )
              ]
            },
            globalIndex
          ) : /* @__PURE__ */ jsxs(
            "div",
            {
              style: {
                border: "2px solid red",
                background: "#fee",
                minHeight: 180,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                borderRadius: 12,
                fontWeight: 700
              },
              children: [
                "MISSING DATA AT INDEX ",
                globalIndex
              ]
            },
            globalIndex
          );
        })
      }
    ),
    end < galleryData.length && /* @__PURE__ */ jsx("div", { className: "flex justify-center mt-8", children: /* @__PURE__ */ jsx(
      "button",
      {
        className: "px-6 py-2 bg-[#ece4d7] rounded-full border border-gray-300 font-medium text-sm hover:bg-[#f8e8d7] shadow-md transition",
        onClick: () => {
          setSimIndex(end - 1);
          setAnchorOnNextUpdate(true);
        },
        children: "Show More"
      }
    ) })
  ] });
}

function MenuBranch({
  node,
  depth,
  reset,
  forceMobile = false,
  index = 0
}) {
  const [expanded, setExpanded] = useState(false);
  const hasKids = Array.isArray(node.children) && node.children.length > 0;
  useEffect(() => {
    setExpanded(false);
  }, [reset]);
  const toggle = (e) => {
    e.preventDefault();
    if (hasKids) setExpanded((prev) => !prev);
  };
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: `nav-item mini-nav-item depth-${depth}${expanded ? " open" : ""}`,
      style: { animationDelay: `${index * 0.05}s` },
      children: [
        /* @__PURE__ */ jsxs("div", { className: `mini-menu-row${hasKids ? " has-ham" : " no-ham"}`, children: [
          hasKids ? /* @__PURE__ */ jsxs(
            "button",
            {
              className: `mini-ham-icon hover-collapse${expanded ? " rotated" : ""}`,
              onClick: toggle,
              "aria-label": "Toggle Submenu",
              children: [
                /* @__PURE__ */ jsx("span", { className: "bar top" }),
                /* @__PURE__ */ jsx("span", { className: "bar mid" }),
                /* @__PURE__ */ jsx("span", { className: "bar bot" })
              ]
            }
          ) : /* @__PURE__ */ jsx(
            "a",
            {
              href: node.href || "#",
              className: "mini-placeholder-dot",
              "aria-label": `Visit ${node.label}`
            }
          ),
          /* @__PURE__ */ jsxs(
            "a",
            {
              href: node.href || "#",
              className: `mini-menu-link${hasKids ? " has-children" : ""}`,
              children: [
                " ",
                node.label
              ]
            }
          )
        ] }),
        hasKids && expanded && /* @__PURE__ */ jsx("div", { className: "mini-submenu", children: node.children.map((child, i) => /* @__PURE__ */ jsx(
          MenuBranch,
          {
            node: child,
            depth: depth + 1,
            reset,
            index: i
          },
          child.label
        )) })
      ]
    }
  );
}

function MobileMiniDrawer({ onClose }) {
  const [mounted, setMounted] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setMounted(true);
    setResetSignal((n) => n + 1);
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      setMounted(false);
      window.removeEventListener("resize", handleResize);
    };
  }, []);
  const drawer = /* @__PURE__ */ jsx("div", { className: "mini-drawer-portal", children: /* @__PURE__ */ jsxs(
    "div",
    {
      className: `drawer-container ${isMobile ? "force-mobile-menu" : ""}`,
      style: {
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 9999,
        width: "100%",
        height: "100vh",
        background: "#fff",
        overflowY: "auto",
        padding: "2rem"
      },
      children: [
        /* @__PURE__ */ jsxs(
          "div",
          {
            className: "mini-drawer-header",
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.25rem"
            },
            children: [
              /* @__PURE__ */ jsx(
                "h2",
                {
                  className: "mini-logo",
                  style: {
                    fontFamily: "Glegoo, serif",
                    fontSize: "1.4rem",
                    margin: 0,
                    fontWeight: 600,
                    color: "#222"
                  },
                  children: "K4 Studios"
                }
              ),
              /* @__PURE__ */ jsx(
                "button",
                {
                  className: "mini-close-btn",
                  onClick: onClose,
                  style: {
                    fontSize: "0.85rem",
                    padding: "0.35rem 0.75rem",
                    background: "#444",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontFamily: "Glegoo, serif"
                  },
                  children: "Close"
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ jsx("div", { className: "mini-drawer-nav", children: siteNav.map((node, i) => /* @__PURE__ */ jsx(
          MenuBranch,
          {
            node,
            depth: 0,
            reset: resetSignal,
            index: i,
            forceMobile: true,
            showHammy: true
          },
          node.label
        )) }),
        /* @__PURE__ */ jsx(
          "div",
          {
            style: {
              marginTop: "3rem",
              display: "flex",
              justifyContent: "center",
              alignItems: "center"
            },
            children: /* @__PURE__ */ jsx(
              "img",
              {
                src: "/images/K4Logo-web-c.png",
                alt: "K4 Studios Logo",
                style: {
                  width: "120px",
                  height: "auto",
                  opacity: 0.2,
                  filter: "grayscale(100%)"
                }
              }
            )
          }
        )
      ]
    }
  ) });
  return mounted ? createPortal(drawer, document.body) : null;
}

function SwipeHint({ galleryKey = "default" }) {
  const [showHint, setShowHint] = useState(false);
  useEffect(() => {
    const isMobile = window.innerWidth <= 768;
    const sessionKey = `swipeHint-${galleryKey}`;
    const maxViews = 3;
    const cooldownMs = 10 * 60 * 1e3;
    if (!isMobile) return;
    const now = Date.now();
    let hintData = {
      count: 0,
      lastShown: 0
    };
    try {
      const stored = sessionStorage.getItem(sessionKey);
      if (stored) {
        hintData = JSON.parse(stored);
      }
    } catch (e) {
      console.warn("SwipeHint: Failed to parse sessionStorage", e);
    }
    const timeSinceLast = now - hintData.lastShown;
    if (hintData.count < maxViews || timeSinceLast > cooldownMs) {
      const delay = setTimeout(() => {
        setShowHint(true);
        const hideTimer = setTimeout(() => {
          setShowHint(false);
          const newData = {
            count: hintData.count + 1,
            lastShown: Date.now()
          };
          sessionStorage.setItem(sessionKey, JSON.stringify(newData));
        }, 4e3);
        return () => clearTimeout(hideTimer);
      }, 1100);
      return () => clearTimeout(delay);
    }
  }, [galleryKey]);
  if (!showHint) return null;
  return /* @__PURE__ */ jsxs(
    motion.div,
    {
      className: "swipe-hint-overlay",
      initial: { opacity: 0, y: 30 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0 },
      transition: { duration: 0.6 },
      children: [
        /* @__PURE__ */ jsx(
          motion.div,
          {
            className: "swipe-hand",
            animate: { x: [0, 12, 0] },
            transition: {
              repeat: Infinity,
              duration: 1.2,
              ease: "easeInOut"
            },
            children: /* @__PURE__ */ jsx(Hand, { size: 24 })
          }
        ),
        /* @__PURE__ */ jsx("span", { className: "swipe-label", children: "Swipe" })
      ]
    }
  );
}

export { GalleryLandingHeader as G, MobileMiniDrawer as M, RebuiltScrollGrid as R, SwipeHint as S, ZoomOverlay as Z, GalleryInfo as a };
