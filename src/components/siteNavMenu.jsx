import React, { useEffect, useState } from "react";
import { siteNav } from "../data/siteNav.ts";
import "../styles/siteNavMenu.css";

export default function SiteNavMenu({ forceMobile = false }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);

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

  function MenuBranch({ node, depth = 0, delay = 0, reset, forceMobile = false }) {
    const [expanded, setExpanded] = useState(false);
    const hasKids = node.children?.length > 0;

    useEffect(() => setExpanded(false), [reset]);

    const isMobileView = () =>
      forceMobile || (typeof window !== "undefined" && window.innerWidth <= 768) || mobileOpen;

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

   return (
  <div
    className={`nav-item${hasKids ? " has-dropdown" : ""}${expanded ? " expanded" : ""}`}
    style={{ animationDelay: `${0.1 + delay}s` }}
  >
    <div className="menu-row" style={{ display: "flex", alignItems: "center" }}>
      {/* ⬅️ Hamburger ONLY to toggle, not tied to link */}
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

      {/* ⬅️ Always navigates — no toggle */}
      <a
        href={node.href || "#"}
        className={depth ? "menu-link has-expand" : "nav-link has-expand"}
      >
        {!hasKids ? (
          <span className="leaf-label">
            <span className="leaf-prefix" style={{ marginRight: "0.3rem" }}>○</span>
            {node.label}
          </span>
        ) : (
          node.label
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
            forceMobile={forceMobile}
          />
        ))}
      </div>
    )}
  </div>
);

  }

  return (
    <header className="nav-wrapper">
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
              <div className="drawer-header">
                <button className="hamburger-close" onClick={closeMobileMenu}>
                  <span className="line line-1" />
                  <span className="line line-2" />
                  <span className="line line-3" />
                </button>
              </div>

              <div className="drawer-body">
                {siteNav.map((root, i) => (
                  <MenuBranch
                    key={root.label}
                    node={root}
                    delay={i * 0.1}
                    reset={resetSignal}
                    forceMobile={forceMobile}
                  />
                ))}
              </div>

              <img
                src="/images/K4Logo-web-c.png"
                alt="K4 Studios Logo"
                className="k4-watermark"
                style={{ opacity: 0.25 }}
              />
            </div>
          ) : (
            siteNav.map((root, i) => (
              <MenuBranch
                key={root.label}
                node={root}
                delay={i * 0.1}
                reset={resetSignal}
                forceMobile={forceMobile}
              />
            ))
          )}
        </nav>
      </div>
    </header>
  );
}
