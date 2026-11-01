import { centsToDecimal } from "../../src/lib/commerce/server/money.js";

function allocateTotalAcrossLines(items, totalCents) {
  const merchandiseCents = items.reduce((sum, item) => sum + item.lineTotalCents, 0);
  if (!merchandiseCents) return items.map(() => 0);

  const allocations = items.map((item, index) => {
    const exactNumerator = totalCents * item.lineTotalCents;
    return {
      index,
      cents: Math.floor(exactNumerator / merchandiseCents),
      remainder: exactNumerator % merchandiseCents,
    };
  });
  let remaining = totalCents - allocations.reduce((sum, allocation) => sum + allocation.cents, 0);
  allocations
    .slice()
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index)
    .slice(0, remaining)
    .forEach((allocation) => { allocations[allocation.index].cents += 1; });
  return allocations.map((allocation) => allocation.cents);
}

function itemDescription(item) {
  return [item.seriesLabel, item.size, item.finish].filter(Boolean).join(" · ").slice(0, 127);
}

function paypalRow(item, quantity, unitTaxCents, suffix) {
  return {
    name: `${item.imageTitle} — ${item.seriesLabel}`.slice(0, 127),
    description: itemDescription(item),
    sku: `${item.imageId}:${item.productKey}${suffix}`.slice(0, 127),
    category: "PHYSICAL_GOODS",
    quantity: String(quantity),
    unit_amount: { currency_code: "USD", value: centsToDecimal(item.unitPriceCents) },
    tax: { currency_code: "USD", value: centsToDecimal(unitTaxCents) },
  };
}

/**
 * PayPal requires tax_total to equal sum(items[].tax * quantity). Tax may also
 * include taxable shipping, so allocate the authoritative aggregate tax across
 * physical item units using deterministic largest-remainder rounding.
 */
export function buildPayPalLineItems(items, totalTaxCents) {
  if (!Number.isInteger(totalTaxCents) || totalTaxCents < 0) throw new Error("Invalid PayPal tax total.");
  const lineTaxTotals = allocateTotalAcrossLines(items, totalTaxCents);
  const rows = [];

  items.forEach((item, index) => {
    const quantity = Number(item.quantity);
    const lineTaxCents = lineTaxTotals[index];
    const baseTax = Math.floor(lineTaxCents / quantity);
    const higherTaxUnits = lineTaxCents % quantity;
    const baseTaxUnits = quantity - higherTaxUnits;

    if (higherTaxUnits > 0) rows.push(paypalRow(item, higherTaxUnits, baseTax + 1, ":tax-h"));
    if (baseTaxUnits > 0) rows.push(paypalRow(item, baseTaxUnits, baseTax, higherTaxUnits ? ":tax-l" : ""));
  });

  const allocatedTaxCents = rows.reduce(
    (sum, row) => sum + Math.round(Number(row.tax.value) * 100) * Number(row.quantity),
    0,
  );
  if (allocatedTaxCents !== totalTaxCents) throw new Error("PayPal line-item tax allocation did not balance.");
  return rows;
}

