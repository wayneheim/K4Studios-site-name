/** Sandbox-only placeholder shipping charges; replace before live checkout. */
export const SANDBOX_SHIPPING_CONFIG = Object.freeze({
  mode: "sandbox",
  methodLabel: "Sandbox test shipping",
  label: "SANDBOX TEST SHIPPING — NOT FOR LIVE SALES",
  version: "sandbox-shipping-2026-10-29-v1",
  groupRatesCents: Object.freeze({
    "smugmug-manual": 1000,
    "k4-manual": 3500,
    engrained: 15000,
  }),
});

export function resolveSandboxShippingConfig(serializedOverride = "") {
  if (!serializedOverride) return SANDBOX_SHIPPING_CONFIG;
  let parsed;
  try {
    parsed = JSON.parse(serializedOverride);
  } catch {
    throw new Error("SANDBOX_SHIPPING_RULES_JSON must contain valid JSON.");
  }
  if (parsed?.mode !== "sandbox" || !parsed?.groupRatesCents) {
    throw new Error("Sandbox shipping overrides must declare mode=sandbox and groupRatesCents.");
  }
  return { ...SANDBOX_SHIPPING_CONFIG, ...parsed };
}

