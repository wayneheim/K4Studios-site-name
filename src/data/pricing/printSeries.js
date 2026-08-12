import pricingConfig from "../pricingConfig.json";

export const STANDARD_PRINT_SERIES_KEYS = ["sketch", "foundation", "chronicle", "legend"];

const SERIES_META = {
  sketch: {
    key: "sketch",
    symbol: "✽",
    label: "Sketch",
    name: "Sketch Series",
    subtitle: "Open edition study prints",
    collectorSummary:
      "An intimate open-edition entry point into the K4 collection — small in scale, complete in presence, and designed for close personal viewing.",
    learnMoreHref: "/Other/Series",
    editionNote: "Open edition",
    showEdition: false,
    fulfillment: "contact",
    buttonLabel: "Contact Us to Order",
    sortOrder: 1,
  },
  foundation: {
    key: "foundation",
    symbol: "★",
    label: "Foundation",
    name: "Foundation Series",
    subtitle: "Archival open edition prints",
    collectorSummary:
      "Open-edition archival prints with more wall presence while preserving the quiet narrative weight of the work.",
    learnMoreHref: "/Other/Series",
    editionNote: "Open edition archival",
    showEdition: false,
    fulfillment: "contact",
    buttonLabel: "Contact Us to Order",
    sortOrder: 2,
  },
  chronicle: {
    key: "chronicle",
    symbol: "⌘",
    label: "Chronicle",
    name: "Chronicle Series",
    subtitle: "Signed limited editions",
    collectorSummary:
      "Signed limited editions where scarcity, provenance, and permanence enter the work’s story.",
    learnMoreHref: "/Other/Series",
    editionNote: "Signed limited edition. Remaining counts are image-specific in the order modal.",
    showEdition: true,
    editionLimit: 50,
    fulfillment: "contact",
    buttonLabel: "Contact Us to Order",
    sortOrder: 3,
  },
  legend: {
    key: "legend",
    symbol: "❖",
    label: "Legend",
    name: "Legend Series",
    subtitle: "Ultra-limited statement works",
    collectorSummary:
      "Ultra-limited statement works created for collectors who want scale, presence, and legacy on the wall.",
    learnMoreHref: "/Other/Series",
    editionNote: "Ultra-limited signed edition. Remaining counts are image-specific in the order modal.",
    showEdition: true,
    editionLimit: 25,
    fulfillment: "contact",
    buttonLabel: "Contact Us to Order",
    sortOrder: 4,
  },
};

const SPECIALTY_SERIES = [
  {
    key: "engrained",
    symbol: "◈",
    label: "Engrained",
    name: "Engrained Series",
    subtitle: "Baltic Birch wood-panel editions",
    description:
      "Select works are available as Baltic Birch wood-panel editions using K4's five-layer UV process.",
    href: "/Other/K4-Select-Series/Engrained",
    cta: "View Engrained Series →",
    showEdition: true,
    editionLimit: 5,
    fulfillment: "contact",
    buttonLabel: "Inquire",
    sortOrder: 99,
  },
];

const getPricingSource = (pricingData) => pricingData || pricingConfig.pricing || {};

const displaySize = (size) => String(size).replace(/\s*x\s*/i, " x ");

export function formatPrice(price) {
  if (price === null || price === undefined || price === "") return "Call";
  return `$${Number(price).toLocaleString("en-US")}`;
}

export function getSeriesPricingEntries(seriesKey, pricingData, excludeSizes = null) {
  const pricing = getPricingSource(pricingData)?.[seriesKey];
  if (!pricing || Object.keys(pricing).length === 0) return [];

  const excluded = excludeSizes?.[seriesKey] || [];

  return Object.entries(pricing)
    .filter(([size]) => !excluded.includes(size))
    .map(([size, price]) => ({
      size,
      displaySize: displaySize(size),
      price,
      displayPrice: formatPrice(price),
      display: `${displaySize(size)} · ${formatPrice(price)}`,
    }));
}

export function getStandardPrintSeries(config = pricingConfig) {
  const pricing = config.pricing || pricingConfig.pricing || {};
  const descriptions = config.descriptions || pricingConfig.descriptions || {};
  const cardCopy = config.cardCopy || pricingConfig.cardCopy || {};
  const infoCopy = config.infoCopy || pricingConfig.infoCopy || {};

  return STANDARD_PRINT_SERIES_KEYS.map((key) => {
    const meta = SERIES_META[key];
    return {
      ...meta,
      description: infoCopy[key]?.body || cardCopy[key] || descriptions[key] || "",
      shortDescription: cardCopy[key] || descriptions[key] || "",
      summaryDescription: descriptions[key] || "",
      title: infoCopy[key]?.title || meta.name,
      sizes: getSeriesPricingEntries(key, pricing),
    };
  });
}

export function getSpecialtyPrintSeries() {
  return SPECIALTY_SERIES;
}

export function getLowestStandardPrintPrice(pricingData) {
  const prices = STANDARD_PRINT_SERIES_KEYS.flatMap((key) =>
    getSeriesPricingEntries(key, pricingData).map((entry) => Number(entry.price))
  ).filter((price) => Number.isFinite(price));

  return Math.min(...prices);
}

export function getHighestStandardPrintPrice(pricingData) {
  const prices = STANDARD_PRINT_SERIES_KEYS.flatMap((key) =>
    getSeriesPricingEntries(key, pricingData).map((entry) => Number(entry.price))
  ).filter((price) => Number.isFinite(price));

  return Math.max(...prices);
}

export function getFormattedLowestStandardPrintPrice(pricingData) {
  return formatPrice(getLowestStandardPrintPrice(pricingData));
}

export function getSeriesDisplaySizeList(seriesKey, pricingData, excludeSizes = null) {
  return getSeriesPricingEntries(seriesKey, pricingData, excludeSizes)
    .map((entry) => entry.displaySize)
    .join(" and ");
}

export function getLowestSeriesPrintPrice(seriesKey, pricingData, excludeSizes = null) {
  const prices = getSeriesPricingEntries(seriesKey, pricingData, excludeSizes)
    .map((entry) => Number(entry.price))
    .filter((price) => Number.isFinite(price));

  return Math.min(...prices);
}

export function getFormattedLowestSeriesPrintPrice(seriesKey, pricingData, excludeSizes = null) {
  return formatPrice(getLowestSeriesPrintPrice(seriesKey, pricingData, excludeSizes));
}

export function getFormattedSeriesPrintPriceRange(seriesKey, pricingData, excludeSizes = null) {
  const prices = getSeriesPricingEntries(seriesKey, pricingData, excludeSizes)
    .map((entry) => Number(entry.price))
    .filter((price) => Number.isFinite(price));

  if (prices.length === 0) return "";

  const low = Math.min(...prices);
  const high = Math.max(...prices);

  return low === high ? formatPrice(low) : `${formatPrice(low)} to ${formatPrice(high)}`;
}

export function getAggregateOfferForCollection(imageCount) {
  return {
    "@type": "AggregateOffer",
    lowPrice: getLowestStandardPrintPrice(),
    highPrice: getHighestStandardPrintPrice(),
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
    offerCount: imageCount,
  };
}

export function getSeriesIcons() {
  return Object.fromEntries([
    ...getStandardPrintSeries().map((series) => [series.key, series.symbol]),
    ...getSpecialtyPrintSeries().map((series) => [series.key, series.symbol]),
  ]);
}

export function getSeriesDefinitionMap() {
  return Object.fromEntries([
    ...getStandardPrintSeries().map((series) => [
      series.key,
      {
        label: series.label,
        icon: series.symbol,
        description: series.summaryDescription || series.shortDescription,
        showEdition: series.showEdition,
        editionLimit: series.editionLimit,
        fulfillment: series.fulfillment,
        buttonLabel: series.buttonLabel,
        sortOrder: series.sortOrder,
      },
    ]),
    ...getSpecialtyPrintSeries().map((series) => [
      series.key,
      {
        label: series.label,
        icon: series.symbol,
        description: series.description,
        showEdition: series.showEdition,
        editionLimit: series.editionLimit,
        fulfillment: series.fulfillment,
        buttonLabel: series.buttonLabel,
        sortOrder: series.sortOrder,
      },
    ]),
  ]);
}
