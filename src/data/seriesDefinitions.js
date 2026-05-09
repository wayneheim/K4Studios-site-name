// Series Definitions — Single Source of Truth for series config
// Used by: SeriesOrderModal, GalleryEditorPro, editionState.js
// PRICING: Managed in pricingConfig.json via Edit Pricing button in EditorPro

// Series Icons — Unicode symbols for each series level
export const SERIES_ICONS = {
  sketch: "✽",       // Six petaled asterisk
  foundation: "✯",   // Outlined star
  chronicle: "⌘",    // Place of interest / command
  legend: "❖",       // Black diamond minus white X
  engrained: "◈",    // White diamond containing black small diamond
};

export const SERIES_DEFINITIONS = {
  sketch: {
    label: "Sketch",
    icon: "✽",
    description: "Open edition proof prints on archival matte paper.",
    showEdition: false,
    fulfillment: "contact",
    buttonLabel: "Contact Us to Order",
    sortOrder: 1,
  },
  foundation: {
    label: "Foundation",
    icon: "✯",
    description: "Open edition archival prints in collector-friendly sizes.",
    showEdition: false,
    fulfillment: "contact",
    buttonLabel: "Contact Us to Order",
    sortOrder: 2,
  },
  chronicle: {
    label: "Chronicle",
    icon: "⌘",
    description: "Limited edition of 100, unsigned, museum-quality archival print.",
    showEdition: true,
    editionLimit: 100,
    fulfillment: "contact", // mailto for now
    buttonLabel: "Contact Us to Order",
    sortOrder: 3,
  },
  legend: {
    label: "Legend",
    icon: "❖",
    description: "Ultra-limited edition of 12, signed, museum-grade canvas.",
    showEdition: true,
    editionLimit: 12,
    fulfillment: "contact",
    buttonLabel: "Contact Us to Order",
    sortOrder: 4,
  },
  // Engrained — has its own modal, not managed in standard series flow
  engrained: {
    label: "Engrained",
    icon: "◈",
    description: "One-of-a-kind wood-burned artwork on premium hardwood.",
    showEdition: true,
    editionLimit: 50,
    fulfillment: "contact",
    buttonLabel: "Inquire",
    sortOrder: 99, // Not shown in standard modal (has its own flow)
  },
};

// Helper to format price for display
export function formatPrice(amount) {
  if (!amount && amount !== 0) return "Call";
  return `$${amount.toLocaleString()}`;
}

// Get pricing entries as array of {size, price} for a series
// Returns null if no pricing available (display "Call")
// If excludeSizes is provided, filters out excluded sizes for that series
export function getSeriesPricingList(seriesKey, pricingData, excludeSizes = null) {
  const pricing = pricingData?.[seriesKey];
  if (!pricing || Object.keys(pricing).length === 0) return null;
  
  // Get excluded sizes for this series (if any)
  const excluded = excludeSizes?.[seriesKey] || [];
  
  return Object.entries(pricing)
    .filter(([size]) => !excluded.includes(size))
    .map(([size, price]) => ({
      size,
      price,
      display: `${size}: $${price.toLocaleString()}`,
    }));
}

// Fetch runtime config (pricing + all copy) from server or static fallback
export async function fetchPricingConfig() {
  // Try Netlify function first (works for local dev and writes)
  try {
    const res = await fetch("/.netlify/functions/pricingConfig", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      // Check if we actually got useful data (not just empty defaults)
      if (data.infoCopy || data.cardCopy || (data.pricing && Object.keys(data.pricing).length > 0)) {
        return {
          pricing: data.pricing || null,
          descriptions: data.descriptions || null,
          cardCopy: data.cardCopy || null,
          infoCopy: data.infoCopy || null,
        };
      }
      // Function returned empty data, fall through to static file
      console.warn("[seriesDefinitions] Function returned empty data, trying static fallback");
    }
  } catch (err) {
    console.warn("[seriesDefinitions] Function failed, trying static fallback:", err.message);
  }

  // Fallback to static file (works in production)
  try {
    const res = await fetch("/pricingConfig.json", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      return {
        pricing: data.pricing || null,
        descriptions: data.descriptions || null,
        cardCopy: data.cardCopy || null,
        infoCopy: data.infoCopy || null,
      };
    }
  } catch (err) {
    console.error("[seriesDefinitions] Static fallback also failed:", err);
  }

  return { pricing: null, descriptions: null, cardCopy: null, infoCopy: null };
}

// ========== SERIES REGISTRY ==========
// Chronicle/Legend assignments are stored in seriesRegistry.json, not in .mjs image files.
// This cache is loaded once and used to enrich image data with series info.

let registryCache = null;
let registryLoadPromise = null;

// Load series registry (cached - for initial page load, not for admin editing)
export async function loadSeriesRegistry() {
  if (registryCache) return registryCache;
  if (registryLoadPromise) return registryLoadPromise;
  
  registryLoadPromise = (async () => {
    try {
      // Always add a querystring cache-buster.
      // We've seen CDN/edge cache a 404 for the bare URL; a querystring reliably bypasses that.
      const cacheBuster = Date.now();
      const res = await fetch(`/data/seriesRegistry.json?_t=${cacheBuster}`, { cache: "no-store" });
      if (res.ok) {
        registryCache = await res.json();
        return registryCache;
      }
    } catch (err) {
      console.warn("[seriesDefinitions] Failed to load series registry:", err.message);
    }
    // Return empty registry on failure
    registryCache = { images: {}, series: {} };
    return registryCache;
  })();
  
  return registryLoadPromise;
}

// Load series registry FRESH from API (bypasses cache, for modals that need latest data)
export async function loadSeriesRegistryFresh() {
  try {
    const cacheBuster = Date.now();
    const res = await fetch(`/.netlify/functions/seriesRegistry?_t=${cacheBuster}`, { 
      cache: "no-store" 
    });
    if (res.ok) {
      const data = await res.json();
      // Update the cache too
      registryCache = data;
      return data;
    }
  } catch (err) {
    console.warn("[seriesDefinitions] Failed to load fresh series registry:", err.message);
  }
  // Fall back to cached version if fresh fetch fails
  return registryCache || { images: {}, series: {} };
}

// Get series ID for an image from the registry
// Registry v2.0 uses composite keys (imageId:galleryPath), so we search for matching prefix
function getSeriesIdFromRegistry(imageId, registry = registryCache) {
  if (!registry || !imageId) return null;
  
  // First try direct lookup (old format)
  let seriesId = registry.images?.[imageId];
  
  // If not found, search for composite keys that start with this imageId
  if (!seriesId && registry.images) {
    for (const [key, sId] of Object.entries(registry.images)) {
      if (key.startsWith(imageId + ":")) {
        seriesId = sId;
        break;
      }
    }
  }
  
  return seriesId;
}

// Get series tiers for an image ID from the registry
export function getSeriesTiersFromRegistry(imageId, registry = registryCache) {
  const seriesId = getSeriesIdFromRegistry(imageId, registry);
  if (!seriesId) return [];
  const series = registry.series?.[seriesId];
  return series?.tiers || [];
}

// Get excludeSizes for an image ID from the registry
// Returns an object like { "foundation": ["11\" x 14\""], "chronicle": [] }
export function getExcludeSizesFromRegistry(imageId, registry = registryCache) {
  const seriesId = getSeriesIdFromRegistry(imageId, registry);
  if (!seriesId) return {};
  const series = registry.series?.[seriesId];
  return series?.excludeSizes || {};
}

// Helper to get effective series for an image (includes sketch by default)
// Now reads from seriesRegistry instead of image.availableSeries
export function getEffectiveSeries(image, registry = registryCache) {
  // Get tiers from registry first, fall back to image.availableSeries for backward compat
  let series = getSeriesTiersFromRegistry(image?.id, registry);
  if (series.length === 0 && image?.availableSeries) {
    // Backward compatibility: if not in registry, check image property
    series = [...image.availableSeries];
  }
  
  // Sketch is ALWAYS included unless explicitly suppressed
  if (!image?.noSketch && !series.includes("sketch")) {
    series = ["sketch", ...series];
  }
  // Filter out engrained — it has its own modal
  return series.filter(s => s !== "engrained");
}
