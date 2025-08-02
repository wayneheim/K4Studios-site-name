import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import MenuBranch from "./MenuBranch.jsx";
import { siteNav } from "../data/siteNav.ts";
import "../styles/minimenu.css";

export default function MobileMiniDrawer({ onClose }) {
  const [mounted, setMounted] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    setResetSignal((n) => n + 1);

    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    handleResize(); // check once on mount
    window.addEventListener("resize", handleResize);

    return () => {
      setMounted(false);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const drawer = (
    <div className="mini-drawer-portal">
      <div
        className={`drawer-container ${isMobile ? "force-mobile-menu" : ""}`}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 9999,
          width: "100%",
          height: "100vh",
          background: "#fff",
          overflowY: "auto",
          padding: "2rem",
        }}
      >
        {/* Header row with K4 Index and Close button */}
        <div
          className="mini-drawer-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.25rem",
          }}
        >
          <h2
            className="mini-logo"
            style={{
              fontFamily: "Glegoo, serif",
              fontSize: "1.4rem",
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
              onClick={() => {
                if (onClose) onClose();
              }}
            >
              K4 Studios
            </a>
          </h2>

          <button
            className="mini-close-btn"
            onClick={onClose}
            style={{
              fontSize: "0.85rem",
              padding: "0.35rem 0.75rem",
              background: "#444",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontFamily: "Glegoo, serif",
            }}
          >
            Close
          </button>
        </div>

        {/* Nav menu */}
        <div className="mini-drawer-nav">
          {siteNav.map((node, i) => (
            <MenuBranch
              key={node.label}
              node={node}
              depth={0}
              reset={resetSignal}
              index={i}
              forceMobile={true}
              showHammy={true}
            />
          ))}
        </div>

        {/* Logo at bottom */}
        <div
          style={{
            marginTop: "3rem",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <a
            href="/"
            aria-label="K4 Studios homepage"
            title="Home"
            style={{ display: "inline-block" }}
            onClick={(e) => {
              if (onClose) onClose();
            }}
          >
            <img
              src="/images/K4Logo-web-c.png"
              alt="K4 Studios Logo"
              style={{
                width: "120px",
                height: "auto",
                opacity: 0.2,
                filter: "grayscale(100%)",
              }}
            />
          </a>
        </div>
      </div>
    </div>
  );

  return mounted ? createPortal(drawer, document.body) : null;
}
