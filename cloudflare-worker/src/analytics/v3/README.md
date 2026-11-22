# K4 Analytics V3

V3 replaces the V2 full-history refresh with a monotonic raw-event cursor and
compact daily rollups.

## Request behavior

- `GET /__k4stats-v3` reads only V3 summary tables. It never reads `raw_events`
  and never performs writes.
- `POST /__k4stats-v3/update` reads at most 5,000 raw rows after the saved
  `last_raw_event_id`, incrementally updates summaries, and advances the cursor.
- `GET /__k4stats-v3/diagnostics` reads non-core raw traffic only after the
  administrator presses **Load diagnostics**.

The first update starts at the beginning of the most recent 30-day retention
window. If more than 50,000 rows are waiting, press **Update with new rows**
again until the displayed timestamp is current.

## Core reports

The initial page contains page loads, sessions, visitors, engaged sessions,
image views, the top 25 entry pages, top 25 site pages, accessed images with
clickable thumbnails (highlighted green when pricing was opened), visitor geography, image-viewer geography, site visitor devices, image-viewer devices, entry
sources, and core actions grouped by purpose. These all read the compact V3
tables; opening the report never scans the raw event table.

Entry-to-first-image hops are intentionally deferred. Calculating them
correctly across cursor batches needs additional session-path state, and the
other requested reports provide more value for substantially less storage.

## Core population

Core reporting accepts selected meaningful events with both visitor and session
IDs from the JavaScript collector. Known automation user agents, anonymous
proxy traffic, and narrowly identified datacenter ASNs are kept out of core
metrics and remain available in diagnostics.

The confirmed November 6/17 rotating IPv6 crawl is excluded by the shared
`rotating-proxy-crawl.js` matcher, including lifecycle evidence. It requires
both an observed address pool and an observed frozen browser version. The
ingestion gate refuses its writes, the image gateway returns an uncached 403,
and the zone's existing bot firewall rule applies the same condition to public
site and analytics hosts. Verified bots remain exempt from the request block.
Run `node cloudflare-worker/scripts/test-rotating-proxy-crawl.mjs` to check
access denial, ingestion, rollups, and the allowed-visitor boundaries.

## Activation sequence

1. Apply `migrations/2026-09-04-add-analytics-v3-rollups.sql` to a new database.
2. Apply `migrations/2026-09-05-extend-analytics-v3-core-reports.sql`.
3. Apply `migrations/2026-09-07-add-analytics-v3-image-pricing.sql`.
4. Apply `migrations/2026-10-21-add-analytics-v3-image-geography.sql`.
5. Apply `migrations/2026-10-21-add-analytics-v3-entry-fallback.sql`.
6. Apply `migrations/2026-10-28-add-analytics-v3-device-breakdown.sql`.
7. Deploy the analytics Worker.
8. For an existing V3 installation, run
   `scripts/reset-analytics-v3-rollups-for-enrichment.sql` once. This clears
   only the disposable V3 summaries so they can be regenerated with entry,
   geography, and image facts; it does not delete raw history or V2 data.
9. Open `/__k4stats-v3` and incrementally catch up the 30-day window.
10. After validation, retire the V2 rebuild route and remove redundant raw-event
   indexes in a separate, reversible migration.

## Geography visitor mix

Apply `migrations/2026-11-20-add-analytics-v3-shopping-geography.sql` before
deploying shopping geography. The existing session row stores small JSON stage
counters. Incremental updates merge counters into that same row; there are no
extra per-event summary rows. Geography uses the existing scoped summary query
to count distinct shoppers and sum stage events. Its single `$` shows the
furthest stage (blue cart, yellow checkout, orange payment, green completion).
Hover, focus, or tap opens a popup with one colored `$` per recorded event.
Checkout errors are red, cancellations gray; completion takes color priority.
These are event records, not the authoritative payment ledger.

The browser checkout reports fixed error-stage codes and cancellations through
the normal collector, without error text or payment/customer details. This part
requires the site's Netlify deployment. The analytics Worker can be deployed
separately; a Checkout issues panel appears only when such events exist.

Apply `2026-11-20-add-analytics-v3-image-shopping.sql` for image shopping markers.
They appear outside the image link, to the left of its thumbnail, using the same
stage colors and popup as geography. Explicit image add-to-cart events can be
recovered from retained history. Old `/cart` events cannot establish cart
contents and must not be attributed to a recently viewed image. New browser
events put a bounded, deduplicated `cart:i-id1,i-id2` list in the existing image
target field; one funnel event still counts once, and per-image stage counters
do not increment image-view totals. This browser change requires Netlify deploy.

Every image row reserves a 22px marker column so thumbnails stay aligned.
Image shopping counters retain a deduplicated `_sessions` list. The image query
uses those day/session primary keys to read the shopper's furthest progress
from compact session summaries. This controls marker color; the popup retains
the exact image events and explains that other shopping steps may involve
other cart items. No raw-event scan is added to dashboard reads.

Geography rows also show up to five distinct-visitor stars: cyan for new, green
for returning, gray for unknown. Counts above five have a + popover containing
the complete star list grouped by status. Hover, keyboard focus, and tap open
it. Lists are generated locally from the counts only when opened. Classification
matches the visitor-mix cards for the selected period: a visitor with any new
session in that window counts as new, otherwise returning when known. A visitor
is counted once per location even across multiple sessions. Both geography
panels use the existing session-summary query; no event writes or raw reads are
added. Run `node cloudflare-worker/scripts/test-analytics-v3-geo-mix.mjs` to
verify deduplication, window semantics, and the five-star display limit.

## Entry engagement

Apply `migrations/2026-11-16-add-entry-engagement.sql` before deploying the
updated analytics Worker. The site collector in `src/utils/analytics.ts` also
needs the normal site deployment for visible time, scroll, and input flags.
New measurements appear after **Update with new rows**; existing visits without
reliable measurements remain unknown. No raw-history rebuild is required.

Entry rows show the mean of known visit grades (1 limited, 2 browsing, 3 strong).
Unknown visits are excluded from the mean and counted in the badge tooltip.
These grades describe observed engagement, not human/bot probability:

- 1: measured visible time or scroll, without stronger evidence. Time alone
  stays at this level even if the tab was visible for a long time.
- 2: an input/navigation/gallery/story action, or 10 seconds visible and 25%
  scroll.
- 3: zoom/information/pricing/cart activity, or 30 seconds visible together with
  50% scroll or an action.

Scroll and input flags stay in browser memory and ride on existing lifecycle
messages. The timer and page instance reset on SPA navigation. The updater
merges cumulative maxima into the existing session row, using primary-key
lookups across cursor batches. Lifecycle observations do not increment page,
visitor, or engaged-session totals. Only the initial entry page instance is
graded; revisits and downstream pages cannot inflate it.

The + control reads compact session summaries on demand, 100 visits per page,
and caches them until the report reloads. It never scans raw events. The OIM
journey panel defaults to collapsed only when the selected window has no data.

Run `node cloudflare-worker/scripts/test-analytics-v3-entry-engagement.mjs` for
collector, lifecycle, SQLite rollup/query, pagination, and rendering checks.

### One-time historical engagement recovery

`scripts/backfill-entry-engagement.mjs --start=YYYY-MM-DD --end=YYYY-MM-DD`
audits missing evidence in existing summaries using the visitor index. It
caches the snapshot, raw batches, proposed updates, and usage under ignored
`cloudflare-worker/tmp/entry-engagement-backfill-<start>-<end>/`. Reads are capped
at 100,000 rows per audit. Add `--apply` only after reviewing `plan.json`.

Only verified first-page-instance actions and plausible visible-time records
are recovered. Legacy timing is rejected when the same document instance
visited another URL, is displayed as **Visible time (legacy)**, and cannot
promote a visit to a higher grade without independent action evidence. Scroll
remains unknown unless versioned collector metadata actually recorded it.

The update changes only `entry_evidence`, only while it is still null. It does
not reset the cursor, rebuild rollups, or modify traffic/navigation totals.
Reruns skip already populated evidence. The snapshot preserves the original
rows, and `applied.json` records the affected count and measured D1 usage.
Validate with `node cloudflare-worker/scripts/test-entry-engagement-backfill.mjs`.

## Offline validation

Run:

```powershell
node cloudflare-worker/scripts/test-analytics-v3-archive.mjs --days=7
```

The harness uses the saved June retention export. It verifies the core filter,
rollup shape, manual diagnostics gate, and estimated incremental write cost.
