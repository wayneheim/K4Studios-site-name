export function calculateShipping({ items, destination, config }) {
  if (!["sandbox", "live"].includes(config?.mode)) throw new Error("A valid commerce shipping mode is required.");
  if (String(destination?.countryCode || "").trim().toUpperCase() !== "US") {
    throw new Error("K4 checkout currently ships only within the United States.");
  }

  const groups = [...new Set(items.map((item) => String(item.fulfillment || "")).filter(Boolean))];
  let charges;
  if (config.productRatesCents && config.engrainedBandsCents) {
    charges = [];
    for (const group of groups) {
      const groupItems = items.filter((item) => item.fulfillment === group);
      if (group === "engrained") {
        for (const item of groupItems) {
          const dimensions = String(item.size || "").match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
          const longestSide = Math.max(...dimensions, 0);
          const band = longestSide <= 24 ? "upTo24" : longestSide <= 36 ? "upTo36" : longestSide <= 50 ? "upTo50" : "";
          const unitRate = Number(config.engrainedBandsCents[band]);
          if (!band || !Number.isInteger(unitRate) || unitRate < 0) throw new Error(`No Engrained shipping rule is configured for ${item.size}.`);
          charges.push({ group, productKey: item.productKey, band, quantity: item.quantity, amountCents: unitRate * item.quantity });
        }
        continue;
      }
      const rates = groupItems.flatMap((item) => Array.from({ length: Number(item.quantity) || 1 }, () => ({
        productKey: item.productKey,
        amountCents: Number(config.productRatesCents[item.shippingRateKey || item.productKey]),
      })));
      if (rates.some((rate) => !Number.isInteger(rate.amountCents) || rate.amountCents < 0)) {
        throw new Error(`No product shipping rule is configured for fulfillment group: ${group}`);
      }
      const sorted = [...rates].sort((left, right) => right.amountCents - left.amountCents);
      const additionalRatePercent = group === "smugmug-manual" ? 50 : group === "k4-manual" ? 75 : 100;
      const amountCents = sorted.reduce((total, rate, index) => (
        total + (index === 0 ? rate.amountCents : Math.round(rate.amountCents * additionalRatePercent / 100))
      ), 0);
      charges.push({
        group,
        productKey: sorted[0].productKey,
        itemCount: sorted.length,
        additionalRatePercent,
        strategy: "highest-full-additional-discounted",
        amountCents,
      });
    }
  } else {
    charges = groups.map((group) => {
    const amountCents = Number(config.groupRatesCents?.[group]);
    if (!Number.isInteger(amountCents) || amountCents < 0) {
      throw new Error(`No shipping rule is configured for fulfillment group: ${group}`);
    }
    return { group, amountCents };
    });
  }

  return Object.freeze({
    mode: config.mode,
    configVersion: String(config.version || `${config.mode}-unversioned`),
    configLabel: String(config.label || "K4 Studios shipping"),
    methodLabel: String(config.methodLabel || "Standard shipping"),
    charges,
    shippingCents: charges.reduce((total, charge) => total + charge.amountCents, 0),
  });
}

