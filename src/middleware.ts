// src/middleware.ts
import type { MiddlewareHandler } from "astro";
import imageIdMap from "@/data/imageIdMap.json";

// Type assertion for the imageIdMap
const imageMap = imageIdMap as Record<string, string[]>;

function stripNestedTags(html: string): { cleaned: string; changed: boolean } {
  let changed = false;

  // ✅ Allow only the first <html>
  let seenHtml = false;
  html = html.replace(/<html[^>]*>/gi, (m) => {
    if (seenHtml) {
      changed = true;
      return "";
    }
    seenHtml = true;
    return m;
  });
  html = html.replace(/<\/html>/gi, (m, offset, str) => {
    if (str.lastIndexOf("</html>") !== offset) {
      changed = true;
      return "";
    }
    return m;
  });

  // ✅ Allow only the first <head>
  let seenHead = false;
  html = html.replace(/<head[^>]*>/gi, (m) => {
    if (seenHead) {
      changed = true;
      return "";
    }
    seenHead = true;
    return m;
  });
  html = html.replace(/<\/head>/gi, (m, offset, str) => {
    if (str.indexOf("</head>") !== offset) {
      changed = true;
      return "";
    }
    return m;
  });

  // ✅ Allow only the first <body>
  let seenBody = false;
  html = html.replace(/<body[^>]*>/gi, (m) => {
    if (seenBody) {
      changed = true;
      return "";
    }
    seenBody = true;
    return m;
  });
  html = html.replace(/<\/body>/gi, (m, offset, str) => {
    if (str.lastIndexOf("</body>") !== offset) {
      changed = true;
      return "";
    }
    return m;
  });

  // 🚨 Strip <title>, <meta>, <link> inside body
  html = html.replace(/<body[\s\S]*?<\/body>/gi, (bodyBlock) => {
    const cleaned = bodyBlock
      .replace(/<title[\s\S]*?<\/title>/gi, "")
      .replace(/<meta[^>]*>/gi, "")
      .replace(/<link[^>]*>/gi, "");
    if (cleaned.length !== bodyBlock.length) changed = true;
    return cleaned;
  });

  // 🚨 Deduplicate <div id="overlay-root">
  html = html.replace(
    /(<div id="overlay-root"[^>]*><\/div>)([\s\S]*)(?=<\/body>)/gi,
    (match, first, rest) => {
      const deduped = rest.replace(/<div id="overlay-root"[^>]*><\/div>/gi, "");
      if (deduped.length !== rest.length) changed = true;
      return first + deduped;
    }
  );

  // 🚨 Deduplicate <svg id="sharpen">
  html = html.replace(
    /(<svg[^>]*id="sharpen"[\s\S]*?<\/svg>)([\s\S]*)(?=<\/body>)/gi,
    (match, first, rest) => {
      const deduped = rest.replace(/<svg[^>]*id="sharpen"[\s\S]*?<\/svg>/gi, "");
      if (deduped.length !== rest.length) changed = true;
      return first + deduped;
    }
  );

  // ✅ Strip incomplete ImageObject structured data (SmugMug) - preserve Article and other valid schema
  html = html.replace(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    (match, content) => {
      try {
        const json = JSON.parse(content.trim());
        const items = Array.isArray(json) ? json : [json];
        
        // Explicitly allowed schema types - NEVER remove these
        const allowedTypes = [
          "Article",
          "BlogPosting", 
          "FAQPage",
          "BreadcrumbList",
          "CollectionPage",
          "AboutPage",
          "Organization",
          "Person",
          "WebPage",
          "WebSite",
        ];
        
        const hasAllowedType = items.some((item) => {
          const type = item["@type"];
          if (Array.isArray(type)) {
            return type.some((t) => allowedTypes.includes(t));
          }
          return allowedTypes.includes(type);
        });
        
        if (hasAllowedType) {
          return match; // NEVER touch allowed schema types
        }
        
        // Check if this is an ImageObject (SmugMug injects these)
        const isImageObject = items.some((item) => {
          const type = item["@type"];
          return type === "ImageObject" || 
            (Array.isArray(type) && type.includes("ImageObject"));
        });
        
        // Only filter ImageObject blocks from SmugMug
        if (!isImageObject) {
          return match; // Keep unknown schema types (safe default)
        }
        
        // Check if it's from SmugMug (they inject incomplete ImageObject)
        const isSmugMug = content.includes("photos.smugmug.com");
        if (!isSmugMug) {
          return match; // Keep non-SmugMug ImageObject
        }
        
        // For SmugMug ImageObject, require @id to be valid
        const hasValidImageObject = items.some(
          (item) => item["@type"] === "ImageObject" && item["@id"]
        );
        if (!hasValidImageObject) {
          changed = true;
          console.log("🧹 Removed incomplete SmugMug JSON-LD block (missing @id)");
          return "";
        }
      } catch {
        // ignore non-JSON or invalid blocks
      }
      return match;
    }
  );

  return { cleaned: html, changed };
}

// Re-enabled: This middleware cleans SmugMug injected JSON-LD and duplicate HTML elements
// The React hydration fix for Error #418 was NOT caused by this middleware - 
// it was caused by components using window.innerWidth during render instead of in useEffect
export const onRequest: MiddlewareHandler = async (context, next) => {
  const { pathname } = context.url;

  // ✅ Redirect: legacy SmugMug /Photography-Galleries/ → modern /Galleries/
  // NOTE: These paths can bypass Netlify's _redirects in SSR mode.
  if (pathname === "/Photography-Galleries" || pathname.startsWith("/Photography-Galleries/")) {
    const imageIdMatch = pathname.match(/\/(i-[a-zA-Z0-9]+)\/?$/);
    if (imageIdMatch) {
      const imageId = imageIdMatch[1];
      const correctGalleryPaths = imageMap[imageId];
      if (correctGalleryPaths && correctGalleryPaths.length > 0) {
        const redirectUrl = `${correctGalleryPaths[0]}/${imageId}`;
        console.log(`[legacy-301] ${pathname} → 301 to ${redirectUrl}`);
        return new Response(null, {
          status: 301,
          headers: { Location: redirectUrl },
        });
      }
    }

    const rest = pathname.slice("/Photography-Galleries".length) || "";
    const target = `/Galleries${rest || ""}`;
    return new Response(null, {
      status: 301,
      headers: { Location: target },
    });
  }

  // ✅ EARLY EXIT: Redirect /img/* to Cloudflare Worker
  // This handles ALL image requests (including hardcoded paths in data files)
  // Uses 302 redirect so browser fetches from worker directly - no Netlify proxy needed
  // Works identically in dev and prod - no switches, no toggles
  if (pathname.startsWith("/img/")) {
    const workerUrl = `https://k4-image-proxy.wayneheim.workers.dev${pathname}`;
    return new Response(null, {
      status: 302,
      headers: { Location: workerUrl },
    });
  }

  // ✅ EARLY EXIT: Return 410 Gone for legacy SmugMug photo shoots
  // These paths bypass Netlify's _redirects in SSR mode, so we must kill them here
  // Returns 410 before Astro tries to render → no JS fires → no analytics logged
  // 
  // SMART MATCHING: If path ends with i-xxxxx, check if image exists in curated galleries
  // - If found → 301 redirect to correct location (preserve link authority)
  // - If NOT found → 410 Gone (truly removed content)
  // - If NO image ID → 410 Gone (just a gallery listing, not matchable)
  const legacyGonePrefixes = [
    "/Photoshootsandevents/",
    "/Scheduled-Shoots/",
    "/Other/Photo-Shoots/",
    "/Other/Photo-Shoots-and-Themes/",
    "/Is-Winter/",
    "/keyword/",  // SmugMug search/tag paths
  ];
  
  if (legacyGonePrefixes.some(prefix => pathname.startsWith(prefix))) {
    // Check if this is an image page (ends with i-xxxxx)
    const imageIdMatch = pathname.match(/\/(i-[a-zA-Z0-9]+)\/?$/);
    
    if (imageIdMatch) {
      const imageId = imageIdMatch[1];
      const correctGalleryPaths = imageMap[imageId];
      
      if (correctGalleryPaths && correctGalleryPaths.length > 0) {
        // Image found in curated gallery - 301 redirect to preserve authority
        const redirectUrl = `${correctGalleryPaths[0]}/${imageId}`;
        console.log(`[smart-410] Legacy path ${pathname} → 301 to ${redirectUrl}`);
        return new Response(null, {
          status: 301,
          headers: { Location: redirectUrl },
        });
      }
      // Image ID provided but not found anywhere → 410
      console.log(`[smart-410] Legacy image ${imageId} not found in any gallery → 410`);
    }
    // No image ID or image not found → 410
    return new Response("410 Gone - This content has been permanently removed.", {
      status: 410,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // ✅ REDIRECT: Legacy Pictorialist paths → current Pictorialist page
  if (pathname.startsWith("/Pictorialist-Photography/")) {
    return new Response(null, {
      status: 301,
      headers: { Location: "/Pictorialist-Photography" },
    });
  }

  const response = await next();
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("text/html")) {
    // ✅ Read body directly - we'll always return a new Response anyway
    let body: string;
    try {
      body = await response.text();
    } catch (e) {
      // If stream is already locked/consumed, return as-is
      console.warn(`⚠️ Could not read response body on ${context.url.pathname}:`, e);
      return response;
    }
    
    // Skip cleaning for large responses to avoid memory issues in Cloudflare
    if (body.length > 1000000) {
      return new Response(body, {
        status: response.status,
        headers: response.headers,
      });
    }

    const { cleaned, changed } = stripNestedTags(body);

    if (changed) console.log(`🧹 Cleaned HTML on ${context.url.pathname}`);

    // ✅ Always return a new Response to avoid stream issues
    return new Response(cleaned, {
      status: response.status,
      headers: response.headers,
    });
  }

  return response;
};
