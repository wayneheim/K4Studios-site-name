import React, { useState } from "react";
import { siteNav } from "../data/siteNav.ts";
import "../styles/minimenu.css"; // Reuse existing styles for now

function MenuBranch({ node, depth = 0 }) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = node.children?.length > 0;

  const toggleExpand = (e) => {
    if (hasChildren) {
      e.preventDefault();
      setExpanded((x) => !x);
    }
  };

  return (
    <div className={`nav-item${hasChildren ? " has-dropdown" : ""}${expanded ? " expanded" : ""}`}>
      <div className="menu-row">
        <a
          href={node.href || "#"}
          className={depth > 0 ? "menu-link has-expand" : "nav-link has-expand"}
          onClick={toggleExpand}
        >
          {hasChildren && (
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

      {hasChildren && (
        <div className={depth === 0 ? "dropdown-panel" : "submenu"} data-depth={depth}>
          {node.children.map((child) => (
            <MenuBranch key={child.label} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MiniButtonBar() {
  return (
    <div className="mini-buttonbar-wrapper force-mobile-menu">
      {siteNav.map((root) => (
        <MenuBranch key={root.label} node={root} />
      ))}
    </div>
  );
}
