import pricingConfig from "./pricingConfig.json";
import seriesRegistry from "./seriesRegistry.json";
import { galleryData as engrainedGalleryData } from "./Other/K4-Select-Series/Engrained/Engrained-Series.mjs";
import { SERIES_DEFINITIONS } from "./seriesDefinitions.js";

const FIRST_PARTY_BUY_LINK_HOSTS = new Set(["k4studios.com", "www.k4studios.com"]);
const BUY_LINK_PATH_PREFIXES = ["/Galleries/", "/Other/Photo-Shoots/"];
const BUY_LINK_SMUGMUG_HOST = "wayne-heim.smugmug.com";
const STANDARD_SERIES = ["sketch", "foundation", "chronicle", "legend"];
const ENGRAINED_PATH = "/Other/K4-Select-Series/Engrained/Engrained-Series";

function normalizeBuyLink(buyLink) {
  if (typeof buyLink !== "string") return null;

  const trimmed = buyLink.trim();
  if (!trimmed) return null;

  const normalizeUrl = (url) => {
    if (!FIRST_PARTY_BUY_LINK_HOSTS.has(url.hostname)) {
      return url.toString();
    }

    const hasSupportedPath = BUY_LINK_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
    if (!hasSupportedPath || !url.pathname.endsWith("/A")) {
      return null;
    }

    url.protocol = "https:";
    url.hostname = BUY_LINK_SMUGMUG_HOST;
    return url.toString();
  };

  try {
    if (trimmed.startsWith("/")) {
      return normalizeUrl(new URL(trimmed, "https://www.k4studios.com"));
    }

    return normalizeUrl(new URL(trimmed));
  } catch {
    return null;
  }
}

function buildMailtoLink(image, seriesKey, seriesDef, editionNumber, selectedSize = null, price = null) {
  const subject = encodeURIComponent(`Order Inquiry: ${image?.title || "Image"} - ${seriesDef.label} Series`);

  let body = "Hello,\n\nI am interested in ordering:\n\n";
  body += `Image: ${image?.title || "N/A"}\n`;
  body += `Image ID: ${image?.id || "N/A"}\n`;
  body += `Series: ${seriesDef.label}\n`;

  if (selectedSize) {
    body += `Size: ${selectedSize}`;
    if (price) {
      body += ` ($${Number(price).toLocaleString()})`;
    }
    body += "\n";
  }

  if (seriesDef.showEdition && editionNumber !== undefined) {
    body += `Edition: ${editionNumber + 1} of ${seriesDef.editionLimit}\n`;
  }

  body += "\nPlease provide ordering information.\n\n";
  body += "---\n";
  body += "Your Name:\n";
  body += "Preferred Contact (email or phone):\n";
  body += "---\n\n";
  body += "Thank you!";

  return `mailto:info@k4studios.com?subject=${subject}&body=${encodeURIComponent(body)}`;
}

function buildEngrainedMailtoLink(image, engrainedLink = null) {
  const subject = encodeURIComponent(`Order Inquiry: ${image?.title || "Image"} - Engrained Series`);

  let body = "Hello,\n\nI am interested in ordering:\n\n";
  body += `Image: ${image?.title || "N/A"}\n`;
  body += `Image ID: ${image?.id || "N/A"}\n`;
  body += "Series: Engrained (Baltic Birch Wood Print)\n";

  const imageSize = engrainedLink?.imageSize || image?.imageSize;
  const price = engrainedLink?.price || image?.price;
  if (imageSize) {
    body += `Size: ${imageSize}`;
    if (price) body += ` (${price})`;
    body += "\n";
  } else if (price) {
    body += `Price: ${price}\n`;
  }

  body += "\nPlease provide ordering information.\n\n";
  body += "---\n";
  body += "Your Name:\n";
  body += "Preferred Contact (email or phone):\n";
  body += "---\n\n";
  body += "Thank you!";

  return `mailto:info@k4studios.com?subject=${subject}&body=${encodeURIComponent(body)}`;
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
  return engrainedGalleryData.find((item) => item?.linkedImageId === imageId && item.visibility !== "ghost") || null;
}

function resolveStandardCommerce({ image, galleryPath, pageUrl }) {
  const seriesId = findSeriesId(image?.id, galleryPath);
  const series = seriesId ? seriesRegistry.series?.[seriesId] : null;
  const registryTiers = Array.isArray(series?.tiers) ? series.tiers : [];
  const fallbackTiers = Array.isArray(image?.availableSeries) ? image.availableSeries : [];
  const tierSet = new Set(registryTiers.length > 0 ? registryTiers : fallbackTiers);

  if (!image?.noSketch) tierSet.add("sketch");

  const tiers = STANDARD_SERIES
    .filter((seriesKey) => tierSet.has(seriesKey) && SERIES_DEFINITIONS[seriesKey])
    .map((seriesKey) => {
      const def = SERIES_DEFINITIONS[seriesKey];
      const editionState = series?.editionData?.[seriesKey] || null;
      const sold = editionState?.sold ?? Object.values(editionState?.soldBySize || {}).reduce((sum, value) => sum + (value || 0), 0);
      const remaining = def.showEdition && def.editionLimit ? Math.max(0, def.editionLimit - sold) : null;
      const pricing = getSeriesPricingList(seriesKey, series?.excludeSizes || {});
      const buyLinkHref = normalizeBuyLink(image?.buyLink);
      const shouldUseBuyLink = (seriesKey === "sketch" || seriesKey === "foundation") && !!buyLinkHref;

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
            orderUrl: shouldUseBuyLink
              ? buyLinkHref
              : buildMailtoLink(image, seriesKey, def, sold, entry.size, entry.price),
            external: shouldUseBuyLink,
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
        orderUrl: buildEngrainedMailtoLink(image, engrained),
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
    tiers,
    engrainedLink,
    schema: buildCommerceSchema({ pageUrl, offerPrices }),
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
    engrained: {
      label: "Engrained Series",
      imageSize: image?.imageSize || null,
      price: image?.price || null,
      priceValue,
      editionSize: image?.editionSize || null,
      availability: image?.availability || null,
      shipping: image?.shipping || null,
      hasInventory,
      orderUrl: buildEngrainedMailtoLink(image),
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
    availability: "https://schema.org/InStock",
    seller: { "@id": "https://www.k4studios.com/#organization" },
  };
}

export function resolveImageCommerce({ image, galleryPath = "", pageUrl = "" }) {
  if (!image?.id) return null;

  if (String(galleryPath).includes("/Engrained/Engrained-Series")) {
    return resolveEngrainedCommerce({ image, pageUrl });
  }

  return resolveStandardCommerce({ image, galleryPath, pageUrl });
}
