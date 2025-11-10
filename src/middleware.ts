// src/middleware.ts
import type { MiddlewareHandler } from "astro";

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

  // ✅ Strip incomplete ImageObject structured data (SmugMug)
  html = html.replace(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    (match, content) => {
      try {
        const json = JSON.parse(content.trim());
        const items = Array.isArray(json) ? json : [json];
        const shouldRemove = items.some(
          (item) =>
            item["@type"] === "ImageObject" && (!item.creditText || item.creator?.["@type"] !== "Person")
        );
        if (shouldRemove) {
          changed = true;
          console.log("🧹 Removed incomplete SmugMug JSON-LD block");
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

export const onRequest: MiddlewareHandler = async (context, next) => {
  const response = await next();
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("text/html")) {
    const body = await response.text();
    // Skip cleaning for large responses to avoid memory issues in Cloudflare
    if (body.length > 1000000) return response;

    const { cleaned, changed } = stripNestedTags(body);

    if (changed) console.log(`🧹 Cleaned HTML on ${context.url.pathname}`);

    return new Response(cleaned, {
      status: response.status,
      headers: response.headers,
    });
  }

  return response;
};
