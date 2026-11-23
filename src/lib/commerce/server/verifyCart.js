import { buildEngrainedCartProduct, getCatalogProduct } from "../../../data/commerce/catalog.js";
import seriesRegistry from "../../../data/seriesRegistry.json";
import engrainedData from "../../../../public/data/engrainedData.json";
import imageIdMap from "../../../../public/imageIdMap.json";
import smugmugFulfillmentLinks from "../../../data/commerce/smugmugFulfillmentLinks.generated.json";
import collectorNotesByImage from "../../../data/commerce/collectorNotes.generated.json";
import { expeditions } from "../../../data/Other/Expeditions/shoots.ts";
import { dollarsToCents } from "./money.js";
import { getSizeCount, buildArtistProofProduct } from '../../../data/editionPolicy.js';

const SITE_ORIGIN = "https://www.k4studios.com";

function getArtworkUrl(imageId, seriesKey, engrainedRecord) {
  if (seriesKey === "engrained" && engrainedRecord?.id) {
    return `${SITE_ORIGIN}/Other/K4-Select-Series/Engrained/Engrained-Series/${engrainedRecord.id}`;
  }

  const mappedGallery = Array.isArray(imageIdMap?.[imageId])
    ? imageIdMap[imageId].find((path) => typeof path === "string" && path.startsWith("/"))
    : "";
  const galleryPath = String(mappedGallery || "/Galleries").replace(/\/+$/, "");
  const pageImageId = seriesKey === "sketch" ? `${imageId}-sketch` : imageId;
  return `${SITE_ORIGIN}${galleryPath}/${pageImageId}`;
}

function getExpedition(product) {
  return product?.catalogScope === "expedition"
    ? expeditions.find((expedition) => expedition.slug === product.expeditionSlug) || null
    : null;
}

function getSeriesRecord(imageId) {
  const images = seriesRegistry?.images || {};
  const directSeriesId = images[imageId];
  const matchedSeriesId = directSeriesId || Object.entries(images)
    .find(([key]) => key.startsWith(`${imageId}:`))?.[1];
  const seriesId = matchedSeriesId ? String(matchedSeriesId) : "";
  const record = seriesId ? seriesRegistry?.series?.[seriesId] || null : null;
  return record ? { seriesId, record } : null;
}

function getVerifiedProduct(rawItem, imageId) {
  const standardProduct = getCatalogProduct(rawItem?.productKey);
  if (standardProduct) return { product: standardProduct, engrainedRecord: null };
  const apBase = String(rawItem?.productKey || '').endsWith('-ap') ? getCatalogProduct(String(rawItem.productKey).slice(0, -3)) : null;
  if (apBase?.editionLimit && ['chronicle', 'legend'].includes(apBase.seriesKey)) {
    const proof = getSeriesRecord(imageId)?.record?.editionData?.[apBase.seriesKey]?.artistProofsBySize?.[apBase.size];
    return { product: buildArtistProofProduct(apBase, proof), engrainedRecord: null };
  }

  const engrainedRecord = engrainedData?.items?.find((item) => (
    (item?.linkedImageId === imageId || item?.id === imageId)
    && [ `engrained-${item.id}`, `engrained-${item.id}-ap` ].includes(rawItem?.productKey)
    && !["hidden", "hide", "ghost", "non", "none", ""].includes(String(item?.visibility ?? "show").trim().toLowerCase())
  ));
  if (!engrainedRecord) return { product: null, engrainedRecord: null };

  const product = buildEngrainedCartProduct({
      engrainedId: engrainedRecord.id,
      price: engrainedRecord.price,
      imageSize: engrainedRecord.imageSize,
      editionSize: engrainedRecord.editionSize,
      url: `/Other/K4-Select-Series/Engrained/Engrained-Series/${engrainedRecord.id}`,
    });
  return { engrainedRecord, product: rawItem.productKey.endsWith('-ap') ? buildArtistProofProduct(product, engrainedRecord.artistProof) : product };
}

export function verifyCartItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > 25) {
    throw new Error("A cart must contain between 1 and 25 line items.");
  }

  const verifiedItems = [];
  for (const rawItem of rawItems) {
    const imageId = String(rawItem?.imageId || "").replace(/-sketch$/i, "");
    const imageTitle = String(rawItem?.imageTitle || "K4 Studios fine art print").trim().slice(0, 127);
    const quantity = Number.parseInt(rawItem?.quantity, 10);
    const { product, engrainedRecord } = getVerifiedProduct(rawItem, imageId);

    if (!product?.checkoutEnabled || !/^i-[A-Za-z0-9]+$/.test(imageId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      throw new Error("The cart contains an unavailable or invalid product.");
    }

    let remaining = null;
    let seriesMatch = null;
    const expedition = getExpedition(product);
    if (product.catalogScope === "expedition") {
      if (!expedition) throw new Error("This Expedition print is no longer available.");
    } else if (product.seriesKey === "engrained") {
      if (!engrainedRecord) throw new Error("This Engrained edition is no longer available.");
      const sold = product.editionType === 'ap' ? Number(engrainedRecord.artistProof?.sold) || 0 : Number(engrainedRecord.inventory?.sold) || 0;
      remaining = Math.max(0, (Number(product.editionLimit) || 0) - sold);
      if (remaining !== null && quantity > remaining) {
        throw new Error("The requested quantity exceeds the remaining Engrained edition availability.");
      }
    } else {
      seriesMatch = getSeriesRecord(imageId);
      const seriesRecord = seriesMatch?.record;
      if (!seriesRecord || !Array.isArray(seriesRecord.tiers) || !seriesRecord.tiers.includes(product.seriesKey)) {
        throw new Error("This print series is not available for the selected artwork.");
      }
      const excludedSizes = seriesRecord?.excludeSizes?.[product.seriesKey] || [];
      if (excludedSizes.includes(product.size)) throw new Error("This print size is not available for the selected artwork.");

      const editionState = seriesRecord?.editionData?.[product.seriesKey] || {};
      const sold = product.editionType === 'ap' ? Number(editionState.artistProofsBySize?.[product.size]?.sold) || 0 : getSizeCount(editionState.soldBySize, product.size);
      if (product.editionLimit && product.editionType !== 'ap' && Number(editionState.sold) > 0 && !Object.keys(editionState.soldBySize || {}).length) {
        throw new Error('This edition requires its existing sales to be assigned to sizes before checkout.');
      }
      remaining = product.editionLimit ? Math.max(0, product.editionLimit - sold) : null;
      if (remaining !== null && quantity > remaining) {
        throw new Error("The requested quantity exceeds the remaining edition availability.");
      }
    }

    const unitPriceCents = dollarsToCents(product.unitPrice);
    verifiedItems.push(Object.freeze({
      productKey: product.productKey,
      imageId,
      imageTitle,
      artworkUrl: expedition
        ? `${SITE_ORIGIN}/Other/Expeditions/${expedition.slug}`
        : getArtworkUrl(imageId, product.seriesKey, engrainedRecord),
      fulfillmentUrl: expedition
        ? `${String(expedition.galleryUrl).replace(/\/+$/, "")}/${imageId}/buy`
        : product.fulfillment === "smugmug-manual"
          ? String(smugmugFulfillmentLinks?.[imageId] || "")
          : "",
      collectorNotes: String(collectorNotesByImage?.[imageId] || "").slice(0, 5000),
      seriesKey: product.seriesKey,
      seriesLabel: product.seriesLabel,
      size: product.size,
      finish: product.finish,
      shippingRateKey: product.shippingRateKey || product.productKey,
      catalogScope: product.catalogScope || "collection",
      expeditionSlug: product.expeditionSlug || null,
      medium: product.medium,
      edition: product.edition,
      editionType: product.editionType || (product.editionLimit ? 'numbered' : 'open'),
      editionLimit: Number(product.editionLimit) || null,
      editionBaselineSold: remaining === null ? 0 : Math.max(0, (Number(product.editionLimit) || 0) - remaining),
      inventoryKey: product.editionLimit
        ? (product.seriesKey === "engrained"
          ? `engrained:${engrainedRecord.id}${product.editionType === 'ap' ? ':ap' : ''}`
          : `series:${seriesMatch.seriesId}:${product.seriesKey}:${product.productKey}`)
        : null,
      fulfillment: product.seriesKey === "engrained" ? "engrained" : product.fulfillment,
      quantity,
      currency: product.currency,
      unitPriceCents,
      lineTotalCents: unitPriceCents * quantity,
      remaining,
    }));
  }

  return Object.freeze(verifiedItems);
}

