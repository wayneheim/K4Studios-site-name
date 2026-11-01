import { commerceMode } from "../../src/lib/commerce/server/commerceConfig.js";

export async function resolveTaxConfigForDestination(db, env, stateCode, at = new Date()) {
  const mode = commerceMode(env);
  const date = at.toISOString().slice(0, 10);
  const state = String(stateCode || "").toUpperCase();
  const row = await db.prepare(`
    SELECT * FROM tax_jurisdiction_rules
    WHERE mode = ? AND country_code = 'US' AND state_code = ? AND enabled = 1
      AND effective_from <= ? AND (effective_to IS NULL OR effective_to >= ?)
    ORDER BY effective_from DESC LIMIT 1
  `).bind(mode, state, date, date).first();

  const databaseConfig = {
    mode,
    version: row ? `db:${row.id}:${row.updated_at}` : `db:${mode}:no-collection-rule`,
    label: mode === "sandbox"
      ? "SANDBOX DATABASE TAX RULES — NOT FOR LIVE SALES"
      : "K4 Studios live database tax rules",
    defaultRule: {
      rateBasisPoints: 0,
      taxShipping: false,
      label: "No K4 collection rule configured for this destination",
    },
    jurisdictions: {},
  };

  if (!row) return databaseConfig;
  return {
    ...databaseConfig,
    jurisdictions: {
      [state]: {
        rateBasisPoints: Number(row.rate_basis_points),
        taxShipping: Boolean(row.tax_shipping),
        label: row.label,
      },
    },
  };
}
