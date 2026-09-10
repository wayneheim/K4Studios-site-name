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
image views, the top 25 entry pages, top 10 site pages, accessed images with
clickable thumbnails (highlighted green when pricing was opened), visitor geography, image-viewer geography, entry
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

## Activation sequence

1. Apply `migrations/2026-09-04-add-analytics-v3-rollups.sql` to a new database.
2. Apply `migrations/2026-09-05-extend-analytics-v3-core-reports.sql`.
3. Apply `migrations/2026-09-07-add-analytics-v3-image-pricing.sql`.
4. Deploy the analytics Worker.
5. For an existing V3 installation, run
   `scripts/reset-analytics-v3-rollups-for-enrichment.sql` once. This clears
   only the disposable V3 summaries so they can be regenerated with entry,
   geography, and image facts; it does not delete raw history or V2 data.
6. Open `/__k4stats-v3` and incrementally catch up the 30-day window.
7. After validation, retire the V2 rebuild route and remove redundant raw-event
   indexes in a separate, reversible migration.

## Offline validation

Run:

```powershell
node cloudflare-worker/scripts/test-analytics-v3-archive.mjs --days=7
```

The harness uses the saved June retention export. It verifies the core filter,
rollup shape, manual diagnostics gate, and estimated incremental write cost.
