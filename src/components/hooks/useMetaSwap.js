import { useEffect, useRef } from "react";
import { getProxySrc } from "../../utils/imageProxyCore.js";

// optional: import your mojibake fixer if you want clean quotes/dashes
// import fixMojibake from "../utils/fixMojibake";

function getMetaContent(selector) {
  return document.head.querySelector(selector)?.getAttribute("content") || "";
}

function setMeta(selector, value, attr = "content") {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement("meta");
    if (selector.startsWith('meta[name')) {
      el.setAttribute("name", selector.match(/"([^"]+)"/)[1]);
    } else if (selector.startsWith('meta[property')) {
      el.setAttribute("property", selector.match(/"([^"]+)"/)[1]);
    }
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

function restoreMeta(selector, originalValue) {
  if (!originalValue) return;
  setMeta(selector, originalValue);
}

export default function useMetaSwap(entry, baseTitle = "K4 Studios Gallery", index = 0, enabled = true) {
  const originalMetaRef = useRef(null);

  useEffect(() => {
    if (!originalMetaRef.current) {
      originalMetaRef.current = {
        title: document.title,
        description: getMetaContent('meta[name="description"]'),
        ogTitle: getMetaContent('meta[property="og:title"]'),
        ogDescription: getMetaContent('meta[property="og:description"]'),
        ogImage: getMetaContent('meta[property="og:image"]'),
      };
    }

    if (!enabled || !entry) {
      const original = originalMetaRef.current;
      if (!original) return;

      document.title = original.title;
      restoreMeta('meta[name="description"]', original.description);
      restoreMeta('meta[property="og:title"]', original.ogTitle);
      restoreMeta('meta[property="og:description"]', original.ogDescription);
      restoreMeta('meta[property="og:image"]', original.ogImage);
      return;
    }

    // --- Title ---
    const chapterLabel = entry.title || `Chapter ${index + 1}`;
    document.title = `${chapterLabel} — ${baseTitle}`;

    // --- Standard + Open Graph ---
    setMeta(`meta[name="description"]`, entry.description || entry.story || "");
    setMeta(`meta[property="og:title"]`, chapterLabel);
    setMeta(`meta[property="og:description"]`, entry.description || entry.story || "");
    if (entry.id) {
      setMeta(`meta[property="og:image"]`, entry.src || getProxySrc(entry.id, 'l'));
    }

  }, [entry, baseTitle, index, enabled]);
}
