// src/middleware.ts
import type { MiddlewareHandler } from "astro";
import imageIdMap from "@/data/imageIdMap.json";

// Type assertion for the imageIdMap
const imageMap = imageIdMap as Record<string, string[]>;

let knownGalleryPathsLower: Set<string> | null = null;

function normalizePath(pathname: string): string {
  if (!pathname) return "";
  const trimmed = String(pathname).trim();
  if (!trimmed) return "";
  return trimmed.length > 1 ? trimmed.replace(/\/+$/g, "") : trimmed;
}

function getParentGalleryPath(pathname: string): string {
  const normalized = normalizePath(pathname);
  return normalized.replace(/\/[iI]-[A-Za-z0-9-]+\/?$/, "");
}

function getKnownGalleryPathsLower(): Set<string> {
  if (knownGalleryPathsLower) return knownGalleryPathsLower;

  const paths = new Set<string>();

  for (const rawValue of Object.values(imageMap)) {
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    for (const value of values) {
      const normalized = normalizePath(String(value || "")).toLowerCase();
      if (normalized) paths.add(normalized);
    }
  }

  knownGalleryPathsLower = paths;
  return knownGalleryPathsLower;
}

function isWhitelistedGalleryParent(pathname: string): boolean {
  const parentLower = normalizePath(getParentGalleryPath(pathname)).toLowerCase();
  if (!parentLower) return false;

  const knownPaths = getKnownGalleryPathsLower();
  if (knownPaths.has(parentLower)) return true;

  if (parentLower.endsWith("/gallery")) {
    return knownPaths.has(parentLower.slice(0, -"/gallery".length));
  }

  return knownPaths.has(`${parentLower}/gallery`);
}

function normalizeK4HostInSchemaContent(content: string): string {
  if (!content || typeof content !== "string") return content;
  return content
    .replace(/https?:\/\/(?:www\.)?k4studios\.com/gi, "https://www.k4studios.com")
    .replace(/https%3A%2F%2F(?:www\.)?k4studios\.com/gi, "https%3A%2F%2Fwww.k4studios.com")
    .replace(/https?:\\\/\\\/(?:www\.)?k4studios\.com/gi, "https:\\/\\/www.k4studios.com");
}

function redirectToCustom404(): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: "/404" },
  });
}

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
      const normalizedContent = normalizeK4HostInSchemaContent(content);
      if (normalizedContent !== content) changed = true;

      try {
        const json = JSON.parse(normalizedContent.trim());
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
          return normalizedContent === content ? match : match.replace(content, normalizedContent); // NEVER remove allowed schema types
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
        const isSmugMug = normalizedContent.includes("photos.smugmug.com");
        if (!isSmugMug) {
          return normalizedContent === content ? match : match.replace(content, normalizedContent); // Keep non-SmugMug ImageObject
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
      return normalizedContent === content ? match : match.replace(content, normalizedContent);
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
      if (correctGalleryPaths && correctGalleryPaths.length > 0 && isWhitelistedGalleryParent(pathname)) {
        const redirectUrl = `${correctGalleryPaths[0]}/${imageId}`;
        console.log(`[legacy-301] ${pathname} → 301 to ${redirectUrl}`);
        return new Response(null, {
          status: 301,
          headers: { Location: redirectUrl },
        });
      }

      console.log(`[legacy-301] Blocked smart redirect for non-whitelisted parent: ${pathname}`);
      return redirectToCustom404();
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
  // Photoshootsandevents → redirect to SmugMug archive
  if (pathname.startsWith("/Photoshootsandevents/")) {
    const smugmugPath = pathname.replace("/Photoshootsandevents/", "/Other/Photo-Shoots/");
    return new Response(null, {
      status: 301,
      headers: { Location: `https://wayne-heim.smugmug.com${smugmugPath}` },
    });
  }

  const legacyGonePrefixes = [
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
      
      if (correctGalleryPaths && correctGalleryPaths.length > 0 && isWhitelistedGalleryParent(pathname)) {
        // Image found in curated gallery - 301 redirect to preserve authority
        const redirectUrl = `${correctGalleryPaths[0]}/${imageId}`;
        console.log(`[smart-410] Legacy path ${pathname} → 301 to ${redirectUrl}`);
        return new Response(null, {
          status: 301,
          headers: { Location: redirectUrl },
        });
      }
      if (correctGalleryPaths && correctGalleryPaths.length > 0) {
        console.log(`[smart-410] Blocked smart redirect for non-whitelisted parent: ${pathname}`);
      }
      // Image ID provided but not found anywhere → custom 404
      console.log(`[smart-410] Legacy image ${imageId} not found in any gallery → /404`);
    }
    // No image ID or image not found → custom 404
    return redirectToCustom404();
  }

  // ✅ REDIRECT: Legacy Pictorialist paths → current Pictorialist page
  if (pathname.startsWith("/Pictorialist-Photography/")) {
    return new Response(null, {
      status: 301,
      headers: { Location: "/Pictorialist-Photography" },
    });
  }

  const response = await next();

  // Route page-level misses to branded custom 404 page.
  // Keep asset/API 404s untouched.
  if (
    response.status === 404 &&
    pathname !== "/404" &&
    context.request.method === "GET" &&
    !/\.[a-z0-9]+$/i.test(pathname)
  ) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/404" },
    });
  }

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
