/**
 * PAYPAL SANDBOX DEVELOPMENT CONFIGURATION ONLY.
 *
 * These rates are intentionally test fixtures. They are not a statement of
 * K4 Studios' registration, nexus, collection duties, or live tax rates.
 * Live payments remain disabled until a reviewed live configuration replaces
 * this module (or a certified tax provider is connected).
 */
export const SANDBOX_TAX_CONFIG = Object.freeze({
  mode: "sandbox",
  label: "SANDBOX TEST TAX RULES — NOT FOR LIVE SALES",
  version: "sandbox-tax-2026-10-29-v2",
  defaultRule: Object.freeze({
    rateBasisPoints: 0,
    taxShipping: false,
    label: "No sandbox collection rule configured",
  }),
  jurisdictions: Object.freeze({
    OH: Object.freeze({
      rateBasisPoints: 675,
      taxShipping: true,
      label: "Geauga County, Ohio sandbox test rate (6.75%)",
    }),
  }),
});

export function resolveSandboxTaxConfig(serializedOverride = "") {
  if (!serializedOverride) return SANDBOX_TAX_CONFIG;

  let parsed;
  try {
    parsed = JSON.parse(serializedOverride);
  } catch {
    throw new Error("SANDBOX_TAX_RULES_JSON must contain valid JSON.");
  }

  if (parsed?.mode !== "sandbox" || !parsed?.jurisdictions || typeof parsed.jurisdictions !== "object") {
    throw new Error("Sandbox tax overrides must declare mode=sandbox and jurisdictions.");
  }

  return {
    ...SANDBOX_TAX_CONFIG,
    ...parsed,
    label: String(parsed.label || SANDBOX_TAX_CONFIG.label),
    defaultRule: { ...SANDBOX_TAX_CONFIG.defaultRule, ...(parsed.defaultRule || {}) },
    jurisdictions: parsed.jurisdictions,
  };
}

