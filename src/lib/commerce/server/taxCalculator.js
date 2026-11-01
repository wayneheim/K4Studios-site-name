function normalizeState(value) {
  return String(value || "").trim().toUpperCase();
}

function validateRule(rule) {
  const rateBasisPoints = Number(rule?.rateBasisPoints);
  if (!Number.isInteger(rateBasisPoints) || rateBasisPoints < 0 || rateBasisPoints > 10000) {
    throw new Error("Tax rates must be integer basis points between 0 and 10000.");
  }
  return {
    rateBasisPoints,
    taxShipping: Boolean(rule?.taxShipping),
    label: String(rule?.label || "Configured tax rule"),
  };
}

export function calculateTax({ merchandiseCents, shippingCents, destination, config }) {
  if (!["sandbox", "live"].includes(config?.mode)) throw new Error("A valid commerce tax mode is required.");
  if (!Number.isInteger(merchandiseCents) || merchandiseCents < 0) throw new Error("Invalid merchandise amount.");
  if (!Number.isInteger(shippingCents) || shippingCents < 0) throw new Error("Invalid shipping amount.");

  const countryCode = String(destination?.countryCode || "").trim().toUpperCase();
  if (countryCode !== "US") throw new Error("K4 checkout currently ships only within the United States.");

  const stateCode = normalizeState(destination?.stateCode);
  if (!/^[A-Z]{2}$/.test(stateCode)) throw new Error("A valid two-letter destination state is required.");

  const configuredRule = config?.jurisdictions?.[stateCode];
  const rule = validateRule(configuredRule || config?.defaultRule || {});
  const taxableCents = merchandiseCents + (rule.taxShipping ? shippingCents : 0);
  const taxCents = Math.round((taxableCents * rule.rateBasisPoints) / 10000);

  return Object.freeze({
    mode: config.mode,
    configVersion: String(config.version || `${config.mode}-unversioned`),
    configLabel: String(config.label || "K4 Studios tax rules"),
    jurisdictionCountry: countryCode,
    jurisdictionState: stateCode,
    jurisdictionCode: `US-${stateCode}`,
    ruleConfigured: Boolean(configuredRule),
    ruleLabel: rule.label,
    rateBasisPoints: rule.rateBasisPoints,
    ratePercent: rule.rateBasisPoints / 100,
    taxShipping: rule.taxShipping,
    taxableCents,
    taxCents,
  });
}

