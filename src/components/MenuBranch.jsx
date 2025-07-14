import React, { useState, useEffect } from "react";

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
    e.preventDefault(); // only affects the hammy, not the link
    if (hasKids) setExpanded((prev) => !prev);
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
          <a
            href={node.href || "#"}
            className="mini-placeholder-dot"
            aria-label={`Visit ${node.label}`}
          />
        )}

        <a
          href={node.href || "#"}
          className={`mini-menu-link${hasKids ? " has-children" : ""}`}
        >
          &nbsp;{node.label}
        </a>
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
