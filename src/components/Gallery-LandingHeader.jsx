import React, { useEffect, useState, useMemo } from "react";
import SiteNavMenu from "./siteNavMenu.jsx";
import GalleryToggleButton from "./GalleryToggleButton.jsx";
import "../styles/gallery-header-react.css";

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

/**
 * Abbreviates the first breadcrumb segment to initials for mobile.
 * If total length > 25 chars, also abbreviates the last segment.
 * E.g., "Facing History | Cowboy Portraits | Color" → "F H | Cowboy Portraits | C"
 * Works with HTML breadcrumbs containing anchor tags.
 * Handles pipes with various whitespace formats (spaces, newlines, etc.)
 */
function abbreviateFirstSegment(html) {
  if (!html) return html;
  
  // Normalize the HTML - replace any whitespace around pipes with single spaces
  const normalized = html.replace(/\s*\|\s*/g, ' | ');
  
  // Split into segments by " | "
  const segments = normalized.split(' | ');
  if (segments.length < 2) return html;
  
  // Helper to abbreviate text (extract initials)
  const abbreviate = (text) => {
    return text
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0)
      .map(word => word[0].toUpperCase())
      .join(' ');
  };
  
  // Helper to abbreviate a segment (handles anchor tags)
  const abbreviateSegment = (segment) => {
    const anchorMatch = segment.match(/(<a[^>]*>)([^<]+)(<\/a>)/);
    if (anchorMatch) {
      const [, openTag, text, closeTag] = anchorMatch;
      return `${openTag}${abbreviate(text)}${closeTag}`;
    }
    return abbreviate(segment);
  };
  
  // Abbreviate first segment
  segments[0] = abbreviateSegment(segments[0]);
  
  // Check total text length (strip HTML tags for measurement)
  const textOnly = segments.join(' | ').replace(/<[^>]*>/g, '');
  
  // If still too long (>25 chars), abbreviate last segment too
  if (textOnly.length > 25 && segments.length >= 2) {
    segments[segments.length - 1] = abbreviateSegment(segments[segments.length - 1]);
  }
  
  return segments.join(' | ');
}

export default function GalleryLandingHeader({ breadcrumb }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pathname, setPathname] = useState("");
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();

  // Memoize abbreviated breadcrumb for mobile
  const mobileBreadcrumb = useMemo(() => abbreviateFirstSegment(breadcrumb), [breadcrumb]);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setPathname(window.location.pathname);
    }
  }, []);

  return (
    <div
      role="banner"
      className={`landing-header${mounted && isMobile ? " mobile-animate" : ""}`}
      style={{ position: "relative", zIndex: 100 }}
    >
      {/* ── BREADCRUMB ON STRIPE BAR ── */}
      <div className="breadcrumb-toggle-wrapper desktop-only">
        <div
          className="breadcrumb-overlay"
          dangerouslySetInnerHTML={{ __html: breadcrumb }}
        />
        {pathname && <GalleryToggleButton currentPath={pathname} />}
      </div>

      <a href="/" className="k4-header-logo">
        <img
          src="/images/K4Logo-web.webp"
          alt="K4 Studios Logo"
          className="k4-logo-img"
        />
      </a>

      <div className="rhs">
        <SiteNavMenu mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      </div>

      <a
        href="mailto:wayne@k4studios.com"
        className="wh-logo-mobile"
        aria-label="Email Wayne Heim"
      >
        <img src="/images/WH.png" alt="Contact" style={{ filter: "invert(100%)" }} />
      </a>

      {/* MOBILE BREADCRUMB */}
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
          {pathname && <GalleryToggleButton currentPath={pathname} />}
        </div>
      </div>

    </div>
  );
}
