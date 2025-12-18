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
    fulfillment: "smugmug", // Uses buyLink
    buttonLabel: "Order",
    sortOrder: 1,
  },
  foundation: {
    label: "Foundation",
    icon: "✯",
    description: "Open edition archival prints in collector-friendly sizes.",
    showEdition: false,
    fulfillment: "smugmug",
    buttonLabel: "Order",
    sortOrder: 2,
  },
  chronicle: {
    label: "Chronicle",
    icon: "⌘",
    description: "Limited edition of 250, unsigned, museum-quality archival print.",
    showEdition: true,
    editionLimit: 250,
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
export function getSeriesPricingList(seriesKey, pricingData) {
  const pricing = pricingData?.[seriesKey];
  if (!pricing || Object.keys(pricing).length === 0) return null;
  
  return Object.entries(pricing).map(([size, price]) => ({
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

// Helper to get effective series for an image (includes sketch by default)
export function getEffectiveSeries(image) {
  const series = image?.availableSeries ? [...image.availableSeries] : [];
  // Sketch is ALWAYS included unless explicitly suppressed
  if (!image?.noSketch && !series.includes("sketch")) {
    series.unshift("sketch");
  }
  // Filter out engrained — it has its own modal
  return series.filter(s => s !== "engrained");
}
