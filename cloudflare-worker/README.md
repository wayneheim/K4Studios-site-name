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
