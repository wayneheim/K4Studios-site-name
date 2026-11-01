import { calculateShipping } from "./shippingCalculator.js";
import { calculateTax } from "./taxCalculator.js";

export function calculateCheckoutQuote({ verifiedItems, destination, shippingConfig, taxConfig }) {
  if (!Array.isArray(verifiedItems) || verifiedItems.length === 0) throw new Error("The cart is empty.");

  const currencies = new Set(verifiedItems.map((item) => item.currency));
  if (currencies.size !== 1 || !currencies.has("USD")) throw new Error("Checkout supports USD carts only.");

  const merchandiseCents = verifiedItems.reduce((total, item) => total + item.lineTotalCents, 0);
  const shipping = calculateShipping({ items: verifiedItems, destination, config: shippingConfig });
  const tax = calculateTax({
    merchandiseCents,
    shippingCents: shipping.shippingCents,
    destination,
    config: taxConfig,
  });
  const totalCents = merchandiseCents + shipping.shippingCents + tax.taxCents;
  if (shipping.mode !== tax.mode) throw new Error("Shipping and tax configuration modes do not match.");

  return Object.freeze({
    quoteVersion: 2,
    mode: tax.mode,
    currency: "USD",
    merchandiseCents,
    shippingCents: shipping.shippingCents,
    taxCents: tax.taxCents,
    totalCents,
    shipping,
    tax,
    items: verifiedItems,
    calculatedAt: new Date().toISOString(),
  });
}

