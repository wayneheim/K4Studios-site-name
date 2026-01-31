var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// img-proxy.js
var MANIFEST_URL = "https://k4studios.com/image-manifest.json";
var MANIFEST_CACHE_TTL = 3600;
var SIZE_FALLBACK = {
  xl: ["xl", "l", "m", "s", "src"],
  l: ["l", "m", "s", "xl", "src"],
  m: ["m", "s", "l", "src"],
  s: ["s", "m", "src"],
  src: ["src", "s", "m", "l", "xl"]
};
var BING_BOT_PATTERN = /bingbot|msnbot|bingpreview/i;
var BING_MAX_SIZE = "m";
var manifestCache = null;
var manifestCacheTime = 0;
async function getManifest(ctx) {
  const now = Date.now();
  if (manifestCache && now - manifestCacheTime < MANIFEST_CACHE_TTL * 1e3) {
    return manifestCache;
  }
  const cache = caches.default;
  const cacheKey = new Request(MANIFEST_URL);
  let response = await cache.match(cacheKey);
  if (!response) {
    response = await fetch(MANIFEST_URL, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "K4-Image-Proxy-Worker/1.0"
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch manifest: ${response.status}`);
    }
    const responseToCache = new Response(response.clone().body, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${MANIFEST_CACHE_TTL}`
      }
    });
    ctx.waitUntil(cache.put(cacheKey, responseToCache));
  }
  manifestCache = await response.json();
  manifestCacheTime = now;
  return manifestCache;
}
__name(getManifest, "getManifest");
function isBingBot(request) {
  const ua = request.headers.get("User-Agent") || "";
  return BING_BOT_PATTERN.test(ua);
}
__name(isBingBot, "isBingBot");
function capSizeForBot(requestedSize, isBing) {
  if (!isBing) return requestedSize;
  const allowedSizes = ["s", "m", "src"];
  if (allowedSizes.includes(requestedSize)) {
    return requestedSize;
  }
  return BING_MAX_SIZE;
}
__name(capSizeForBot, "capSizeForBot");
function resolveImageUrl(manifest, imageId, requestedSize) {
  const imageData = manifest[imageId];
  if (!imageData) {
    return null;
  }
  const fallbackChain = SIZE_FALLBACK[requestedSize] || SIZE_FALLBACK.m;
  for (const size of fallbackChain) {
    if (imageData[size]) {
      return imageData[size];
    }
  }
  return null;
}
__name(resolveImageUrl, "resolveImageUrl");
async function proxyImage(smugMugUrl, request) {
  const imageResponse = await fetch(smugMugUrl, {
    headers: {
      // Pass through accept headers for format negotiation
      "Accept": request.headers.get("Accept") || "image/*",
      // Identify ourselves to SmugMug
      "User-Agent": "K4-Image-Proxy-Worker/1.0",
      // Pass referer if present (SmugMug may check this)
      ...request.headers.get("Referer") && { "Referer": request.headers.get("Referer") }
    }
  });
  if (!imageResponse.ok) {
    return new Response("Image not found", {
      status: imageResponse.status,
      headers: { "Cache-Control": "no-store" }
    });
  }
  return new Response(imageResponse.body, {
    status: 200,
    headers: {
      "Content-Type": imageResponse.headers.get("Content-Type") || "image/jpeg",
      "Content-Length": imageResponse.headers.get("Content-Length"),
      "Cache-Control": "public, max-age=31536000, immutable",
      // Security headers
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      // Don't leak origin
      "X-Proxy-Origin": "k4studios"
    }
  });
}
__name(proxyImage, "proxyImage");
function parseImageRoute(pathname) {
  const match = pathname.match(/^\/img\/(i-[a-zA-Z0-9]+)\/(s|m|l|xl|src)$/);
  if (!match) {
    return null;
  }
  return {
    imageId: match[1],
    size: match[2]
  };
}
__name(parseImageRoute, "parseImageRoute");
async function handleRequest(request, ctx) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/img/")) {
    return new Response("Not Found", { status: 404 });
  }
  const route = parseImageRoute(url.pathname);
  if (!route) {
    return new Response("Invalid image route. Use /img/{id}/{size}", {
      status: 400,
      headers: { "Cache-Control": "no-store" }
    });
  }
  try {
    const manifest = await getManifest(ctx);
    const isBing = isBingBot(request);
    const effectiveSize = capSizeForBot(route.size, isBing);
    const smugMugUrl = resolveImageUrl(manifest, route.imageId, effectiveSize);
    if (!smugMugUrl) {
      return new Response("Image not found", {
        status: 404,
        headers: { "Cache-Control": "max-age=60" }
        // Short cache for 404s
      });
    }
    return await proxyImage(smugMugUrl, request);
  } catch (error) {
    console.error("Image proxy error:", error);
    return new Response("Internal error", {
      status: 500,
      headers: { "Cache-Control": "no-store" }
    });
  }
}
__name(handleRequest, "handleRequest");
var img_proxy_default = {
  async fetch(request, env, ctx) {
    return handleRequest(request, ctx);
  }
};
export {
  img_proxy_default as default
};
//# sourceMappingURL=img-proxy.js.map
