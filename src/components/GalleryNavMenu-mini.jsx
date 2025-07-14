/* ───────── GalleryNavMenu-mini.jsx – unified mobile-first, no breakpoints ───────── */
import React, { useEffect, useState } from "react";
import { siteNav } from "../data/siteNav.ts";
import "../styles/mini-NavMenu.css";

/* ---------- Recursive branch (drawer subtree) ---------- */
function MenuBranch({ node, depth = 0, delay = 0, reset }) {
  const [expanded, setExpanded] = useState(false);
  const hasKids = node.children?.length > 0;

  /* collapse branch when drawer closes */
  useEffect(() => setExpanded(false), [reset]);

  const handleClick = (e) => {
    /* Always toggle children; no viewport test */
    if (hasKids) {
      e.preventDefault();
      setExpanded((x) => !x);
    }
  };

  return (
    <div
      className={`nav-item${hasKids ? " has-dropdown" : ""}${expanded ? " expanded" : ""}`}
      style={{ animationDelay: `${0.1 + delay}s` }}
    >
      <div className="menu-row">
        <a
          href={node.href || "#"}
          className={depth ? "menu-link has-expand" : "nav-link has-expand"}
          onClick={handleClick}
        >
          {hasKids && (
            <span
              className={`left-icon hamburger-symbol ${expanded ? "open" : ""}`}
              aria-hidden="true"
            >
              ≡
            </span>
          )}
          {node.label}
          {node.href && (
            <span
              className="right-arrow"
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = node.href;
              }}
            >
              ►
            </span>
          )}
        </a>
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
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Root nav component ---------- */
export default function GalleryNavMenuMini({ hideDefaultHamburger = false }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);

  const closeMobileMenu = () => {
    setMobileOpen(false);
    document.body.classList.remove("mobile-open");
    document.body.style.overflow = "";
  };

  /* Body scroll‑lock toggle */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    document.body.classList.toggle("mobile-open", mobileOpen);
    if (!mobileOpen) setResetSignal((n) => n + 1);
  }, [mobileOpen]);

  /* Desktop dropdown edge‑detection still useful inside drawer */
  useEffect(() => {
    const nav = document.querySelector(".nav-bar");
    if (!nav) return;
    const parents = nav.querySelectorAll(".has-dropdown");

    const onEnter = (e) => {
      const panel = e.currentTarget.querySelector(":scope > .submenu, :scope > .dropdown-panel");
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
  }, []);

  return (
    <header className="nav-wrapper">
      {mobileOpen && <div className="nav-backdrop" onClick={closeMobileMenu} />}

      <div className="topbar-inner">
        {/* Always‑visible hamburger */}
        {!mobileOpen && !hideDefaultHamburger && (
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

        {/* Drawer – appears on click, irrespective of viewport width */}
        <nav className={`nav-bar ${mobileOpen ? "open" : ""}`}>
          {mobileOpen && (
            <div className="drawer-container">
              <div className="drawer-header">
                <button className="hamburger-close" onClick={closeMobileMenu}>
                  <span className="line line-1"></span>
                  <span className="line line-2"></span>
                  <span className="line line-3"></span>
                </button>
              </div>

              <div className="drawer-body">
                {siteNav.map((root, i) => (
                  <MenuBranch
                    key={root.label}
                    node={root}
                    delay={i * 0.1}
                    reset={resetSignal}
                  />
                ))}
              </div>

              <img src="/images/K4Logo-web-c.png" alt="K4 Studios Logo" className="k4-watermark" />
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
