import assert from "node:assert/strict";
import test from "node:test";
import { calculateCheckoutQuote } from "../../src/lib/commerce/server/checkoutQuote.js";
import { calculateTax } from "../../src/lib/commerce/server/taxCalculator.js";
import { SANDBOX_TAX_CONFIG } from "../../src/lib/commerce/server/taxConfig.sandbox.js";
import { SANDBOX_SHIPPING_CONFIG } from "../../src/lib/commerce/server/shippingConfig.sandbox.js";
import { buildPayPalLineItems } from "../src/paypalLineItems.js";
import { buildEditionReservationGroups } from "../src/editionInventory.js";
import { extractDisputeCaptureId, extractRefundCaptureId } from "../src/financialEvents.js";
import {
  commerceMode,
  resolveCommerceShippingConfig,
  resolveCommerceTaxFallback,
} from "../../src/lib/commerce/server/commerceConfig.js";

test("configured sandbox jurisdiction calculates test tax including shipping", () => {
  const tax = calculateTax({
    merchandiseCents: 2500,
    shippingCents: 1000,
    destination: { countryCode: "US", stateCode: "OH" },
    config: SANDBOX_TAX_CONFIG,
  });
  assert.equal(tax.jurisdictionCode, "US-OH");
  assert.equal(tax.rateBasisPoints, 675);
  assert.equal(tax.taxCents, 236);
  assert.equal(tax.ruleConfigured, true);
});

test("unconfigured state uses explicit zero-rate sandbox default", () => {
  const tax = calculateTax({
    merchandiseCents: 2500,
    shippingCents: 1000,
    destination: { countryCode: "US", stateCode: "MT" },
    config: SANDBOX_TAX_CONFIG,
  });
  assert.equal(tax.jurisdictionCode, "US-MT");
  assert.equal(tax.rateBasisPoints, 0);
  assert.equal(tax.taxCents, 0);
  assert.equal(tax.ruleConfigured, false);
});

test("checkout quote adds each present fulfillment group once", () => {
  const quote = calculateCheckoutQuote({
    verifiedItems: [
      { currency: "USD", fulfillment: "smugmug-manual", lineTotalCents: 2500 },
      { currency: "USD", fulfillment: "smugmug-manual", lineTotalCents: 2500 },
      { currency: "USD", fulfillment: "k4-manual", lineTotalCents: 110000 },
    ],
    destination: { countryCode: "US", stateCode: "OH" },
    shippingConfig: SANDBOX_SHIPPING_CONFIG,
    taxConfig: SANDBOX_TAX_CONFIG,
  });
  assert.equal(quote.merchandiseCents, 115000);
  assert.equal(quote.shippingCents, 4500);
  assert.equal(quote.taxCents, 8066);
  assert.equal(quote.totalCents, 127566);
});

test("database-style shipping rules discount additional paper prints and charge Engrained per panel", () => {
  const quote = calculateCheckoutQuote({
    verifiedItems: [
      { productKey: "sketch-5x7-pearl", currency: "USD", fulfillment: "smugmug-manual", quantity: 1, size: '5" x 7"', lineTotalCents: 2500 },
      { productKey: "foundation-11x14-lustre", currency: "USD", fulfillment: "smugmug-manual", quantity: 1, size: '11" x 14"', lineTotalCents: 15000 },
      { productKey: "chronicle-16x20-cotton-rag", currency: "USD", fulfillment: "k4-manual", quantity: 1, size: '16" x 20"', lineTotalCents: 110000 },
      { productKey: "engrained-one", currency: "USD", fulfillment: "engrained", quantity: 2, size: '20" x 30"', lineTotalCents: 90000 },
    ],
    destination: { countryCode: "US", stateCode: "MT" },
    shippingConfig: {
      mode: "sandbox",
      productRatesCents: {
        "sketch-5x7-pearl": 800,
        "foundation-11x14-lustre": 1400,
        "chronicle-16x20-cotton-rag": 3500,
      },
      engrainedBandsCents: { upTo24: 5000, upTo36: 9000, upTo50: 14000 },
    },
    taxConfig: SANDBOX_TAX_CONFIG,
  });
  assert.equal(quote.shippingCents, 23300);
});

test("unsigned additional prints ship at 50 percent and signed additional prints at 75 percent", () => {
  const quote = calculateCheckoutQuote({
    verifiedItems: [
      { productKey: "foundation-11x14-lustre", currency: "USD", fulfillment: "smugmug-manual", quantity: 2, size: '11" x 14"', lineTotalCents: 30000 },
      { productKey: "sketch-5x7-pearl", currency: "USD", fulfillment: "smugmug-manual", quantity: 1, size: '5" x 7"', lineTotalCents: 2500 },
      { productKey: "legend-40x60-cotton-rag", currency: "USD", fulfillment: "k4-manual", quantity: 1, size: '40" x 60"', lineTotalCents: 500000 },
      { productKey: "chronicle-16x20-cotton-rag", currency: "USD", fulfillment: "k4-manual", quantity: 1, size: '16" x 20"', lineTotalCents: 110000 },
    ],
    destination: { countryCode: "US", stateCode: "MT" },
    shippingConfig: {
      mode: "sandbox",
      productRatesCents: {
        "sketch-5x7-pearl": 800,
        "foundation-11x14-lustre": 1400,
        "chronicle-16x20-cotton-rag": 3500,
        "legend-40x60-cotton-rag": 7000,
      },
      engrainedBandsCents: { upTo24: 5000, upTo36: 9000, upTo50: 14000 },
    },
    taxConfig: SANDBOX_TAX_CONFIG,
  });
  assert.equal(quote.shippingCents, 12125);
});

test("international destinations are rejected", () => {
  assert.throws(() => calculateTax({
    merchandiseCents: 2500,
    shippingCents: 1000,
    destination: { countryCode: "CA", stateCode: "ON" },
    config: SANDBOX_TAX_CONFIG,
  }), /only within the United States/);
});

test("PayPal item tax allocation exactly matches aggregate tax with quantities and rounding", () => {
  const rows = buildPayPalLineItems([
    {
      imageId: "i-one", productKey: "sketch", imageTitle: "One", seriesLabel: "Sketch Series",
      size: '5" x 7"', finish: "Pearl", quantity: 3, unitPriceCents: 2500, lineTotalCents: 7500,
    },
    {
      imageId: "i-two", productKey: "foundation", imageTitle: "Two", seriesLabel: "Foundation Series",
      size: '8" x 10"', finish: "Pearl", quantity: 2, unitPriceCents: 7500, lineTotalCents: 15000,
    },
  ], 1731);
  const itemTotal = rows.reduce((sum, row) => sum + Math.round(Number(row.unit_amount.value) * 100) * Number(row.quantity), 0);
  const taxTotal = rows.reduce((sum, row) => sum + Math.round(Number(row.tax.value) * 100) * Number(row.quantity), 0);
  assert.equal(itemTotal, 22500);
  assert.equal(taxTotal, 1731);
  assert.ok(rows.length <= 4);
});

test("limited-edition reservation groups combine sizes that share one edition pool", () => {
  const groups = buildEditionReservationGroups([
    {
      inventoryKey: "series:s-one:chronicle", imageId: "i-one", seriesKey: "chronicle",
      editionLimit: 50, editionBaselineSold: 7, quantity: 2,
    },
    {
      inventoryKey: "series:s-one:chronicle", imageId: "i-one", seriesKey: "chronicle",
      editionLimit: 50, editionBaselineSold: 7, quantity: 3,
    },
    { inventoryKey: null, imageId: "i-one", seriesKey: "foundation", quantity: 10 },
  ]);
  assert.deepEqual(groups, [{
    inventoryKey: "series:s-one:chronicle",
    imageId: "i-one",
    seriesKey: "chronicle",
    editionLimit: 50,
    baselineSold: 7,
    quantity: 5,
  }]);
});

test("combined cart lines cannot exceed remaining limited-edition availability", () => {
  assert.throws(() => buildEditionReservationGroups([
    {
      inventoryKey: "series:s-one:legend", imageId: "i-one", seriesKey: "legend",
      editionLimit: 25, editionBaselineSold: 23, quantity: 1,
    },
    {
      inventoryKey: "series:s-one:legend", imageId: "i-one", seriesKey: "legend",
      editionLimit: 25, editionBaselineSold: 23, quantity: 2,
    },
  ]), /sold out|sufficient availability/);
});

test("refund events correlate to the original capture without comparing refund to the full order total", () => {
  assert.equal(extractRefundCaptureId({
    supplementary_data: { related_ids: { capture_id: "CAPTURE-123" } },
  }), "CAPTURE-123");
  assert.equal(extractRefundCaptureId({
    links: [{ rel: "up", href: "https://api-m.sandbox.paypal.com/v2/payments/captures/CAPTURE-456" }],
  }), "CAPTURE-456");
});

test("dispute events correlate seller transaction IDs to stored PayPal captures", () => {
  assert.equal(extractDisputeCaptureId({
    disputed_transactions: [{ seller_transaction_id: "CAPTURE-789" }],
  }), "CAPTURE-789");
});

test("live commerce cannot be enabled by credentials or mode alone", () => {
  const env = { PAYPAL_ENV: "live", LIVE_CONFIGURATION_APPROVED: "false" };
  assert.equal(commerceMode(env), "live");
  assert.throws(() => resolveCommerceShippingConfig(env), /has not been approved/);
  assert.throws(() => resolveCommerceTaxFallback(env), /has not been approved/);
});

test("approved live rules calculate independently from sandbox fixtures", () => {
  const env = {
    PAYPAL_ENV: "live",
    LIVE_CONFIGURATION_APPROVED: "true",
    LIVE_SHIPPING_RULES_JSON: JSON.stringify({
      mode: "live",
      methodLabel: "Standard U.S. shipping",
      groupRatesCents: { "smugmug-manual": 1200, "k4-manual": 4000, engrained: 16000 },
    }),
    LIVE_TAX_RULES_JSON: JSON.stringify({
      mode: "live",
      jurisdictions: {
        OH: { rateBasisPoints: 700, taxShipping: true, label: "Test live Ohio rule" },
      },
    }),
  };
  const quote = calculateCheckoutQuote({
    verifiedItems: [{ currency: "USD", fulfillment: "smugmug-manual", lineTotalCents: 2500 }],
    destination: { countryCode: "US", stateCode: "OH" },
    shippingConfig: resolveCommerceShippingConfig(env),
    taxConfig: resolveCommerceTaxFallback(env),
  });
  assert.equal(quote.mode, "live");
  assert.equal(quote.shippingCents, 1200);
  assert.equal(quote.taxCents, 259);
  assert.equal(quote.totalCents, 3959);
});

test("live configuration must explicitly identify itself as live", () => {
  const env = {
    PAYPAL_ENV: "live",
    LIVE_CONFIGURATION_APPROVED: "true",
    LIVE_SHIPPING_RULES_JSON: JSON.stringify({ mode: "sandbox", groupRatesCents: {} }),
    LIVE_TAX_RULES_JSON: JSON.stringify({ mode: "sandbox", jurisdictions: {} }),
  };
  assert.throws(() => resolveCommerceShippingConfig(env), /mode=live/);
  assert.throws(() => resolveCommerceTaxFallback(env), /mode=live/);
});

