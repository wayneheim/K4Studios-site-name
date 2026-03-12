# K4 Studios — Agent Instructions

## Repository Structure

This is an Astro site (deployed to Netlify) with two Cloudflare Workers:

| Worker | Config | Entry Point | What it does |
|--------|--------|-------------|--------------|
| `k4-image-proxy` | `cloudflare-worker/wrangler.toml` | `cloudflare-worker/k4-image-proxy.js` | Proxies `/img/*` requests to SmugMug, applies bot caps, harvester friction |
| `k4-analytics` | `cloudflare-worker/wrangler.analytics.noroutes.toml` | `cloudflare-worker/src/analytics/worker.js` | Dashboard (`/__k4stats`), event tracking, bot intelligence |

Both workers share the same D1 database (`k4-analytics`, binding name `DB`).

## Deploying Cloudflare Workers

**CRITICAL: After editing any file under `cloudflare-worker/src/analytics/` or `cloudflare-worker/k4-image-proxy.js`, you MUST deploy for changes to take effect. These are Cloudflare Workers — local file edits do nothing until deployed.**

### Deploy the Analytics Worker (most common)

Files: anything under `cloudflare-worker/src/analytics/` (dashboard, queries, admin, collector, storage, worker.js)

```powershell
cd cloudflare-worker
npx wrangler deploy --config wrangler.analytics.noroutes.toml
```

Use `wrangler.analytics.noroutes.toml` (NOT `wrangler.analytics.toml`) — routes are managed in the Cloudflare Dashboard to avoid route-API flakiness. The no-routes config deploys the code without touching route bindings.

### Deploy the Image Proxy Worker

Files: `cloudflare-worker/k4-image-proxy.js`, anything under `cloudflare-worker/src/shared/`

```powershell
cd cloudflare-worker
npx wrangler deploy
```

This uses the default `wrangler.toml`.

### Deploy Both (if shared code changed)

If you edited files under `cloudflare-worker/src/shared/` (constants, utils), deploy BOTH workers since they share that code:

```powershell
cd cloudflare-worker
npx wrangler deploy --config wrangler.analytics.noroutes.toml
npx wrangler deploy
```

### Verification

After deploy, Wrangler prints a Version ID. To verify the analytics dashboard updated:
- Open `/__k4stats` in browser
- Check the footer: `Generated <ISO timestamp>` should be within seconds of your deploy

### Auth

The dashboard at `/__k4stats` uses HTTP Basic Auth. The credentials are:
- Username: `k4admin`
- Password: set via `ANALYTICS_PASSWORD` env var (or default in code)

Admin JS actions (Force Block, Unblock, Refresh) embed the auth header server-side so `fetch()` calls include it automatically.

## Deploying the Astro Site (Netlify)

The Astro site deploys automatically via Netlify on push to `main`. For manual builds:

```powershell
npm run build        # full build (includes cache warming)
npm run build:fast   # skip cache warming
npm run release:prebuilt  # build, deploy to Netlify, then live-verify new URLs before IndexNow
```

Local dev:

```powershell
npx netlify dev      # runs at http://localhost:8888
```

## Analytics Architecture

```
cloudflare-worker/src/analytics/
├── worker.js          — Router: maps URL paths to handlers
├── collector.js       — Event ingestion (/track, /__k4e, /edge-event, /__k4track/event)
├── storage.js         — D1 writes (logRawEvent, updateBotIntelligence)
├── admin.js           — Admin endpoints (block/unblock/refresh-bots/export)
├── queries.js         — All D1 read queries for the dashboard
└── dashboard/
    ├── route.js       — Request lifecycle: auth, param parsing, filter building
    ├── controller.js  — Orchestrates all query calls, passes to schema → renderer
    ├── schema.js      — Normalizes query results into renderer's expected shape
    └── renderer.js    — Pure HTML generation (no DB, no env)
```

Data flow: `worker.js` → `route.js` → `controller.js` → `queries.js` → `schema.js` → `renderer.js`

### Key D1 Tables

| Table | Purpose |
|-------|---------|
| `raw_events` | All ingested events (page views, clicks, friction, edge events) |
| `classified_events` | VIEW on raw_events adding `is_bot` flag |
| `human_population` | VIEW: distinct visitor_ids with JS proof-of-life |
| `suspected_bots` | IP-level risk classification (risk_level 1-5) |
| `blocked_ips` | Manually blocked IPs (Force Block from dashboard) |

### Bot Intelligence Levels

| Level | Meaning | Action |
|-------|---------|--------|
| 2 | Watching | Monitor only |
| 3 | High Risk | Monitor only |
| 4 | Friction Active | Automatic delays (650-1600ms) + rate limiting |
| 5 | Block Recommended | UI signal — human clicks Force Block |

Level 5 triggers: ≥10 429s/day, ≥20 unique images/min, ≥40 delay bursts in 10min, or ≥200 requests over 3+ days at Level 4.

## Common Gotchas

1. **`wrangler` not found**: Use `npx wrangler` (or `npx wrangler@latest`), not bare `wrangler`
2. **Changes not appearing**: You forgot to deploy. Local edits ≠ live.
3. **Force Block not working**: Auth header must be embedded server-side in rendered HTML (see `authHeader` flow through route → controller → schema → renderer)
4. **Day gating**: `selectedDate` views must use `dateClause` (which includes the date filter), not `yesterday`/`days` params directly
5. **Edge Events**: Uses `dateClause` from controller, not rolling days — respects selected date
6. **D1 binding**: Both workers use `env.DB` (not `env.ANALYTICS_DB`)
