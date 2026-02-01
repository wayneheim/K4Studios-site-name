import React, { useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";

export default function MenuBranch({
  node,
  depth,
  reset,
  forceMobile = false,
  index = 0,
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

  // Handle name click - expands if has children, otherwise navigates
  const handleNameClick = (e) => {
    if (hasKids) {
      e.preventDefault();
      setExpanded((prev) => !prev);
    }
  };

  return (
    <div
      className={`nav-item mini-nav-item depth-${depth}${expanded ? " open" : ""}`}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className={`mini-menu-row${hasKids ? " has-ham" : " no-ham"}`}>
        {hasKids ? (
          <button
            className={`mini-ham-icon hover-collapse${expanded ? " rotated" : ""}`}
            onClick={toggle}
            aria-label="Toggle Submenu"
          >
            <span className="bar top" />
            <span className="bar mid" />
            <span className="bar bot" />
          </button>
        ) : (
          <span
            className="mini-placeholder-dot"
            aria-hidden="true"
          />
        )}

        {/* Name - clicking expands if has children */}
        <a
          href={node.href || "#"}
          className={`mini-menu-link${hasKids ? " has-children" : ""}`}
          onClick={handleNameClick}
          style={{ flex: 1 }}
        >
          &nbsp;{node.label}
        </a>

        {/* Navigation arrow - always visible */}
        {node.href && (
          <a
            href={node.href}
            className="mini-nav-arrow"
            aria-label={`Go to ${node.label}`}
            style={{
              marginLeft: "auto",
              padding: "0.25rem 0.5rem",
              display: "flex",
              alignItems: "center",
              color: "#8b7355",
              opacity: 0.6,
              transition: "opacity 0.2s ease",
              textDecoration: "none"
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
            onMouseLeave={(e) => e.currentTarget.style.opacity = 0.6}
          >
            <ChevronRight size={18} />
          </a>
        )}
      </div>

      {hasKids && expanded && (
        <div className="mini-submenu">
          {node.children.map((child, i) => (
            <MenuBranch
              key={child.label}
              node={child}
              depth={depth + 1}
              reset={reset}
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  );
}
