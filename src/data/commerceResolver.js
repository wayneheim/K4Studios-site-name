import pricingConfig from "./pricingConfig.json";
import seriesRegistry from "./seriesRegistry.json";
import { galleryData as engrainedGalleryData } from "./Other/K4-Select-Series/Engrained/Engrained-Series.mjs";
import { SERIES_DEFINITIONS } from "./seriesDefinitions.js";
import { getEffectiveSeries } from "./seriesAvailability.js";

const STANDARD_SERIES = ["sketch", "foundation", "chronicle", "legend"];
const ENGRAINED_PATH = "/Other/K4-Select-Series/Engrained/Engrained-Series";
const K4_ORGANIZATION_ID = "https://www.k4studios.com/#organization";
const SKETCH_SERIES_SHIPPING_USD = "10.00";
const SKETCH_SERIES_SHIPPING_SERVICE = "Standard Shipping";
const K4_RETURN_POLICY_URL = "https://www.k4studios.com/Returns-and-Refunds";

export function getK4MerchantReturnPolicy() {
  return {
    "@type": "MerchantReturnPolicy",
    "@id": `${K4_RETURN_POLICY_URL}#policy`,
    applicableCountry: "US",
    returnPolicyCountry: "US",
    returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
    merchantReturnLink: K4_RETURN_POLICY_URL,
  };
}

export function getSketchOfferShippingDetails() {
  return {
    "@type": "OfferShippingDetails",
    name: SKETCH_SERIES_SHIPPING_SERVICE,
    shippingLabel: SKETCH_SERIES_SHIPPING_SERVICE,
    shippingRate: {
      "@type": "MonetaryAmount",
      value: SKETCH_SERIES_SHIPPING_USD,
      currency: "USD",
    },
    shippingDestination: {
      "@type": "DefinedRegion",
      addressCountry: "US",
    },
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      handlingTime: {
        "@type": "QuantitativeValue",
        minValue: 2,
        maxValue: 5,
        unitCode: "DAY",
      },
      transitTime: {
        "@type": "QuantitativeValue",
        minValue: 3,
        maxValue: 7,
        unitCode: "DAY",
      },
    },
  };
}

function pathToDatasetPath(galleryPath = "") {
  const clean = String(galleryPath || "").replace(/^\/+/, "").replace(/\/+$/, "");
  if (!clean) return "";
  return `/src/data/${clean}.mjs`;
}

function findSeriesId(imageId, galleryPath, registry = seriesRegistry) {
  if (!imageId || !registry?.images) return null;

  const candidates = [
    `${imageId}:${pathToDatasetPath(galleryPath)}`,
    `${imageId}:${galleryPath}`,
    imageId,
  ].filter(Boolean);

  for (const key of candidates) {
    if (registry.images[key]) return registry.images[key];
  }

  for (const [key, seriesId] of Object.entries(registry.images)) {
    if (key.startsWith(`${imageId}:`)) return seriesId;
  }

  return null;
}

function getSeriesPricingList(seriesKey, excludeSizes = {}) {
  const pricing = pricingConfig?.pricing?.[seriesKey];
  if (!pricing || Object.keys(pricing).length === 0) return [];

  const excluded = excludeSizes?.[seriesKey] || [];
  return Object.entries(pricing)
    .filter(([size]) => !excluded.includes(size))
    .map(([size, price]) => ({
      size,
      price: Number(price),
      label: `${size}: $${Number(price).toLocaleString()}`,
    }));
}

function moneyToNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function getInStockCount(inventory = {}) {
  return inventory.inStock || Math.max(0, (inventory.printed || 0) - (inventory.sold || 0));
}

function findEngrainedForPaperImage(imageId) {
  return engrainedGalleryData.find((item) => item?.linkedImageId === imageId && !['hidden', 'hide', 'ghost', 'non', 'none', ''].includes(String(item.visibility ?? 'show').trim().toLowerCase())) || null;
}

function resolveStandardCommerce({ image, galleryPath, pageUrl }) {
  const seriesId = findSeriesId(image?.id, galleryPath);
  const series = seriesId ? seriesRegistry.series?.[seriesId] : null;
  const oneImageMovie = Boolean(series?.oneImageMovie || image?.oneImageMovie);
  const tierSet = new Set(getEffectiveSeries(image, series));

  const tiers = STANDARD_SERIES
    .filter((seriesKey) => tierSet.has(seriesKey) && SERIES_DEFINITIONS[seriesKey])
    .map((seriesKey) => {
      const def = SERIES_DEFINITIONS[seriesKey];
      const editionState = series?.editionData?.[seriesKey] || null;
      const sold = editionState?.sold ?? Object.values(editionState?.soldBySize || {}).reduce((sum, value) => sum + (value || 0), 0);
      const remaining = def.showEdition && def.editionLimit ? Math.max(0, def.editionLimit - sold) : null;
      const pricing = getSeriesPricingList(seriesKey, series?.excludeSizes || {});
      return {
        key: seriesKey,
        label: def.label,
        icon: def.icon,
        sortOrder: def.sortOrder || 99,
        description:
          pricingConfig?.cardCopy?.[seriesKey] ||
          pricingConfig?.descriptions?.[seriesKey] ||
          def.description,
        showEdition: Boolean(def.showEdition),
        editionLimit: def.editionLimit || null,
        remaining,
        pricing: pricing.map((entry) => {
          const printed = editionState?.printedBySize?.[entry.size] || 0;
          const soldForSize = editionState?.soldBySize?.[entry.size] || 0;
          const quickShip = printed - soldForSize > 0;
          return {
            ...entry,
            quickShip,
          };
        }),
      };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const engrained = findEngrainedForPaperImage(image?.id);
  const engrainedLink = engrained
    ? {
        key: "engrained",
        label: "Engrained",
        title: "Also Available in Engrained Series",
        description:
          "This image is also available as a stunning wood print on Baltic birch, featuring Wayne's signature UV layering process.",
        imageSize: engrained.imageSize || null,
        price: engrained.price || null,
        priceValue: moneyToNumber(engrained.price),
        availability: engrained.availability || null,
        inStock: getInStockCount(engrained.inventory || {}) > 0,
        galleryUrl: `${ENGRAINED_PATH}/${engrained.id}`,
      }
    : null;

  const offerPrices = tiers.flatMap((tier) => tier.pricing.map((entry) => entry.price));
  if (engrainedLink?.priceValue) offerPrices.push(engrainedLink.priceValue);

  return {
    mode: "standard",
    imageId: image?.id || "",
    imageTitle: image?.title || "",
    pageUrl,
    currency: "USD",
    seriesId,
    oneImageMovie,
    tiers,
    engrainedLink,
    schema: buildCommerceSchema({ pageUrl, offerPrices }),
    merchantOffer: buildSketchMerchantOffer({ pageUrl, tiers }),
  };
}

function resolveEngrainedCommerce({ image, pageUrl }) {
  const priceValue = moneyToNumber(image?.price);
  const hasInventory = getInStockCount(image?.inventory || {}) > 0;
  const paperUrl = image?.linkedImageId && image?.linkedGalleryPath
    ? `/${String(image.linkedGalleryPath)
        .replace(/^src\/data\//, "")
        .replace(/\.mjs$/i, "")
        .replace(/^\/+/, "")}/${image.linkedImageId}`
    : "";

  const offerPrices = priceValue ? [priceValue] : [];

  return {
    mode: "engrained",
    imageId: image?.id || "",
    imageTitle: image?.title || "",
    pageUrl,
    currency: "USD",
    oneImageMovie: Boolean(image?.oneImageMovie),
    engrained: {
      label: "Engrained Series",
      imageSize: image?.imageSize || null,
      price: image?.price || null,
      priceValue,
      editionSize: image?.editionSize || null,
      availability: image?.availability || null,
      shipping: image?.shipping || null,
      hasInventory,
      paperUrl,
    },
    schema: buildCommerceSchema({ pageUrl, offerPrices }),
  };
}

function buildCommerceSchema({ pageUrl, offerPrices }) {
  const prices = offerPrices.filter((price) => Number.isFinite(price));
  if (prices.length === 0) return null;

  return {
    "@type": "AggregateOffer",
    url: pageUrl,
    priceCurrency: "USD",
    lowPrice: Math.min(...prices),
    highPrice: Math.max(...prices),
    offerCount: prices.length,
    availability: "https://schema.org/InStock",
    seller: { "@id": "https://www.k4studios.com/#organization" },
  };
}

function buildSketchMerchantOffer({ pageUrl, tiers }) {
  const sketchTier = Array.isArray(tiers)
    ? tiers.find((tier) => tier?.key === "sketch")
    : null;
  const prices = Array.isArray(sketchTier?.pricing)
    ? sketchTier.pricing
        .map((entry) => Number(entry?.price))
        .filter((price) => Number.isFinite(price))
    : [];

  if (!sketchTier || prices.length === 0) return null;

  return {
    "@type": "Offer",
    url: pageUrl,
    price: Math.min(...prices),
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
    itemCondition: "https://schema.org/NewCondition",
    seller: { "@id": K4_ORGANIZATION_ID },
    shippingDetails: getSketchOfferShippingDetails(),
  };
}

export function resolveImageCommerce({ image, galleryPath = "", pageUrl = "" }) {
  if (!image?.id) return null;

  if (String(galleryPath).includes("/Engrained/Engrained-Series")) {
    return resolveEngrainedCommerce({ image, pageUrl });
  }

  return resolveStandardCommerce({ image, galleryPath, pageUrl });
}
