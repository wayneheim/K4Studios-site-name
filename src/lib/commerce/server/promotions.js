import { calculateShipping } from "./shippingCalculator.js";

export const PROMOTION_CATALOG_OPTIONS = Object.freeze([
  { value: "", label: "All catalogs" },
  { value: "limited_editions", label: "Limited editions only (Chronicle + Legend)" },
  { value: "engrained", label: "Engrained only" },
  { value: "expedition", label: "Expeditions only" },
  { value: "excluding_engrained", label: "All except Engrained" },
]);

export function promotionCatalogMatchesItem(catalogScope, item) {
  switch (catalogScope || "") {
    case "": return true;
    case "collection": return (item.catalogScope || "collection") === "collection";
    case "expedition": return item.catalogScope === "expedition";
    case "limited_editions": return (item.catalogScope || "collection") === "collection" && ["chronicle", "legend"].includes(item.seriesKey);
    case "engrained": return item.seriesKey === "engrained";
    case "excluding_engrained": return item.seriesKey !== "engrained";
    default: return false;
  }
}

export function easternDate(at = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(at);
  const value = (type) => parts.find((part) => part.type === type).value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function normalizeCouponCode(value) {
  const code = String(value || "").trim().toUpperCase();
  if (code && !/^[A-Z0-9][A-Z0-9_-]{1,39}$/.test(code)) throw new Error("Coupon codes must have 2–40 letters, numbers, hyphens, or underscores.");
  return code;
}

export function promotionMatchesItem(promotion, item) {
  const scope = promotion.scope || {};
  return promotionCatalogMatchesItem(scope.catalogScope, item)
    && (!scope.seriesKeys?.length || scope.seriesKeys.includes(item.seriesKey))
    && (!scope.productKeys?.length || scope.productKeys.includes(item.productKey));
}

export function evaluatePromotion(promotion, { items, destination, shippingConfig, shippingCents, at = new Date() }) {
  const today = easternDate(at);
  if (!promotion.enabled || promotion.startsOn > today || (promotion.expiresOn && promotion.expiresOn < today)) return null;
  if (promotion.maxUses != null && promotion.usedCount >= promotion.maxUses) return null;
  if (promotion.maxUsesPerEmail != null && promotion.customerUsedCount >= promotion.maxUsesPerEmail) return null;
  const eligible = items.filter((item) => promotionMatchesItem(promotion, item));
  const eligibleCents = eligible.reduce((sum, item) => sum + item.lineTotalCents, 0);
  if (!eligible.length || eligibleCents < promotion.minimumCents) return null;
  let merchandiseDiscountCents = 0, shippingDiscountCents = 0;
  if (promotion.discountType === "free_shipping") {
    const remaining = items.filter((item) => !promotionMatchesItem(promotion, item));
    const remainingShipping = remaining.length ? calculateShipping({ items: remaining, destination, config: shippingConfig }).shippingCents : 0;
    shippingDiscountCents = Math.max(0, shippingCents - remainingShipping);
  } else if (promotion.discountType === "percent_off") {
    merchandiseDiscountCents = Math.round(eligibleCents * promotion.discountValue / 10000);
  } else if (promotion.discountType === "amount_off") {
    merchandiseDiscountCents = Math.min(eligibleCents, promotion.discountValue);
  }
  if (merchandiseDiscountCents + shippingDiscountCents <= 0) return null;
  return {
    id: promotion.id, name: promotion.name, code: promotion.code || null,
    discountType: promotion.discountType, configVersion: promotion.version,
    expiresOn: promotion.expiresOn || null, merchandiseDiscountCents, shippingDiscountCents,
  };
}
