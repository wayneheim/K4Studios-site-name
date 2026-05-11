import React, { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { siteNav } from "../data/siteNav.ts";
import { handleGalleryNavClick } from "../utils/prefetchGallery.ts";
import "../styles/siteNavMenu.css";

export default function SiteNavMenuHome({ forceMobile = false }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobileViewport(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const closeMobileMenu = () => {
    setMobileOpen(false);
    document.body.classList.remove("mobile-open");
    document.body.style.overflow = "";
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    document.body.classList.toggle("mobile-open", mobileOpen);
    if (!mobileOpen) setResetSignal((n) => n + 1);
  }, [mobileOpen]);

  useEffect(() => {
    if (typeof window === "undefined" || forceMobile) return;
    const nav = document.querySelector(".nav-bar");
    if (!nav) return;
    const parents = nav.querySelectorAll(".has-dropdown");

    const onEnter = (e) => {
      const panel = e.currentTarget.querySelector(
        ":scope > .submenu, :scope > .dropdown-panel"
      );
      if (!panel) return;
      panel.classList.remove("open-left", "open-right");
      const { style } = panel;
      const v = style.visibility;
      const d = style.display;
      style.visibility = "hidden";
      style.display = "block";
      requestAnimationFrame(() => {
        const rect = panel.getBoundingClientRect();
        style.visibility = v;
        style.display = d;
        const overR = rect.right > window.innerWidth;
        const overL = rect.left < 0;
        if (overR && !overL) panel.classList.add("open-left");
        else if (overL && !overR) panel.classList.add("open-right");
        else panel.classList.add("open-right");
      });
    };

    parents.forEach((p) => p.addEventListener("mouseenter", onEnter));
    return () => parents.forEach((p) => p.removeEventListener("mouseenter", onEnter));
  }, [forceMobile]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      if (window.innerWidth > 768) closeMobileMenu();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function MenuBranch({ node, depth = 0, delay = 0, reset, forceMobile = false, mounted = false, isMobileViewport = false }) {
    const [expanded, setExpanded] = useState(false);
    const hasKids = node.children?.length > 0;

    useEffect(() => setExpanded(false), [reset]);

    const isMobileView = () =>
      mounted && (forceMobile || isMobileViewport || mobileOpen);

    const handleClick = (e) => {
      if (isMobileView() && hasKids) {
        e.preventDefault();
        setExpanded((x) => !x);
      }
    };

    const handleToggle = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setExpanded((x) => !x);
    };

    const getLeafLabel = () => {
      const lower = (node.label || "").toLowerCase();
      if (lower === "color") return "Color Gallery";
      if (lower === "black & white" || lower === "b&w") return "Black & White Gallery";
      return node.label;
    };

    return (
      <div
        className={`nav-item${hasKids ? " has-dropdown" : ""}${expanded ? " expanded" : ""}`}
        style={{ animationDelay: `${0.1 + delay}s` }}
      >
        <div className="menu-row" style={{ display: "flex", alignItems: "center" }}>
          {hasKids && isMobileView() && (
            <button
              className={`mini-ham-icon hover-collapse mobile-only${expanded ? " rotated" : ""}`}
              onClick={handleToggle}
              aria-label="Toggle Submenu"
              style={{ marginRight: "0.5rem" }}
            >
              <span className="bar top" />
              <span className="bar mid" />
              <span className="bar bot" />
            </button>
          )}

          {!hasKids && (
            <span
              className="leaf-prefix"
              style={{ marginRight: "0.3rem" }}
              aria-hidden="true"
              role="presentation"
            >
              {"\u25CB"}
            </span>
          )}

          <a
            href={node.href || "#"}
            className={depth ? "menu-link has-expand" : "nav-link has-expand"}
            title={!hasKids ? getLeafLabel() : node.label}
            aria-label={!hasKids ? getLeafLabel() : node.label}
            {...(node.external ? { target: "_blank", rel: "nofollow noopener noreferrer" } : {})}
            onClick={isMobileView() && hasKids ? handleClick : (node.type === "gallery-source" ? (e) => {
              e.preventDefault();
              handleGalleryNavClick(node.href);
            } : undefined)}
          >
            {!hasKids ? getLeafLabel() : node.label}
          </a>

          {isMobileView() && (
            <a
              href={node.href || "#"}
              className="mobile-nav-arrow"
              aria-label={`Go to ${node.label}`}
              onClick={node.type === "gallery-source" ? (e) => {
                e.preventDefault();
                handleGalleryNavClick(node.href);
              } : undefined}
              style={{
                marginLeft: "auto",
                padding: "0.25rem 0.5rem",
                display: "flex",
                alignItems: "center",
                color: "#8b7355",
                opacity: 0.6,
                transition: "opacity 0.2s ease"
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
              onMouseLeave={(e) => e.currentTarget.style.opacity = 0.6}
            >
              <ChevronRight size={20} />
            </a>
          )}
        </div>

        {hasKids && (
          <div
            className={depth === 0 ? "dropdown-panel" : "submenu"}
            data-depth={depth}
            style={{ zIndex: 1000 + depth * 5 }}
          >
            {node.children.map((kid) => (
              <MenuBranch
                key={kid.label}
                node={kid}
                depth={depth + 1}
                delay={delay}
                reset={reset}
                forceMobile={forceMobile}
                mounted={mounted}
                isMobileViewport={isMobileViewport}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div role="banner" className="nav-wrapper">
      {mobileOpen && <div className="nav-backdrop" onClick={closeMobileMenu} />}

      <div className="topbar-inner">
        {!mobileOpen && (
          <button
            className="hamburger-circle"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <span className="bar" />
            <span className="bar" />
            <span className="bar" />
          </button>
        )}

        <nav className={`nav-bar ${mobileOpen ? "open" : ""}`}>
          {mobileOpen ? (
            <div className="drawer-container">
              <div
                className="drawer-header"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "0.75rem",
                  marginBottom: "0.75rem",
                  padding: "0 0.5rem"
                }}
              >
                <h2
                  style={{
                    fontFamily: "Glegoo, serif",
                    fontSize: "1.1rem",
                    margin: 0,
                    fontWeight: 600,
                    color: "#222",
                  }}
                >
                  <a
                    href="/"
                    aria-label="K4 Studios homepage"
                    title="Home"
                    style={{
                      color: "inherit",
                      textDecoration: "none",
                      display: "inline-block",
                    }}
                    onClick={closeMobileMenu}
                  >
                    K4 Studios
                  </a>
                </h2>

                <button
                  onClick={closeMobileMenu}
                  style={{
                    fontSize: "0.65rem",
                    padding: "0.15rem 0.45rem",
                    background: "#888",
                    color: "#fff",
                    border: "none",
                    borderRadius: "3px",
                    cursor: "pointer",
                    fontFamily: "Glegoo, serif",
                  }}
                >
                  Close
                </button>
              </div>

              <div className="drawer-body">
                {siteNav
                  .filter((n) => !n.hidden)
                  .map((root, i) => (
                    <MenuBranch
                      key={root.label}
                      node={root}
                      delay={i * 0.1}
                      reset={resetSignal}
                      forceMobile={forceMobile}
                      mounted={mounted}
                      isMobileViewport={isMobileViewport}
                    />
                  ))}
              </div>

              <a href="/" aria-label="K4 Studios Home" className="k4-logo-hover">
                <img
                  src="/images/K4Logo-web-c.webp"
                  alt="K4 Studios Logo"
                  className="k4-watermark-opacity"
                />
                <span className="visually-hidden">K4 Studios Home â€“ Fine Art Photography</span>
              </a>
            </div>
          ) : (
            siteNav
              .filter((n) => !n.hidden)
              .map((root, i) => (
                <MenuBranch
                  key={root.label}
                  node={root}
                  delay={i * 0.1}
                  reset={resetSignal}
                  forceMobile={forceMobile}
                  mounted={mounted}
                  isMobileViewport={isMobileViewport}
                />
              ))
          )}
        </nav>
      </div>
    </div>
  );
}
