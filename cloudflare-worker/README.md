# K4 Studios Image Proxy Worker

Cloudflare Worker that proxies image requests to SmugMug, preventing direct URL exposure.

## Purpose

- Route `/img/{id}/{size}` requests through Cloudflare
- Hide SmugMug URLs from crawlers (especially Bing)
- Apply bot-specific size limits (Bing capped at M)
- Cache aggressively at the edge

## Routes

```
/img/i-abc123/s    → SmugMug S size (~400px)
/img/i-abc123/m    → SmugMug M size (~600px)
/img/i-abc123/l    → SmugMug L size (~1200px)
/img/i-abc123/xl   → SmugMug XL size (~1600px)
/img/i-abc123/src  → Original src field
```

## Size Fallback

If requested size isn't available, falls back through the chain:
- `xl` → l → m → s → src
- `l` → m → s → xl → src
- `m` → s → l → src
- `s` → m → src

## Bot Behavior

| Bot | Treatment |
|-----|-----------|
| Googlebot | Human (gets requested size) |
| Bingbot | Capped at M |
| msnbot | Capped at M |
| Others | Human |

## Deployment

### Prerequisites

```bash
npm install -g wrangler
wrangler login
```

### Deploy

```bash
cd cloudflare-worker
wrangler deploy
```

### Configure Route

In Cloudflare Dashboard:
1. Workers & Pages → k4-image-proxy
2. Settings → Triggers → Add Route
3. Route: `k4studios.com/img/*`
4. Zone: `k4studios.com`

## Testing

Local development:
```bash
wrangler dev
```

Test requests:
```bash
curl http://localhost:8787/img/i-fszvgmq/m
```

## Cache Behavior

| Asset | TTL |
|-------|-----|
| Images | 1 year (immutable) |
| Manifest | 1 hour (memory + edge) |
| 404s | 1 minute |
| Errors | No cache |

## Architecture

```
Browser → Cloudflare Edge → Worker → SmugMug
                              ↓
                        image-manifest.json
                        (cached 1 hour)
```

The Worker:
1. Parses `/img/{id}/{size}` from URL
2. Fetches manifest (from cache or origin)
3. Looks up image ID
4. Applies bot logic if Bing
5. Resolves size with fallback
6. Fetches from SmugMug
7. Returns bytes (never redirects)

## Incident Timeline (2026-09-03)

- Purpose: stabilize D1 quota pressure (rows_written + rows_read) and reduce bot image traversal abuse.
- Deploy 1: analytics worker `23ac0a37-597a-429f-8310-f18bc0fc6523`
      - Restored datacenter ASN filtering for Tencent ASN `132203` in analytics synthetic-traffic suppression.
- Deploy 2: image proxy worker `bae913ba-1d37-40f5-92b7-501520152cfc`
      - Added anonymous rapid image-traversal friction/blocking logic for `/img/*` (verified bots exempt).
- Deploy 3: analytics worker `398c564d-0ac7-4d95-ab5f-8c8e263e2795`
      - Reduced V2 dashboard read multiplier: auto-refresh is now opt-in (`refresh=1` or `V2_DASHBOARD_AUTO_REFRESH=true`), and auto batch is conservative.

Validation note:
- `V2_DASHBOARD_AUTO_REFRESH` is currently not present in production deployment metadata, so default behavior is no auto-refresh unless explicitly requested.

Decision note (anti-scrape direction):
- Do not add CAPTCHA/visible challenges in this phase.
- Preferred strategy is progressive slowing/friction for suspected scraper traversal on image routes.
- Keep explicit exemptions for verified search engines and normal human sessions.
- Validate current 2026-09-03 fixes with next-day quota metrics before layering additional friction changes.
