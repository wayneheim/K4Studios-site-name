# Limited edition Option D implementation audit

Date: November 23, 2026. Historical initial audit, before implementation. Wayne subsequently clarified that the existing size inventory and admin workflows should be retained, that checkout should agree with those pools, and that APs should be tracked separately with sale availability off by default. See the [implementation report](limited-edition-size-pools-build-report-2026-11-23.md) for the resulting changes and validation.

The final Option D policy is clear, but its assumption about the running architecture is incorrect. The editor records paper inventory by size; checkout reserves inventory across both sizes of a series. Implementing independent size editions therefore requires a bounded commerce change as well as new values and copy. The packet explicitly requires stopping and reporting this mismatch.

No application code, edition limits, prices, inventory records, or production deployments were changed by this audit. Existing uncommitted work was preserved.

## Locked policy

| Series | Size | Numbered limit | Reserved AP | Current price |
| --- | --- | ---: | ---: | ---: |
| Chronicle | 16×20 | 30 | 1 | $1,100 |
| Chronicle | 20×24 | 20 | 1 | $1,500 |
| Legend | 30×40 | 15 | 1 | $3,800 |
| Legend | 40×60 | 5 | 1 | $5,000 |
| Engrained | Existing wood format | 5 | 1 | Unchanged |

The paper limits stay fixed when only one size is offered. Each size numbers independently. The series carries no edition number. Foundation and Sketch remain open editions. Prices remain unchanged.

## Architecture findings

### Checkout shares a pool across sizes

[verifyCart.js](../src/lib/commerce/server/verifyCart.js) sums `soldBySize` into a series baseline at lines 100–103. At lines 134–138 it constructs `series:${seriesMatch.seriesId}:${product.seriesKey}` as the inventory key. Size and product key are absent, so both sizes compete for the same pool.

[editionInventory.js](../cloudflare-commerce/src/editionInventory.js) groups items by this key, requires matching limits and baselines within a group, and reserves the combined quantity in D1. Changing only the catalog to 30/20 or 15/5 would make a cart containing both sizes fail with `Conflicting limited-edition inventory data.`

[Migration 0003](../cloudflare-commerce/migrations/0003_edition_inventory.sql) stores `edition_inventory` and `edition_allocations`. Its database constraint prevents the shared pool from exceeding `edition_limit`. Reservations occur immediately before PayPal capture in [index.js](../cloudflare-commerce/src/index.js); successful captures move reservations to sold counts. Release and administrative restoration operate on the same inventory keys.

The reservation UPSERT increments reserved quantity on an existing inventory row without updating that row's stored limit or baseline. Editing catalog limits alone would therefore also leave existing D1 rows at their original caps.

[quote.test.js](../cloudflare-commerce/test/quote.test.js), starting at line 133, explicitly tests that different sizes share one pool. That existing test and the combined-quantity limit test both passed during this audit. These results verify current behavior, not Option D compliance.

### Number assignment is not implemented at checkout

The inspected checkout capture path records quantities and allocation status, without assigning or storing consecutive edition numbers. No certificate or numbered-edition registry table was present in the live commerce schema inspection.

[InventoryTrackerApp.jsx](../src/components/InventoryTrackerApp.jsx), lines 358–369, constructs a certificate URL using `item.printed || 1` as the edition number. This uses the printed count when a certificate is opened; it does not allocate a unique number at sale. The [certificate route](../src/pages/admin/print/certificate/[certificateId].astro) parses the number from the URL and uses a hardcoded series denominator, currently 50 or 25. It parses the number as an integer and cannot currently render an `AP` identifier correctly.

### AP language exists without a tracked AP reservation

Engrained's catalog and Series copy declare one artist's proof. The inspected edition state, registry, inventory tables, and certificate path do not provide a persisted AP slot or lifecycle to reuse for paper editions. The packet's requirement to reserve exactly one AP per size needs a data representation and validation. Normal checkout currently offers numbered catalog products only; an AP product must remain outside that flow.

### Previously sold pieces have no declaration lock

[seriesRegistry.cjs](../netlify/functions/seriesRegistry.cjs) replaces `excludeSizes` during registration without checking whether that piece has sold or freezing its declared size set. The registry also stores shared records across gallery occurrences. A guard against adding sizes after the first sale is required to satisfy the packet; the present system cannot be claimed to enforce it.

## Sales and registry check

Read-only queries used the saved Wrangler OAuth login with `CLOUDFLARE_API_TOKEN` cleared only in the command process. D1 reported zero rows written and no database changes.

| Source checked | Result |
| --- | --- |
| Live `k4-commerce-live` orders, all statuses | Two orders: one paid, one pending approval |
| Chronicle or Legend items in those orders | None |
| Stored order quotes mentioning Chronicle or Legend | None |
| Chronicle or Legend D1 inventory rows | None |
| Chronicle or Legend D1 allocations | None |
| Local `seriesRegistry.json`, 3,256 series records | No positive Chronicle or Legend sold counts |
| Deployed `/data/seriesRegistry.json`, 3,256 series records | No positive Chronicle or Legend sold counts |
| Local `editionState.json` | No positive Chronicle or Legend sold counts |
| Deployed `/.netlify/functions/editionState` | Metadata only; no actual edition records |

No recorded Chronicle or Legend sale was found that would conflict with the new caps. The checkout has no per-print number records against which to check highest issued numbers. Off-system sales or quotes are outside this result. The deployed legacy edition-state endpoint's empty result must not substitute for the populated local file or deployed registry.

The Order Tracker reads the same live commerce service through [orders/route.js](../cloudflare-worker/src/analytics/orders/route.js), so the D1 check covers its backing order records without marking orders processed or sending emails.

## Limit and copy source inventory

| Source | Current responsibility and required work |
| --- | --- |
| `src/data/commerce/catalog.js` | Per-product 50/50 and 25/25 caps and edition strings; verified checkout prices; Engrained 5 plus AP copy |
| `src/data/pricing/printSeries.js` | Series-level 50/25 metadata and shared guide/overview data; must resolve limits and disclosure by offered size |
| `src/data/seriesDefinitions.js` | Exports shared definitions and registry/size exclusion helpers; consumes `printSeries.js` |
| `src/data/pricingConfig.json`, `public/pricingConfig.json` | Prices and runtime copy; preserve prices and synchronize generated copy with `copy:pricing` |
| `src/data/seriesRegistry.json` | Canonical series identity, offered tiers, excluded sizes, per-size printed/sold baselines; add declaration protection and paper AP state as needed |
| `src/data/seriesRegistryPublic.mjs`, `scripts/generate-public-series-registry.mjs`, `public/data/seriesRegistry.json`, `src/pages/data/seriesRegistry.json.ts` | Public registry projections and endpoint; preserve exclusions and consistent disclosure inputs |
| `src/data/editionState.json` | Legacy series-level limit fields and counts, including Engrained inventory; reconcile paper records without changing sold counts |
| `netlify/functions/editionState.cjs` | Duplicated 50/25 definitions, legacy total guards, and per-size write actions |
| `netlify/functions/seriesRegistry.cjs` | Writes per-size counts and size exclusions; validates neither the complete Option D policy nor frozen declarations |
| `src/components/GalleryEditorPro.jsx` | Duplicated 50/25 definitions and editor controls for per-size printed/sold counts |
| `src/lib/commerce/server/verifyCart.js` | Authoritative server availability, shared baseline and key construction; must use a size-specific baseline and identity |
| `cloudflare-commerce/src/editionInventory.js`, migration `0003`, `src/admin.js` | D1 reservations, sold counts, release/restoration, persisted caps; migration/reconciliation must preserve historic allocations |
| `src/data/commerceResolver.js` | Shared remaining counts and per-size pricing passed to purchase views and schema |
| `src/components/SeriesOrderModal.jsx` | Fetches per-size counts but sums them; series remaining count and mailto numbering currently use the total |
| `src/components/commerce/CollectionOrderModal.jsx` | Shared remaining count and first-product edition label; must render independent size availability and labels |
| `src/components/ImagePricingSummary.jsx`, `SeriesInfoPopup.jsx` | Visible series-level count and guide language; replace with size-aware labels/disclosure |
| `src/components/ImageCommerceModalStatic.astro`, `ChapterImageDetailStatic.astro`, `ChapterGalleryBase.jsx` | Static chapter/purchase presentation and shared React entry points |
| `src/pages/Other/Series/index.astro`, `src/data/Other/Series/story.ts` | Visible definitions and FAQ/schema answers contain old Chronicle 50 and Legend 25 claims |
| `src/pages/[...gallery]/all.astro`, fixed gallery `all.astro` routes, `src/components/all-pages/CommercialCollectionAllPage.astro`, doorway components | Gallery series bars/popovers and purchase summaries consume shared definitions; verify rendered both-size and one-size cases |
| `src/components/hybrid/HybridPrints.astro`, gallery landing components | Sizes and Pricing surfaces; verify shared-data consumers after correcting the source |
| `src/components/utils/getStructuredData.ts` | Product/Offer schema path; verify size-aware descriptions and counts agree with visible purchase copy |
| `src/components/InventoryTrackerApp.jsx`, certificate route | Printed-count certificate identity, series denominators, missing AP parsing; require real per-size numbered/AP identities |
| `cloudflare-commerce/src/database.js`, `orderProcessing.js`, `cloudflare-worker/src/analytics/orders/renderer.js` | Stored verified order snapshots and tracker display; carry any new per-size number/AP identity through fulfillment |
| Engrained source `.mjs`, `public/data/engrainedData.json`, `scripts/generate-engrained-data.mjs`, `EngrainedStatusPanel.jsx` | Existing wood edition data and inventory; preserve 5 plus 1 AP policy and historical markings |

The source scan found no Chronicle/Legend edition-of-250 match in the searched `src` and `public` trees. It did find existing series-level 50/25 claims in the shared sources above. A complete served-page copy acceptance sweep remains pending implementation.

Several relevant components already had uncommitted changes at audit start, including the pricing summary, Series Guide, order modals, and Order Tracker renderer. Future changes must preserve that work and reconcile any overlapping sketch-lingo work.

## Proposed scope correction for approval

Keep the locked independent size policy and expand the implementation scope to cover the behavior it requires:

1. Centralize the four paper size limits and AP allowances, then update every source and consumer together. Keep existing prices.
2. Give each paper size its own server inventory identity, baseline, and D1 pool. Reconcile any old shared rows and order snapshots before activation; the live paper inventory is currently empty, but recheck immediately before migration. Preserve atomic reservations, capture idempotency, refunds, and releases.
3. Persist per-size number assignments with retry protection and an explicit rule for reserved, failed, and captured payments. Use those identities in fulfillment and certificates rather than deriving a number from a printed count.
4. Reserve one AP per offered size outside numbered inventory. Support AP certificate identity while keeping APs out of normal checkout. Preserve existing Engrained inventory and its declared proof.
5. Freeze each sold piece's declared size set and aggregate. Reject attempts to add a size later, including through editor registration and server checkout verification.
6. Apply the exact aggregate disclosure and per-size copy from the final packet, including one-size cases and schema. Run the packet's independent-size enforcement, numbering, AP, and served-copy checks.
7. Produce the implementation build report and preview for review before production promotion. Commerce-worker publication is a separate deployment from Netlify and the analytics worker; publish only the services required by the approved implementation.

This scope correction does not reopen scarcity policy or authorize a shared-numbering design. It acknowledges the changes needed to make the requested independent size editions actually work.

## Validation status

The two existing inventory grouping tests passed. Read-only live D1 and deployed-registry checks completed. No implementation build or preview was produced because Change Order 0a's architecture stop condition was met. The Option D acceptance tests remain pending; passing the current shared-pool tests is not acceptance of the new policy.
