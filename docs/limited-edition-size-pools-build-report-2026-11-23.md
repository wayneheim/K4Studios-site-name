# Limited edition size pools build report

November 23, 2026. Implementation follows Wayne’s final clarification: preserve independent size pools and the existing admin workflow, change the size limits, replace series-level count labels, and track APs separately with sale availability disabled by default.

## Edition policy

| Series | Size | Numbered pool | Separate AP | Numbered price |
| --- | --- | ---: | ---: | ---: |
| Chronicle | 16×20 | 30 | 1 | $1,100 |
| Chronicle | 20×24 | 20 | 1 | $1,500 |
| Legend | 30×40 | 15 | 1 | $3,800 |
| Legend | 40×60 | 5 | 1 | $5,000 |
| Engrained | Existing wood size | 5 | 1 per work | Unchanged |

A single-size artwork retains that size’s own limit. Unused capacity never transfers between sizes. Foundation and Sketch remain open editions. Numbered prices are unchanged.

[editionPolicy.json](../src/data/editionPolicy.json) defines the four paper limits. [editionPolicy.js](../src/data/editionPolicy.js) provides shared size matching, edition labels, aggregate disclosure, AP state, and validation. Admin tools, certificates, commerce, and public presentation consume this policy rather than independently defining paper edition limits.

## Admin tools and certificates

- Editor Pro shows “Editions defined by size,” the correct limit beside each size, size-specific next-print information, and the aggregate breakdown with explanatory detail. Printed and sold inputs and both server write paths reject counts above the size’s cap.
- Direct artwork payloads include excluded sizes, so one-size pricing and disclosure are correct before the browser loads the registry. Inventory Tracker and Series Matcher fall back to generated public data when deployed source-file APIs return empty results.
- Each offered paper size has a separate AP control in the same series area. The Engrained editor has one equivalent control per work.
- AP controls track reserved, printed, sold, explicit AP price, and “Available for sale.” All 822 paper-size AP records and 47 Engrained AP records start unavailable for sale, with no assumed price. Saving a sale release requires a positive AP price and an unsold proof. Marking a proof sold disables its release control.
- Inventory Tracker uses the shared policy, explains the size breakdown, and identifies printed APs separately in stock. A certificate must be opened from a specific size card rather than a combined-size summary.
- Series Matcher now reads the shared size policy and displays offered sizes with their limits and AP allowances in both grids and its detail modal.
- The certificate maker derives the denominator from series plus size, validates the chosen number, and supports `AP` as a separate designation. It asks for the intended edition number instead of using the total printed count as the certificate number.
- Copyright Manager, its API functions, registry, and submission scripts have no edition-count dependency. They were checked and left unchanged.

Number assignment remains the existing manual fulfillment workflow. This change does not add automatic consecutive numbering at payment or a certificate issuance ledger. Administrators must continue recording sales and selecting the correct number when issuing a certificate.

## Checkout enforcement

The initial audit found that the editor tracked size counts while checkout combined both sizes under one key. Checkout now uses a size/product identity and that size’s sold baseline. Its D1 reservation, commit, release, and retry behavior remains in place.

Stored D1 limits are refreshed from the verified product when reserving, with database constraints preventing a reduction below existing sold or reserved inventory. An old shared pool containing sales or reservations blocks the change of identity until reconciled; it cannot silently become fresh size inventory.

AP products exist only when the authoritative admin record explicitly releases that proof at its own price. Paper and Engrained APs use separate one-slot inventory keys. Disabled proofs, forged browser prices, unavailable sizes, and requests for multiple APs are rejected by the server. A proof never consumes or expands a numbered pool.

The existing source-registry printed/sold counters remain manual baselines; paid checkout quantities are stored separately in commerce D1. Checkout enforces the combined availability, but this change does not introduce automatic synchronization of paid quantities back into the source files. Registry edits prevent adding sizes after a sale recorded there; any future size expansion must also check commerce sales, as the packet requires.

## Public copy and repository scan

Series headings now say “Editions defined by size.” Size rows state their own edition limit and `+ 1 AP`. Where totals are useful, the disclosure adds the offered size pools and one proof per size. Both-size shorthand is `30 + 20 + 2 AP` or `15 + 5 + 2 AP`; one-size disclosure keeps only the offered size and its proof. Expandable details and tooltips explain independent numbering and the AP allowance.

Updated surfaces include Sizes and Pricing, purchase views, chapter static HTML, Series Guide, shared series-bar popovers, `/Other/Series` visible prose and FAQ schema, Series Matcher, Inventory Tracker, and certificates. The shared helpers carry the values through the gallery landing and `/all` consumers. Public registry and Engrained data were regenerated.

The active-source scan found no remaining Legend edition-of-25 claim, Chronicle edition-of-50 claim, or edition-of-250 claim. The only active-source match for “editions of 50” is the intentionally preserved historical Engrained paragraph explaining originally marked `/50` works that were closed early. Two additional `/Other` data files contained stale Engrained “50” claims; their edition boilerplate was corrected without changing narrative content.

A broader repository scan also found old Engrained copy in `cowboy-scraper/data/test.mjs`, an import/test fixture outside the published source tree. Historical audit notes, backups, logs, and that fixture are not public edition policy and were not rewritten.

## Sales audit

Read-only live commerce queries found two orders, one paid and one pending approval, and no Chronicle or Legend items, stored order quotes, inventory rows, or allocations. The deployed public registry and local registry, each containing 3,256 series records, had no positive Chronicle or Legend sold counts. Local legacy edition state also had no paper sales. The deployed legacy edition-state function returned only empty metadata, so it was not treated as authoritative inventory.

The Order Tracker uses the audited live commerce service. No customer emails were sent and no orders were marked processed. Saved Wrangler OAuth access worked with the inherited API token cleared only in the command process. Off-system sales or quotes are outside this audit.

## Verification and release

- Existing commerce tests: 48 passed.
- Focused edition and related browser/catalog tests: 21 passed, including all four size caps, independent availability, one-slot AP enforcement, disabled and explicitly released APs, authoritative prices, AP admin controls, deployed inventory fallback, and initial one-size payloads.
- Affected editor, inventory, checkout, and Netlify functions compiled successfully.
- Migration dry run passes with 822 paper-size AP reservations and 47 Engrained AP reservations. Existing printed and sold counts were preserved.
- Final Astro build completed successfully, followed in sequence by output sanitization, canonical-host audit, public-link audit across 4,389 rendered HTML/JavaScript/XML files, and the SSR artifact guard.
- Served-browser checks passed on the final draft for both-size Legend pricing/disclosure, one-size Legend pricing/disclosure, `/Other/Series`, all four numbered certificate denominators, AP certificate identity, rejection of Legend 40×60 number 6, Inventory Tracker, and Series Matcher. The admin routes also provide the required SSR-served spot check.

Verified draft: [Edition preview](https://6b04b2f52a4c5eb2bd91a2b6--k4studios.netlify.app/Other/Series). Netlify deploy ID: `6b04b2f52a4c5eb2bd91a2b6`. Build and audit output: `tmp/edition-final-build.log`. Draft upload output: `tmp/edition-preview-deploy.log`. Numbered prices and pre-existing inventory counts were checked against their earlier values; no existing printed or sold count changed, and all 869 AP slots remain unavailable for sale.

## Production release

Wayne approved the draft on November 23, 2026. The exact approved Netlify deploy `6b04b2f52a4c5eb2bd91a2b6` was promoted to [production](https://www.k4studios.com/Other/Series), with Netlify confirming it as the published deploy in `ready` state. The previous deploy was `6b049ad06179ca66f2cd923c`; promotion confirmation is saved in `tmp/edition-production-promotion.json`.

The `k4-commerce-live` worker was uploaded and deployed with version ID `c235efe4-6718-4ace-94bf-871ff7dcc646`, using saved Wrangler OAuth access and explicitly selecting `wrangler.live.toml`. Deployment output is saved in `tmp/edition-commerce-production-deploy.log`. No analytics or image-proxy worker was deployed.

The pre-release read-only sales check again found no Chronicle or Legend orders, stored order quotes, or inventory rows. Live stateless quote checks then returned limits `30 / 20 / 15 / 5` under four distinct inventory keys, rejected the disabled AP with HTTP 400, and rejected six Legend 40×60 prints with HTTP 400. Production public data contains all 869 reserved APs, with zero available for sale. No order was created and no payment was collected by these checks.

Live browser checks passed for both-size and one-size artwork pricing/disclosure and `/Other/Series`. Production certificate access returned HTTP 403 for the verification request; all certificate cases had passed on the exact approved draft now published. Existing unrelated uncommitted work was retained.
