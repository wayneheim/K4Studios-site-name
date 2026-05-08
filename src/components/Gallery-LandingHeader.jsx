import React, { useMemo } from "react";
import SiteNavMenu from "./siteNavMenu.jsx";
import GalleryToggleButton from "./GalleryToggleButton.jsx";
import "../styles/gallery-header-react.css";

function abbreviateFirstSegment(html) {
  if (!html) return html;

  const normalized = html.replace(/\s*\|\s*/g, " | ");
  const segments = normalized.split(" | ");
  if (segments.length < 2) return html;

  const abbreviate = (text) => {
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0)
      .map((word) => word[0].toUpperCase())
      .join(" ");
  };

  const abbreviateSegment = (segment) => {
    const anchorMatch = segment.match(/(<a[^>]*>)([^<]+)(<\/a>)/);
    if (anchorMatch) {
      const [, openTag, text, closeTag] = anchorMatch;
      return `${openTag}${abbreviate(text)}${closeTag}`;
    }
    return abbreviate(segment);
  };

  segments[0] = abbreviateSegment(segments[0]);

  const textOnly = segments.join(" | ").replace(/<[^>]*>/g, "");
  if (textOnly.length > 25 && segments.length >= 2) {
    segments[segments.length - 1] = abbreviateSegment(segments[segments.length - 1]);
  }

  return segments.join(" | ");
}

export default function GalleryLandingHeader({ breadcrumb, currentPath = "" }) {
  const mobileBreadcrumb = useMemo(() => abbreviateFirstSegment(breadcrumb), [breadcrumb]);

  return (
    <div
      role="banner"
      className="landing-header"
      style={{ position: "relative", zIndex: 100 }}
    >
      <div className="breadcrumb-toggle-wrapper desktop-only">
        <div
          className="breadcrumb-overlay"
          dangerouslySetInnerHTML={{ __html: breadcrumb }}
        />
        {currentPath && <GalleryToggleButton currentPath={currentPath} />}
      </div>

      <a href="/" className="k4-header-logo">
        <img
          src="/images/K4Logo-web.webp"
          alt="K4 Studios Logo"
          className="k4-logo-img"
        />
      </a>

      <div className="rhs">
        <SiteNavMenu />
      </div>

      <a
        href="mailto:wayne@k4studios.com"
        className="wh-logo-mobile"
        aria-label="Email Wayne Heim"
      >
        <img src="/images/WH.png" alt="Contact" style={{ filter: "invert(100%)" }} />
      </a>

      <div className="mobile-breadcrumb-wrapper mobile-only">
        <div
          className="mobile-breadcrumb"
          style={{
            color: "#c2c2c2",
            marginTop: "138px",
            fontWeight: 600,
            fontSize: ".85rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.125rem",
            textAlign: "center"
          }}
        >
          <span dangerouslySetInnerHTML={{ __html: mobileBreadcrumb }} />
          {currentPath && <GalleryToggleButton currentPath={currentPath} />}
        </div>
      </div>
    </div>
  );
}
