INSERT INTO shipping_rate_sets (
  id, mode, effective_from, label, method_label, rates_json, enabled, updated_at
) VALUES (
  'live-shipping-2026-10-29',
  'live',
  '2026-10-29',
  'K4 Studios U.S. print shipping',
  'Standard U.S. shipping',
  '{"productRatesCents":{"sketch-5x7-pearl":1100,"foundation-8x10-pearl":1100,"foundation-11x14-lustre":1100,"chronicle-16x20-cotton-rag":3200,"chronicle-20x24-cotton-rag":3600,"legend-30x40-cotton-rag":5000,"legend-40x60-cotton-rag":6000},"engrainedBandsCents":{"upTo24":11500,"upTo36":11500,"upTo50":15000}}',
  1,
  datetime('now')
)
ON CONFLICT(mode, effective_from) DO UPDATE SET
  label = excluded.label,
  method_label = excluded.method_label,
  rates_json = excluded.rates_json,
  enabled = 1,
  updated_at = excluded.updated_at;

INSERT INTO tax_jurisdiction_rules (
  id, mode, country_code, state_code, rate_basis_points, tax_shipping,
  label, source_url, effective_from, enabled, updated_at
) VALUES (
  'live-us-oh-2026-q4',
  'live',
  'US',
  'OH',
  675,
  1,
  'Geauga County, Ohio sales tax (6.75%)',
  'https://tax.ohio.gov/business/sales-and-use-tax/rate-tables/by-county-q4-2026',
  '2026-10-01',
  1,
  datetime('now')
)
ON CONFLICT(mode, country_code, state_code, effective_from) DO UPDATE SET
  rate_basis_points = excluded.rate_basis_points,
  tax_shipping = excluded.tax_shipping,
  label = excluded.label,
  source_url = excluded.source_url,
  enabled = 1,
  updated_at = excluded.updated_at;
