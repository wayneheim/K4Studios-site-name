import { calculateShipping } from "./shippingCalculator.js";
import { calculateTax } from "./taxCalculator.js";

export function calculateCheckoutQuote({ verifiedItems, destination, shippingConfig, taxConfig, promotion = null }) {
  if (!Array.isArray(verifiedItems) || verifiedItems.length === 0) throw new Error("The cart is empty.");

  const currencies = new Set(verifiedItems.map((item) => item.currency));
  if (currencies.size !== 1 || !currencies.has("USD")) throw new Error("Checkout supports USD carts only.");

  const merchandiseSubtotalCents = verifiedItems.reduce((total, item) => total + item.lineTotalCents, 0);
  const baseShipping = calculateShipping({ items: verifiedItems, destination, config: shippingConfig });
  const merchandiseDiscountCents = promotion?.merchandiseDiscountCents || 0;
  const shippingDiscountCents = promotion?.shippingDiscountCents || 0;
  if (![merchandiseDiscountCents, shippingDiscountCents].every((cents) => Number.isSafeInteger(cents) && cents >= 0)
    || merchandiseDiscountCents > merchandiseSubtotalCents || shippingDiscountCents > baseShipping.shippingCents) throw new Error("Invalid promotion discount.");
  const merchandiseCents = merchandiseSubtotalCents - merchandiseDiscountCents;
  const shipping = Object.freeze({ ...baseShipping, subtotalCents: baseShipping.shippingCents, discountCents: shippingDiscountCents, shippingCents: baseShipping.shippingCents - shippingDiscountCents });
  const tax = calculateTax({
    merchandiseCents,
    shippingCents: shipping.shippingCents,
    destination,
    config: taxConfig,
  });
  const totalCents = merchandiseCents + shipping.shippingCents + tax.taxCents;
  if (totalCents <= 0) throw new Error("The order total must be greater than zero for checkout.");
  if (shipping.mode !== tax.mode) throw new Error("Shipping and tax configuration modes do not match.");

  return Object.freeze({
    quoteVersion: 3,
    mode: tax.mode,
    currency: "USD",
    merchandiseCents,
    merchandiseSubtotalCents,
    merchandiseDiscountCents,
    shippingSubtotalCents: baseShipping.shippingCents,
    shippingDiscountCents,
    promotion,
    shippingCents: shipping.shippingCents,
    taxCents: tax.taxCents,
    totalCents,
    shipping,
    tax,
    items: verifiedItems,
    calculatedAt: new Date().toISOString(),
  });
}

