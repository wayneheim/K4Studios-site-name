import { useEffect } from "react";

// optional: import your mojibake fixer if you want clean quotes/dashes
// import fixMojibake from "../utils/fixMojibake";

export default function useMetaSwap(entry, baseTitle = "K4 Studios Gallery", index = 0) {
  useEffect(() => {
    if (!entry) return;

    // --- Title ---
    const chapterLabel = entry.title || `Chapter ${index + 1}`;
    document.title = `${chapterLabel} — ${baseTitle}`;

    // --- Helper: set or replace meta tags ---
    const setMeta = (selector, value, attr = "content") => {
      let el = document.head.querySelector(selector);
      if (!el) {
        el = document.createElement("meta");
        if (selector.startsWith("meta[name")) {
          el.setAttribute("name", selector.match(/"([^"]+)"/)[1]);
        } else if (selector.startsWith("meta[property")) {
          el.setAttribute("property", selector.match(/"([^"]+)"/)[1]);
        }
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
    };

    // --- Standard + Open Graph ---
    setMeta(`meta[name="description"]`, entry.description || entry.story || "");
    setMeta(`meta[property="og:title"]`, chapterLabel);
    setMeta(`meta[property="og:description"]`, entry.description || entry.story || "");
    if (entry.src) setMeta(`meta[property="og:image"]`, entry.src);

  }, [entry, baseTitle, index]);
}
