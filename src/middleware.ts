import type { MiddlewareHandler } from "astro";

function stripNestedTags(html: string): { cleaned: string; changed: boolean } {
  let changed = false;

  // Allow only the first <html>
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

  // Allow only the first <head>
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

  // Allow only the first <body>
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

  // 🚨 Extra cleanup: remove <title>, <meta>, <link>, JSON-LD <script> if inside <body>
  html = html.replace(
    /(<body[\s\S]*?)(<title[\s\S]*?<\/title>|<meta[^>]*>|<link[^>]*>|<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>)(?=[\s\S]*<\/body>)/gi,
    (match, before) => {
      changed = true;
      return before; // drop the bad tag, keep rest
    }
  );

  // 🚨 Remove duplicate <div id="overlay-root">
  html = html.replace(/(<div id="overlay-root"[^>]*><\/div>)([\s\S]*)(?=<\/body>)/gi, (match, first, rest) => {
    // keep only the first one
    const deduped = rest.replace(/<div id="overlay-root"[^>]*><\/div>/gi, "");
    if (deduped.length !== rest.length) changed = true;
    return first + deduped;
  });

  // 🚨 Remove duplicate <svg id="sharpen"> filters
  html = html.replace(/(<svg[^>]*id="sharpen"[\s\S]*?<\/svg>)([\s\S]*)(?=<\/body>)/gi, (match, first, rest) => {
    const deduped = rest.replace(/<svg[^>]*id="sharpen"[\s\S]*?<\/svg>/gi, "");
    if (deduped.length !== rest.length) changed = true;
    return first + deduped;
  });

  return { cleaned: html, changed };
}

export const onRequest: MiddlewareHandler = async (context, next) => {
  const response = await next();
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("text/html")) {
    const body = await response.text();
    const { cleaned, changed } = stripNestedTags(body);

    if (changed) {
      console.log(`🧹 Cleaned nested tags on ${context.url.pathname}`);
    }

    return new Response(cleaned, {
      status: response.status,
      headers: response.headers,
    });
  }

  return response;
};
