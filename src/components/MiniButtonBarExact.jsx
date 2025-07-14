// MiniButtonBarExact.jsx
import React, { useState, useEffect } from "react";
import { siteNav } from "../data/siteNav.ts";
import "../styles/minimenu.css";

function ButtonBranch({ node, depth = 0, reset }) {
  const [expanded, setExpanded] = useState(false);
  const hasKids = node.children?.length > 0;

  useEffect(() => setExpanded(false), [reset]);

  const handleClick = (e) => {
    if (hasKids) {
      e.preventDefault();
      setExpanded((prev) => !prev);
    }
  };

  return (
    <div className={`nav-item${hasKids ? " has-dropdown" : ""}${expanded ? " expanded" : ""}`}>
      <div className="menu-row">
        <a
          href={node.href || "#"}
          className={depth > 0 ? "menu-link has-expand" : "nav-link has-expand"}
          onClick={handleClick}
        >
          {hasKids && (
            <span className={`left-icon hamburger-symbol ${expanded ? "open" : ""}`} aria-hidden="true">
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
        <div className={depth === 0 ? "dropdown-panel" : "submenu"} data-depth={depth}>
          {node.children.map((child) => (
            <ButtonBranch key={child.label} node={child} depth={depth + 1} reset={reset} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MiniButtonBarExact() {
  const [resetSignal, setResetSignal] = useState(0);

  useEffect(() => {
    setResetSignal((n) => n + 1);
  }, []);

  return (
    <div className="drawer-container force-mobile-menu">
      <div className="drawer-body">
        {siteNav.map((item, i) => (
          <ButtonBranch key={item.label} node={item} delay={i * 0.1} reset={resetSignal} />
        ))}
      </div>
    </div>
  );
}
