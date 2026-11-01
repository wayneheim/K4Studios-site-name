import { resolveCommerceShippingConfig } from "../../src/lib/commerce/server/commerceConfig.js";

export const SHIPPING_PRODUCT_KEYS = Object.freeze([
  "sketch-5x7-pearl",
  "foundation-8x10-pearl",
  "foundation-11x14-lustre",
  "chronicle-16x20-cotton-rag",
  "chronicle-20x24-cotton-rag",
  "legend-30x40-cotton-rag",
  "legend-40x60-cotton-rag",
]);

export const ENTRAINED_BAND_KEYS = Object.freeze(["upTo24", "upTo36", "upTo50"]);

function validateCents(value, label) {
  const cents = Number(value);
  if (!Number.isInteger(cents) || cents < 0 || cents > 1000000) {
    throw new Error(`${label} must be non-negative integer cents.`);
  }
  return cents;
}

export function validateShippingRates(rates) {
  const productRatesCents = Object.fromEntries(SHIPPING_PRODUCT_KEYS.map((key) => [
    key,
    validateCents(rates?.productRatesCents?.[key], `Shipping rate for ${key}`),
  ]));
  const engrainedBandsCents = Object.fromEntries(ENTRAINED_BAND_KEYS.map((key) => [
    key,
    validateCents(rates?.engrainedBandsCents?.[key], `Engrained shipping rate ${key}`),
  ]));
  return { productRatesCents, engrainedBandsCents };
}

function configFromRow(row) {
  const rates = validateShippingRates(JSON.parse(row.rates_json));
  return {
    mode: row.mode,
    label: row.label,
    methodLabel: row.method_label,
    version: `db:${row.id}:${row.updated_at}`,
    effectiveFrom: row.effective_from,
    ...rates,
  };
}

export async function resolveShippingConfig(db, env, at = new Date()) {
  if (!db) return resolveCommerceShippingConfig(env);
  const mode = String(env.PAYPAL_ENV || "sandbox").toLowerCase();
  const effectiveDate = at.toISOString().slice(0, 10);
  const row = await db.prepare(`
    SELECT * FROM shipping_rate_sets
    WHERE mode = ? AND enabled = 1 AND effective_from <= ?
    ORDER BY effective_from DESC LIMIT 1
  `).bind(mode, effectiveDate).first();
  return row ? configFromRow(row) : resolveCommerceShippingConfig(env);
}

export async function getCurrentShippingRule(db, mode) {
  const row = await db.prepare(`
    SELECT * FROM shipping_rate_sets
    WHERE mode = ? AND enabled = 1
    ORDER BY effective_from DESC LIMIT 1
  `).bind(mode).first();
  if (!row) return null;
  return { ...row, rates: validateShippingRates(JSON.parse(row.rates_json)) };
}

export async function saveShippingRule(db, payload, mode) {
  const effectiveFrom = String(payload?.effectiveFrom || "");
  const label = String(payload?.label || "").trim().slice(0, 160);
  const methodLabel = String(payload?.methodLabel || "").trim().slice(0, 100);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) throw new Error("A shipping effective date is required.");
  if (!label || !methodLabel) throw new Error("Shipping rule and method labels are required.");
  const rates = validateShippingRates(payload?.rates);
  const id = `${mode}-shipping-${effectiveFrom}`;
  const updatedAt = new Date().toISOString();
  await db.prepare(`
    INSERT INTO shipping_rate_sets (
      id, mode, effective_from, label, method_label, rates_json, enabled, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    ON CONFLICT(mode, effective_from) DO UPDATE SET
      label = excluded.label,
      method_label = excluded.method_label,
      rates_json = excluded.rates_json,
      enabled = 1,
      updated_at = excluded.updated_at
  `).bind(id, mode, effectiveFrom, label, methodLabel, JSON.stringify(rates), updatedAt).run();
  return { id, mode, effectiveFrom, label, methodLabel, rates, updatedAt };
}
