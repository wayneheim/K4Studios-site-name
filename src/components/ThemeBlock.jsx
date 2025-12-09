import { useState } from "react";
import { themes } from "@/data/themes/themes.mjs";

/**
 * ThemeBlock - displays themes available for a gallery
 * 
 * @param {string} galleryKey - The gallery identifier (e.g., "/Galleries/Painterly-.../Western-Cowboy-Portraits")
 */
export default function ThemeBlock({ galleryKey }) {
  const [active, setActive] = useState(null);

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

  return (
    <div 
      className="theme-block-wrapper"
      style={{ 
        marginBottom: "0.4rem", 
        position: "relative",
      }}
    >
      <style>{`
        .theme-block-wrapper {
          margin-top: 0;
          display: flex;
          justify-content: center;
        }
        .theme-block-box {
          width: 100%;
          margin-left: 0;
        }
        @media (min-width: 768px) {
          .theme-block-wrapper {
            margin-top: 0;
            margin-left: 15px;
          }
          .theme-block-box {
            width: 210px;
            margin-left: 0;
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
        <div
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
          }}
        >
          Gallery Themes
        </div>

        {/* --- THEME GRID --- */}
        <div style={{ 
          display: "flex", 
          flexDirection: "column",
          gap: "0.35rem",
          alignItems: "center",
        }}>
          {galleryThemes.map((t) => {
            // Build the theme URL - navigate to the first themed image with theme filter
            // Use the theme's dataset path to construct the correct gallery URL
            // Use pre-stored firstImage from theme registry (no async loading needed)
            const datasetPath = t.dataset.replace(/^src\/data\/Galleries\//, '/Galleries/').replace(/\.mjs$/, '');
            const themeUrl = t.firstImage 
              ? `${datasetPath}/${t.firstImage}?theme=${t.slug}`
              : `${datasetPath}?theme=${t.slug}`;
            
            return (
              <a
                key={t.slug}
                href={themeUrl}
                onMouseEnter={() => setActive(t.slug)}
                onMouseLeave={() => setActive(null)}
                style={{
                  cursor: "pointer",
                  color: active === t.slug ? "#5a4c3d" : "#8a7563",
                  textDecoration: active === t.slug ? "underline" : "none",
                  transition: "0.15s",
                  fontSize: "0.8rem",
                  fontFamily: "'Glegoo', serif",
                }}
              >
                {t.name}
              </a>
            );
          })}
        </div>
      </div>

      {/* --- DESCRIPTION PANEL (overlay, positioned absolute) --- */}
      {active && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          pointerEvents: "auto",
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
        }}>
          <strong style={{ color: "#7a6a5a" }}>{galleryThemes.find((t) => t.slug === active)?.name}</strong>
          <br />
          {galleryThemes.find((t) => t.slug === active)?.description}
        </div>
      )}
    </div>
  );
}
