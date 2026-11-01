import { resolveSandboxShippingConfig } from "./shippingConfig.sandbox.js";
import { resolveSandboxTaxConfig } from "./taxConfig.sandbox.js";

function parseApprovedLiveConfig(serialized, label) {
  if (!serialized) throw new Error(`${label} is required before live checkout can be enabled.`);
  let parsed;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new Error(`${label} must contain valid JSON.`);
  }
  if (parsed?.mode !== "live") throw new Error(`${label} must explicitly declare mode=live.`);
  return parsed;
}

export function commerceMode(env) {
  const mode = String(env.PAYPAL_ENV || "sandbox").toLowerCase();
  if (!["sandbox", "live"].includes(mode)) throw new Error("PAYPAL_ENV must be sandbox or live.");
  return mode;
}

export function resolveCommerceShippingConfig(env) {
  const mode = commerceMode(env);
  if (mode === "sandbox") return resolveSandboxShippingConfig(env.SANDBOX_SHIPPING_RULES_JSON || "");
  if (env.LIVE_CONFIGURATION_APPROVED !== "true") throw new Error("Live commerce configuration has not been approved.");
  const parsed = parseApprovedLiveConfig(env.LIVE_SHIPPING_RULES_JSON, "LIVE_SHIPPING_RULES_JSON");
  if (!parsed.groupRatesCents || typeof parsed.groupRatesCents !== "object") {
    throw new Error("Live shipping configuration must provide groupRatesCents.");
  }
  return {
    ...parsed,
    label: String(parsed.label || "K4 Studios live shipping"),
    methodLabel: String(parsed.methodLabel || "Standard U.S. shipping"),
    version: String(parsed.version || "live-shipping-unversioned"),
  };
}

export function resolveCommerceTaxFallback(env) {
  const mode = commerceMode(env);
  if (mode === "sandbox") return resolveSandboxTaxConfig(env.SANDBOX_TAX_RULES_JSON || "");
  if (env.LIVE_CONFIGURATION_APPROVED !== "true") throw new Error("Live commerce configuration has not been approved.");
  const parsed = parseApprovedLiveConfig(env.LIVE_TAX_RULES_JSON, "LIVE_TAX_RULES_JSON");
  if (!parsed.jurisdictions || typeof parsed.jurisdictions !== "object") {
    throw new Error("Live tax configuration must provide jurisdictions.");
  }
  return {
    mode: "live",
    label: String(parsed.label || "K4 Studios live tax rules"),
    version: String(parsed.version || "live-tax-unversioned"),
    defaultRule: {
      rateBasisPoints: 0,
      taxShipping: false,
      label: "No K4 collection rule configured for this destination",
      ...(parsed.defaultRule || {}),
    },
    jurisdictions: parsed.jurisdictions,
  };
}
