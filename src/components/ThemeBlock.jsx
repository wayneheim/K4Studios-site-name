import { useState } from "react";
import { themes } from "@/data/themes/themes.mjs";

/**
 * ThemeBlock - displays themes available for a gallery
 * Shows up to 4 themes initially, with "More..." to expand
 * ALL themes remain in DOM for SEO (hidden via CSS, not removed)
 * Includes JSON-LD structured data for theme discovery
 * 
 * @param {string} galleryKey - The gallery identifier (e.g., "/Galleries/Painterly-.../Western-Cowboy-Portraits")
 */
export default function ThemeBlock({ galleryKey }) {
  const [active, setActive] = useState(null);
  const [expanded, setExpanded] = useState(false);

  // How many to show before "More..."
  const VISIBLE_COUNT = 6;

  // Filter themes that match this gallery's dataset path
  // galleryKey might be a URL path like "/Galleries/Painterly-.../Western-Cowboy-Portraits"
  // dataset in themes.mjs is like "src/data/Galleries/Painterly-.../Color.mjs"
  // We extract the key part and do a partial match
  const galleryThemes = themes.filter((t) => {
    if (t.visible === false) return false;
    if (!t.dataset || !galleryKey) return false;
    
    // Normalize both for comparison - strip src/data, /Galleries prefix, and .mjs suffix
    const normalizedDataset = t.dataset
      .toLowerCase()
      .replace(/\\/g, "/")
      .replace(/^src\/data\/galleries\//i, "")
      .replace(/\.mjs$/i, "");
    
    const normalizedKey = galleryKey
      .toLowerCase()
      .replace(/\\/g, "/")
      .replace(/^\/galleries\//i, "")
      .replace(/\/$/, "");
    
    // Check if the dataset contains the gallery key (theme belongs to this gallery section)
    const match = normalizedDataset.includes(normalizedKey) || normalizedKey.includes(normalizedDataset);
    
    // Debug logging
    if (typeof window !== "undefined" && window.location.search.includes("debug=themes")) {
      console.log("ThemeBlock match check:", { 
        theme: t.name, 
        normalizedDataset, 
        normalizedKey, 
        match 
      });
    }
    
    return match;
  });

  if (!galleryThemes.length) return null;

  const needsExpansion = galleryThemes.length > VISIBLE_COUNT;
  const hiddenCount = galleryThemes.length - VISIBLE_COUNT;

  // Build structured data for SEO (ItemList of themes)
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Gallery Themes",
    "description": `Curated visual themes available in this One-Image Movie™ gallery`,
    "numberOfItems": galleryThemes.length,
    "itemListElement": galleryThemes.map((t, index) => {
      const datasetPath = t.dataset.replace(/^src\/data\/Galleries\//, '/Galleries/').replace(/\.mjs$/, '');
      // Use grid view URL for theme links (shows collection overview)
      const themeUrl = `${datasetPath}?theme=${t.slug}&view=grid`;
      return {
        "@type": "ListItem",
        "position": index + 1,
        "name": t.name,
        "description": t.description || `Explore the ${t.name} theme`,
        "url": `https://k4studios.net${themeUrl}`
      };
    })
  };

  return (
    <>
      {/* Structured Data for SEO - Theme discovery */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div 
        className="theme-block-wrapper"
        style={{ 
          marginBottom: "0.4rem", 
          position: "relative",
        }}
      >
      <style>{`
        .theme-block-wrapper {
          margin-top: 1.5rem;
          display: flex;
          justify-content: center;
        }
        .theme-block-box {
          width: 100%;
          max-width: 280px;
          margin-left: auto;
          margin-right: auto;
        }
        @media (min-width: 768px) {
          .theme-block-wrapper {
            margin-top: 0;
            margin-left: 0;
            display: flex;
            justify-content: center;
          }
          .theme-block-box {
            width: 200px;
            max-width: 200px;
            margin-left: auto;
            margin-right: auto;
          }
        }
      `}</style>
      {/* --- THEME BOX --- */}
      <div 
        className="theme-block-box"
        style={{
          background: "#f9f7f5",
          border: "1px solid #e0d8d0",
          borderRadius: "8px",
          padding: "0.6rem 1rem 0.5rem",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          textAlign: "center",
          fontFamily: "'Glegoo', serif",
        }}
      >
        <h3
          style={{
            fontSize: "0.75rem",
            letterSpacing: "0.1em",
            marginBottom: "0.4rem",
            paddingBottom: "0.4rem",
            borderBottom: "1px solid #d8d0c8",
            textTransform: "uppercase",
            color: "#928176",
            fontWeight: 600,
            fontFamily: "'Glegoo', serif",
            margin: 0,
          }}
        >
          Featured Themes
        </h3>

        {/* --- THEME GRID --- */}
        {/* ALL themes are in DOM for SEO - hidden ones use CSS visibility */}
        <div style={{ 
          display: "flex", 
          flexDirection: "column",
          gap: "0.35rem",
          alignItems: "center",
          marginTop: "0.5rem",
        }}>
          {galleryThemes.map((t, index) => {
            // Build the theme URL - navigate to grid view with theme filter
            // Shows collection overview with theme name, description, and all images
            const datasetPath = t.dataset.replace(/^src\/data\/Galleries\//, '/Galleries/').replace(/\.mjs$/, '');
            const themeUrl = `${datasetPath}?theme=${t.slug}&view=grid`;
            
            // Determine if this theme should be visually hidden (but still in DOM for SEO)
            const isHidden = !expanded && needsExpansion && index >= VISIBLE_COUNT;
            
            return (
              <a
                key={t.slug}
                href={themeUrl}
                onMouseEnter={() => setActive(t.slug)}
                onMouseLeave={() => setActive(null)}
                onClick={(e) => {
                  // Mobile tap-to-toggle: first tap shows description, second tap navigates
                  if ('ontouchstart' in window && active !== t.slug) {
                    e.preventDefault();
                    setActive(t.slug);
                  }
                }}
                style={{
                  cursor: "pointer",
                  color: active === t.slug ? "#5a4c3d" : "#8a7563",
                  textDecoration: active === t.slug ? "underline" : "none",
                  transition: "0.15s",
                  fontSize: "0.8rem",
                  fontFamily: "'Glegoo', serif",
                  // Hide visually but keep in DOM for SEO
                  ...(isHidden ? {
                    position: "absolute",
                    width: "1px",
                    height: "1px",
                    padding: 0,
                    margin: "-1px",
                    overflow: "hidden",
                    clip: "rect(0, 0, 0, 0)",
                    whiteSpace: "nowrap",
                    border: 0,
                  } : {}),
                }}
                // Add aria-hidden for hidden items (screen readers skip, but crawlers still see)
                aria-hidden={isHidden ? "true" : undefined}
                tabIndex={isHidden ? -1 : undefined}
              >
                {t.name}
              </a>
            );
          })}
          
          {/* "More..." / "Less" toggle button */}
          {needsExpansion && (
            <button
              onClick={() => setExpanded(!expanded)}
              style={{
                cursor: "pointer",
                color: "#6a8a6a",
                background: "none",
                border: "none",
                padding: 0,
                fontSize: "0.75rem",
                fontFamily: "'Glegoo', serif",
                fontStyle: "italic",
                marginTop: "0.15rem",
              }}
              onMouseEnter={(e) => e.target.style.textDecoration = "underline"}
              onMouseLeave={(e) => e.target.style.textDecoration = "none"}
            >
              {expanded ? "▲ Show Less" : `▼ More... (${hiddenCount})`}
            </button>
          )}
        </div>
      </div>

      {/* --- DESCRIPTION PANELS - All in DOM for SEO, visibility toggles on hover --- */}
      {galleryThemes.map((t) => (
        <div 
          key={`desc-${t.slug}`}
          style={{
            position: "absolute",
            top: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            pointerEvents: active === t.slug ? "auto" : "none",
            marginTop: "0.25rem",
            padding: "0.5rem 0.75rem",
            background: "#fff",
            border: "1px solid #d8d0c8",
            borderRadius: "6px",
            fontSize: "0.8rem",
            color: "#5a4c3d",
            lineHeight: 1.5,
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            minWidth: "200px",
            maxWidth: "280px",
            textAlign: "center",
            fontFamily: "'Glegoo', serif",
            // Use visibility so content stays in DOM for crawlers
            visibility: active === t.slug ? "visible" : "hidden",
            opacity: active === t.slug ? 1 : 0,
            transition: "opacity 0.15s, visibility 0.15s",
          }}
        >
          <strong style={{ color: "#7a6a5a" }}>{t.name}</strong>
          <br />
          {t.description}
          {/* Mobile prompt - tap again to navigate */}
          <a
            href={t.dataset.replace(/^src\/data\/Galleries\//, '/Galleries/').replace(/\.mjs$/, '') + `?theme=${t.slug}&view=grid`}
            className="theme-tap-prompt"
            style={{
              display: "block",
              marginTop: "0.5rem",
              paddingTop: "0.4rem",
              borderTop: "1px solid #e8e0d8",
              fontSize: "0.7rem",
              color: "#6a8a6a",
              fontStyle: "italic",
              textDecoration: "none",
            }}
          >
            Tap to view theme →
          </a>
        </div>
      ))}
    </div>
    </>
  );
}
