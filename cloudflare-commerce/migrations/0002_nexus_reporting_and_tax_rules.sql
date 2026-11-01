CREATE TABLE IF NOT EXISTS tax_jurisdiction_rules (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL CHECK (mode IN ('sandbox', 'live')),
  country_code TEXT NOT NULL,
  state_code TEXT NOT NULL,
  rate_basis_points INTEGER NOT NULL CHECK (rate_basis_points BETWEEN 0 AND 10000),
  tax_shipping INTEGER NOT NULL DEFAULT 0 CHECK (tax_shipping IN (0, 1)),
  label TEXT NOT NULL,
  source_url TEXT,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  updated_at TEXT NOT NULL,
  UNIQUE(mode, country_code, state_code, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_tax_rules_lookup
  ON tax_jurisdiction_rules(mode, country_code, state_code, enabled, effective_from, effective_to);

INSERT OR IGNORE INTO tax_jurisdiction_rules (
  id, mode, country_code, state_code, rate_basis_points, tax_shipping,
  label, source_url, effective_from, enabled, updated_at
) VALUES (
  'sandbox-us-oh-2026-q4', 'sandbox', 'US', 'OH', 675, 1,
  'Geauga County, Ohio sandbox test rate (6.75%)',
  'https://tax.ohio.gov/business/sales-and-use-tax/rate-tables/by-county-q4-2026',
  '2026-10-01', 1, datetime('now')
);

CREATE TABLE IF NOT EXISTS nexus_rules (
  state_code TEXT PRIMARY KEY,
  state_name TEXT NOT NULL,
  rule_type TEXT NOT NULL DEFAULT 'economic',
  revenue_threshold_cents INTEGER,
  transaction_threshold INTEGER,
  threshold_logic TEXT NOT NULL DEFAULT 'revenue_only',
  measurement_period TEXT NOT NULL DEFAULT 'calendar_year',
  sales_basis TEXT NOT NULL DEFAULT 'Confirm with state',
  verification_status TEXT NOT NULL DEFAULT 'needs_review',
  source_url TEXT,
  notes TEXT,
  effective_from TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS nexus_adjustments (
  id TEXT PRIMARY KEY,
  calendar_year INTEGER NOT NULL,
  state_code TEXT NOT NULL,
  source_type TEXT NOT NULL,
  sales_cents INTEGER NOT NULL DEFAULT 0,
  transaction_count INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  occurred_on TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_nexus_adjustments_year_state
  ON nexus_adjustments(calendar_year, state_code);

CREATE TABLE IF NOT EXISTS state_activity (
  state_code TEXT PRIMARY KEY,
  physical_activity INTEGER NOT NULL DEFAULT 0 CHECK (physical_activity IN (0, 1)),
  activity_note TEXT,
  review_status TEXT NOT NULL DEFAULT 'not_reviewed',
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO nexus_rules (
  state_code, state_name, rule_type, revenue_threshold_cents,
  transaction_threshold, threshold_logic, measurement_period, sales_basis,
  verification_status, source_url, notes, effective_from, updated_at
) VALUES
  ('AL', 'Alabama', 'economic', 25000000, NULL, 'revenue_only', 'prior_calendar_year', 'Total retail sales delivered into Alabama', 'verified_2026', 'https://www.revenue.alabama.gov/faqs/are-all-remote-sellers-required-to-register-in-alabama/', 'Physical presence overrides this economic threshold.', '2018-10-01', datetime('now')),
  ('AK', 'Alaska', 'local_only', 10000000, NULL, 'revenue_only', 'current_or_prior_calendar_year', 'Statewide gross remote sales for participating local jurisdictions', 'verified_2026', 'https://www.streamlinedsalestax.org/for-businesses/remote-seller-faqs/remote-seller-state-guidance', 'No statewide sales tax; participating local jurisdictions administer remote seller tax.', '2025-01-01', datetime('now')),
  ('CA', 'California', 'economic', 50000000, NULL, 'revenue_only', 'current_or_prior_calendar_year', 'Combined sales of tangible personal property delivered into California', 'verified_2026', 'https://cdtfa.ca.gov/industry/wayfair/frequently-asked-questions.htm', 'Physical presence overrides this economic threshold.', '2019-04-01', datetime('now')),
  ('DE', 'Delaware', 'no_statewide_sales_tax', NULL, NULL, 'none', 'none', 'No general statewide sales tax', 'verified_2026', NULL, 'Continue tracking sales; other business taxes may still apply.', NULL, datetime('now')),
  ('MS', 'Mississippi', 'economic', 25000000, NULL, 'revenue_only', 'rolling_12_months', 'Sales into Mississippi', 'verified_2026', 'https://www.dor.ms.gov/business/business-tax-frequently-asked-questions', 'Physical presence overrides this economic threshold.', '2018-07-01', datetime('now')),
  ('MT', 'Montana', 'no_statewide_sales_tax', NULL, NULL, 'none', 'none', 'No general statewide sales tax', 'verified_2026', NULL, 'Local or special taxes and physical show obligations still require review.', NULL, datetime('now')),
  ('NH', 'New Hampshire', 'no_statewide_sales_tax', NULL, NULL, 'none', 'none', 'No general statewide sales tax', 'verified_2026', NULL, 'Continue tracking sales; other business taxes may still apply.', NULL, datetime('now')),
  ('NV', 'Nevada', 'economic', 10000000, 200, 'either', 'current_or_prior_calendar_year', 'Gross revenue or retail transaction count', 'verified_2026', 'https://www.streamlinedsalestax.org/for-businesses/remote-seller-faqs/remote-seller-state-guidance', 'Physical presence overrides this economic threshold.', '2018-10-01', datetime('now')),
  ('NJ', 'New Jersey', 'economic', 10000000, 200, 'either', 'current_or_prior_calendar_year', 'Gross revenue or separate transaction count', 'verified_2026', 'https://www.streamlinedsalestax.org/for-businesses/remote-seller-faqs/remote-seller-state-guidance', 'Physical presence overrides this economic threshold.', '2018-11-01', datetime('now')),
  ('NY', 'New York', 'economic', 50000000, 100, 'both', 'preceding_four_sales_tax_quarters', 'Gross receipts and sales transactions of tangible personal property delivered into New York', 'verified_2026', 'https://www.tax.ny.gov/pubs_and_bulls/publications/sales/nexus.htm', 'Both thresholds must be exceeded. Physical presence overrides this economic threshold.', NULL, datetime('now')),
  ('OR', 'Oregon', 'no_statewide_sales_tax', NULL, NULL, 'none', 'none', 'No general statewide sales tax', 'verified_2026', NULL, 'Continue tracking sales; other business taxes may still apply.', NULL, datetime('now')),
  ('TX', 'Texas', 'economic', 50000000, NULL, 'revenue_only', 'preceding_12_months', 'Total Texas revenue', 'verified_2026', 'https://comptroller.texas.gov/taxes/sales/faq/permit.php', 'Physical presence overrides this economic threshold.', '2019-10-01', datetime('now')),
  ('WV', 'West Virginia', 'economic', 10000000, 200, 'either', 'current_or_prior_calendar_year', 'West Virginia sales or separate transactions', 'verified_2026', 'https://www.streamlinedsalestax.org/for-businesses/remote-seller-faqs/remote-seller-state-guidance', 'Physical presence overrides this economic threshold.', '2019-01-01', datetime('now'));

INSERT OR IGNORE INTO nexus_rules (
  state_code, state_name, rule_type, verification_status, notes, updated_at
) VALUES
  ('AZ','Arizona','economic','needs_review','Track sales; configure the current state-specific rule before relying on an alert.',datetime('now')),
  ('AR','Arkansas','economic','needs_review','Track sales; configure the current state-specific rule before relying on an alert.',datetime('now')),
  ('CO','Colorado','economic','needs_review','Track sales; configure the current state-specific rule before relying on an alert.',datetime('now')),
  ('CT','Connecticut','economic','needs_review','Track sales; configure the current state-specific rule before relying on an alert.',datetime('now')),
  ('DC','District of Columbia','economic','needs_review','Track sales; configure the current jurisdiction-specific rule before relying on an alert.',datetime('now')),
  ('FL','Florida','economic','needs_review','Track sales; configure the current state-specific rule before relying on an alert.',datetime('now')),
  ('GA','Georgia','economic','needs_review','Track sales; configure the current state-specific rule before relying on an alert.',datetime('now')),
  ('HI','Hawaii','economic','needs_review','Track sales; configure the current state-specific rule before relying on an alert.',datetime('now')),
  ('ID','Idaho','economic','needs_review','Track sales; configure the current state-specific rule before relying on an alert.',datetime('now')),
  ('IL','Illinois','economic','needs_review','Illinois removed its transaction threshold effective 2026; verify the current receipts basis.',datetime('now')),
  ('IN','Indiana','economic','needs_review','Track sales; configure the current state-specific rule before relying on an alert.',datetime('now')),
  ('IA','Iowa','economic','needs_review','Track sales; configure the current state-specific rule before relying on an alert.',datetime('now')),
  ('KS','Kansas','economic','needs_review','Track sales; configure the current state-specific rule before relying on an alert.',datetime('now')),
  ('KY','Kentucky','economic','needs_review','Track sales; configure the current state-specific rule before relying on an alert.',datetime('now')),
  ('LA','Louisiana','economic','needs_review','Track sales; configure the current state-specific rule before relying on an alert.',datetime('now')),
  ('ME','Maine','economic','needs_review','Track sales; configure the current state-specific rule before relying on an alert.',datetime('now')),
  ('MD','Maryland','economic','needs_review','Track sales; configure the current state-specific rule before relying on an alert.',datetime('now')),
  ('MA','Massachusetts','economic','needs_review','Track sales; configure the current state-specific rule before relying on an alert.',datetime('now')),
  ('MI','Michigan','economic','needs_review','Track sales; configure the current state-specific rule before relying on an alert.',datetime('now')),
  ('MN','Minnesota','economic','needs_review','Track sales; configure the current state-specific rule before relying on an alert.',datetime('now')),
  ('MO','Missouri','economic','needs_review','Track sales; configure the current state-specific rule before relying on an alert.',datetime('now')),
  ('NE','Nebraska','economic','needs_review','Track sales; configure the current state-specific rule before relying on an alert.',datetime('now')),
  ('NM','New Mexico','economic','needs_review','Track sales; configure the current state-specific rule before relying on an alert.',datetime('now')),
  ('NC','North Carolina','economic','needs_review','North Carolina removed its transaction threshold in 2024; verify the current gross-sales basis.',datetime('now')),
  ('ND','North Dakota','economic','needs_review','K4 show activity requires a physical-presence review separate from the economic threshold.',datetime('now')),
  ('OH','Ohio','home_state','economic_nexus_not_applicable','K4 is an Ohio vendor; collect under the configured Ohio rule.',datetime('now')),
  ('OK','Oklahoma','economic','needs_review','Track sales; configure the current state-specific rule before relying on an alert.',datetime('now')),
  ('PA','Pennsylvania','economic','needs_review','K4 show activity requires a physical-presence review separate from the economic threshold.',datetime('now')),
  ('RI','Rhode Island','economic','needs_review','Track sales; configure the current state-specific rule before relying on an alert.',datetime('now')),
  ('SC','South Carolina','economic','needs_review','Track sales; configure the current state-specific rule before relying on an alert.',datetime('now')),
  ('SD','South Dakota','economic','needs_review','K4 show activity requires a physical-presence review separate from the economic threshold.',datetime('now')),
  ('TN','Tennessee','economic','needs_review','Track sales; configure the current state-specific rule before relying on an alert.',datetime('now')),
  ('UT','Utah','economic','needs_review','Utah removed its transaction threshold in 2025; verify the current gross-revenue basis.',datetime('now')),
  ('VT','Vermont','economic','needs_review','Track sales; configure the current state-specific rule before relying on an alert.',datetime('now')),
  ('VA','Virginia','economic','needs_review','Track sales; configure the current state-specific rule before relying on an alert.',datetime('now')),
  ('WA','Washington','economic','needs_review','Track sales; configure the current state-specific rule before relying on an alert.',datetime('now')),
  ('WI','Wisconsin','economic','needs_review','Track sales; configure the current state-specific rule before relying on an alert.',datetime('now')),
  ('WY','Wyoming','economic','needs_review','Wyoming removed its transaction threshold in 2024; verify the current gross-revenue basis.',datetime('now'));

INSERT OR IGNORE INTO state_activity (state_code, physical_activity, activity_note, review_status, updated_at) VALUES
  ('MT', 1, 'K4 attends in-person shows; determine whether activity creates registration or local obligations.', 'needs_professional_review', datetime('now')),
  ('ND', 1, 'K4 attends in-person shows; determine whether activity creates physical nexus.', 'needs_professional_review', datetime('now')),
  ('SD', 1, 'K4 attends in-person shows; determine whether activity creates physical nexus.', 'needs_professional_review', datetime('now')),
  ('PA', 1, 'K4 attends in-person shows; determine whether activity creates physical nexus.', 'needs_professional_review', datetime('now')),
  ('WV', 1, 'K4 attends in-person shows; determine whether activity creates physical nexus.', 'needs_professional_review', datetime('now'));

